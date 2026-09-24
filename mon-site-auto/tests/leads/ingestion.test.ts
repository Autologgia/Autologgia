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
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("network unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await contact(request("/api/contact", { submissionId, name: "Test", phone: "+33612345678", message: "Bonjour" }));
    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[synergy-leads] forward failed", { submissionId, reason: "Error" });
    log.mockRestore();
  });

  it("keeps the email success when Synergy answers an error status", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response("{}", { status: 503 }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await contact(request("/api/contact", { submissionId, name: "Test", phone: "+33612345678", message: "Bonjour" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(log).toHaveBeenCalledWith("[synergy-leads] ingestion rejected", { submissionId, status: 503 });
    log.mockRestore();
  });

  it("does not call Synergy when Resend rejects the email", async () => {
    send.mockResolvedValueOnce({ data: null, error: { name: "validation_error" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await estimation(request("/api/estimation", {
      submissionId, brand: "Porsche", model: "911", year: "2020", mileage: "42000", power: "450",
      fuel: "essence", transmission: "automatique", etat: "bon", phone: "+33612345678",
    }));
    expect(response.status).toBe(502);
    expect(global.fetch).not.toHaveBeenCalled();
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
