import { beforeEach, describe, expect, it, vi } from "vitest";

const { send, sanityCreate } = vi.hoisted(() => ({
  send: vi.fn(),
  sanityCreate: vi.fn(),
}));

vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => true }));
vi.mock("@/lib/cms/config", () => ({ getCmsSource: () => "sanity" }));
vi.mock("@/lib/cms/history-access", () => ({ createHistoryAccessToken: () => ({ token: "test", maxAge: 60 }), historyAccessCookieName: () => "history-test" }));
vi.mock("@/lib/sanity-write", () => ({ sanityWriteToken: "test", writeClient: { create: sanityCreate } }));

import { POST as contact } from "@/app/api/contact/route";
import { POST as estimation } from "@/app/api/estimation/route";

const submissionId = "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3";
const attribution = { firstLandingPage: "/", conversionPage: "/contact", utmSource: "google", gclid: "test-click" };

function request(path: string, payload: Record<string, unknown>) {
  return new Request(`https://autologgia.test${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}

function forwardedPayload() {
  const call = vi.mocked(global.fetch).mock.calls[0];
  expect(call?.[0]).toBe("https://synergy.test/api/public/leads");
  return JSON.parse((call?.[1]?.body ?? "") as string) as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-only";
  process.env.SYNERGY_CMS_API_URL = "https://synergy.test";
  process.env.SYNERGY_LEAD_INGESTION_TOKEN = "test-token-not-real";
  send.mockResolvedValue({ data: { id: "fake-email-id" }, error: null });
  sanityCreate.mockResolvedValue({ _id: "fake-sanity-id" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, status: "created" }), { status: 201 })));
});

describe("Autologgia -> Synergy", () => {
  it("forwards a homepage contact with a stable submission ID and Resend idempotency", async () => {
    const response = await contact(request("/api/contact", {
      submissionId, formKey: "homepage_contact", name: "Test", phone: "+33612345678", email: "test@example.test",
      sujet: "Autre demande", message: "Bonjour", attribution,
    }));
    expect(response.status).toBe(200);
    expect(forwardedPayload()).toMatchObject({ source: "autologgia", formKey: "homepage_contact", idempotencyKey: submissionId, attribution });
    expect(send).toHaveBeenCalledWith(expect.any(Object), { idempotencyKey: `autologgia-contact-${submissionId}` });
  });

  it("reuses the same provider and Synergy idempotency keys on a logical retry", async () => {
    const input = { submissionId, formKey: "general_contact", name: "Test", phone: "+33612345678", message: "Bonjour" };
    await contact(request("/api/contact", input));
    await contact(request("/api/contact", input));
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map((call) => call[1]?.idempotencyKey)).toEqual([
      `autologgia-contact-${submissionId}`, `autologgia-contact-${submissionId}`,
    ]);
    expect(vi.mocked(global.fetch).mock.calls.map((call) => JSON.parse(call[1]?.body as string).idempotencyKey)).toEqual([
      submissionId, submissionId,
    ]);
  });

  it("forwards vehicle and history context without trusting a tenant field", async () => {
    const response = await contact(request("/api/contact", {
      submissionId, formKey: "vehicle_history", name: "Test", phone: "+33612345678", message: "Historique",
      vehicleSlug: "vehicle-test", vehicleName: "Vehicule test", historyVehicleSlug: "vehicle-test", attribution,
    }));
    expect(response.status).toBe(200);
    expect(forwardedPayload()).toMatchObject({ formKey: "vehicle_history", product: { type: "vehicle", slug: "vehicle-test", label: "Vehicule test" } });
    expect(forwardedPayload()).not.toHaveProperty("site_id");
    expect(forwardedPayload()).not.toHaveProperty("company_id");
  });

  it("forwards structured estimation fields and keeps Sanity storage", async () => {
    const response = await estimation(request("/api/estimation", {
      submissionId, brand: "Porsche", model: "911", year: "2020", mileage: "42000", power: "450",
      fuel: "essence", transmission: "automatique", version: "Carrera", etat: "bon",
      localisation: "Paris", phone: "+33612345678", attribution,
    }));
    expect(response.status).toBe(200);
    expect(forwardedPayload()).toMatchObject({
      source: "autologgia", formKey: "vehicle_estimation", idempotencyKey: submissionId,
      product: { type: "vehicle_estimation", estimation: { brand: "Porsche", model: "911", year: 2020, mileage: 42000, power: 450, fuel: "essence", transmission: "automatique", version: "Carrera", condition: "bon", location: "Paris" } },
    });
    expect(sanityCreate).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.any(Object), { idempotencyKey: `autologgia-estimation-${submissionId}` });
  });

  it("keeps the email success when Synergy is unavailable, with a diagnostic submission ID", async () => {
    // mockRejectedValue et non ...Once : la panne doit durer assez longtemps
    // pour couvrir le réessai. Matrice du retry dans synergy-retry.test.ts.
    vi.mocked(global.fetch).mockRejectedValue(new Error("network unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await contact(request("/api/contact", { submissionId, name: "Test", phone: "+33612345678", message: "Bonjour" }));
    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[synergy-leads] forward failed after retry", { submissionId, first: "Error", retry: "Error" });
    log.mockRestore();
  });

  it("reports a timeout as an unknown ingestion status, not a certain failure", async () => {
    // Cas reel observe en Preview : le forward a ete abandonne a 5 s alors que
    // Synergy repondait 200 et avait bien ingere le lead. Le log ne doit donc
    // jamais affirmer un echec -- sinon on cherche un prospect perdu qui existe.
    // Vrai AUSSI apres le reessai : un timeout laisse le statut indecidable.
    vi.mocked(global.fetch).mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError"),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await contact(request("/api/contact", { submissionId, name: "Test", phone: "+33612345678", message: "Bonjour" }));
    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      "[synergy-leads] ingestion status unknown after retry",
      { submissionId, first: "timeout", retry: "timeout" },
    );
    expect(log).not.toHaveBeenCalledWith("[synergy-leads] forward failed after retry", expect.anything());
    log.mockRestore();
  });

  it("gives Synergy 10 s before abandoning the forward", async () => {
    // 5 s etait sous le pire cas normal (cold start + RPC ingest_lead ~5,1 s).
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await contact(request("/api/contact", { submissionId, name: "Test", phone: "+33612345678", message: "Bonjour" }));
    expect(timeout).toHaveBeenCalledWith(10_000);
    timeout.mockRestore();
  });

  it("keeps the email success when Synergy answers an error status", async () => {
    // 403 et non 503 : un 5xx est transitoire, donc rejoue (synergy-retry.test.ts).
    // Un token refuse est definitif et doit couper court des la premiere reponse.
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response("{}", { status: 403 }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await contact(request("/api/contact", { submissionId, name: "Test", phone: "+33612345678", message: "Bonjour" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(log).toHaveBeenCalledWith("[synergy-leads] ingestion rejected -- not retryable", { submissionId, status: 403 });
    log.mockRestore();
  });

  it("still calls Synergy when Resend rejects the email", async () => {
    // Les deux canaux sont desormais independants : un email refuse ne doit plus
    // faire perdre le prospect. Matrice complete dans resilience.test.ts.
    send.mockResolvedValueOnce({ data: null, error: { name: "validation_error" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await estimation(request("/api/estimation", {
      submissionId, brand: "Porsche", model: "911", year: "2020", mileage: "42000", power: "450",
      fuel: "essence", transmission: "automatique", etat: "bon", phone: "+33612345678",
    }));
    expect(response.status).toBe(200);
    expect(forwardedPayload()).toMatchObject({ formKey: "vehicle_estimation", idempotencyKey: submissionId });
    log.mockRestore();
  });

  it("does not call Synergy for a honeypot submission", async () => {
    const response = await contact(request("/api/contact", {
      submissionId, name: "Bot", phone: "+33612345678", message: "spam", website: "http://spam.test",
    }));
    expect(response.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("stays silent and does not call Synergy when ingestion is not configured", async () => {
    delete process.env.SYNERGY_LEAD_INGESTION_TOKEN;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await contact(request("/api/contact", { submissionId, name: "Test", phone: "+33612345678", message: "Bonjour" }));
    expect(response.status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[synergy-leads] ingestion not configured", { submissionId });
    log.mockRestore();
  });
});
