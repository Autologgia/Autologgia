import { beforeEach, describe, expect, it, vi } from "vitest";

const { send, sanityCreate } = vi.hoisted(() => ({
  send: vi.fn(),
  sanityCreate: vi.fn(),
}));

vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => true }));
vi.mock("@/lib/cms/config", () => ({ getCmsSource: () => "sanity" }));
vi.mock("@/lib/cms/history-access", () => ({
  createHistoryAccessToken: () => ({ token: "test", maxAge: 60 }),
  historyAccessCookieName: () => "history-test",
}));
vi.mock("@/lib/sanity-write", () => ({ sanityWriteToken: "test", writeClient: { create: sanityCreate } }));

import { POST as contact } from "@/app/api/contact/route";
import { POST as estimation } from "@/app/api/estimation/route";

/**
 * Email (Resend) et ingestion CRM (Synergy) sont deux canaux INDÉPENDANTS.
 * Un prospect ne doit pas être perdu parce que l'email a échoué, ni l'inverse :
 * le visiteur ne voit une erreur que si les DEUX ont échoué.
 *
 *   Resend OK + Synergy OK  -> 200
 *   Resend OK + Synergy KO  -> 200, échec Synergy journalisé
 *   Resend KO + Synergy OK  -> 200, échec Resend journalisé
 *   Resend KO + Synergy KO  -> 502, le visiteur réessaie
 */

const submissionId = "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3";

function request(path: string, payload: Record<string, unknown>) {
  return new Request(`https://autologgia.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const CONTACT = {
  submissionId,
  formKey: "homepage_contact",
  name: "Naïma Cherif",
  phone: "+33612345678",
  email: "naima@example.test",
  sujet: "Autre demande",
  message: "Bonjour",
};

const ESTIMATION = {
  submissionId,
  brand: "Audi",
  model: "TT",
  year: "2015",
  mileage: "138500",
  power: "211",
  fuel: "essence",
  transmission: "manuelle",
  etat: "bon",
  phone: "+33612345678",
};

/** Resend accepte / refuse. */
function resendOk() {
  send.mockResolvedValue({ data: { id: "fake-email-id" }, error: null });
}
function resendKo() {
  send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "refusé" } });
}

/** Synergy accepte / refuse. */
function synergyOk() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, status: "created" }), { status: 201 })),
  );
}
function synergyKo() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
}

function forwardCalled() {
  return vi.mocked(global.fetch).mock.calls.some(([url]) => String(url).endsWith("/api/public/leads"));
}

const routes = [
  { label: "/api/contact", run: () => contact(request("/api/contact", CONTACT)), logTag: "[api/contact]" },
  { label: "/api/estimation", run: () => estimation(request("/api/estimation", ESTIMATION)), logTag: "[api/estimation]" },
] as const;

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-only";
  process.env.RESEND_TO_EMAIL = "compte.resend@example.test";
  process.env.SYNERGY_CMS_API_URL = "https://synergy.test";
  process.env.SYNERGY_LEAD_INGESTION_TOKEN = "test-token-not-real";
  sanityCreate.mockResolvedValue({ _id: "fake-sanity-id" });
  log = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe.each(routes)("$label — résilience des deux canaux", ({ run, logTag }) => {
  it("Resend OK + Synergy OK -> succès", async () => {
    resendOk();
    synergyOk();

    expect((await run()).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(forwardCalled()).toBe(true);
  });

  it("Resend OK + Synergy KO -> succès, échec Synergy journalisé", async () => {
    resendOk();
    synergyKo();

    expect((await run()).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("[synergy-leads]"),
      expect.objectContaining({ submissionId }),
    );
  });

  it("Resend KO + Synergy OK -> succès, échec Resend journalisé", async () => {
    resendKo();
    synergyOk();

    // Le cœur de la demande : l'email a échoué, le prospect part quand même.
    expect((await run()).status).toBe(200);
    expect(forwardCalled()).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining(`${logTag} resend`), expect.anything());
  });

  it("Resend KO + Synergy KO -> erreur utilisateur", async () => {
    resendKo();
    synergyKo();

    const response = await run();
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    // Les deux canaux ont bien été tentés avant d'abandonner.
    expect(send).toHaveBeenCalledTimes(1);
    expect(forwardCalled()).toBe(true);
  });

  it("une clé Resend absente n'empêche pas l'ingestion du prospect", async () => {
    delete process.env.RESEND_API_KEY;
    synergyOk();

    expect((await run()).status).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect(forwardCalled()).toBe(true);
  });

  it("idempotence : un réessai réutilise les mêmes clés, jamais de doublon", async () => {
    resendOk();
    synergyOk();

    await run();
    await run();

    // Même clé Resend deux fois -> Resend dédoublonne l'email.
    const keys = send.mock.calls.map(([, options]) => (options as { idempotencyKey?: string })?.idempotencyKey);
    expect(new Set(keys).size).toBe(1);
    // Même idempotencyKey côté Synergy -> ingest_lead dédoublonne le prospect.
    const sent = vi
      .mocked(global.fetch)
      .mock.calls.filter(([url]) => String(url).endsWith("/api/public/leads"))
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)).idempotencyKey);
    expect(sent).toHaveLength(2);
    expect(new Set(sent)).toEqual(new Set([submissionId]));
  });
});

describe("/api/estimation — l'archivage Sanity survit à un email refusé", () => {
  it("écrit tout de même le lead dans Sanity quand Resend refuse mais Synergy accepte", async () => {
    resendKo();
    synergyOk();

    expect((await estimation(request("/api/estimation", ESTIMATION))).status).toBe(200);
    expect(sanityCreate).toHaveBeenCalledTimes(1);
  });
});
