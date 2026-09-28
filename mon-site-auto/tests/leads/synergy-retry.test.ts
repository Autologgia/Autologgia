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

/**
 * RÉESSAI UNIQUE DU CANAL SYNERGY.
 *
 * Une seule seconde tentative, jamais plus, et seulement sur erreur
 * transitoire (timeout, panne réseau, 408, 429, 5xx). Elle est sûre parce que
 * `ingest_lead` est idempotent sur (site_id, idempotency_key) : rejouer la
 * même clé renvoie `duplicate_replay` sans créer de second prospect -- y
 * compris après un timeout où Synergy avait en réalité traité la requête.
 *
 * Deux garde-fous que ces tests verrouillent explicitement :
 *   - Resend n'est JAMAIS rappelé pendant le retry (aucun second email) ;
 *   - un 4xx permanent n'est jamais rejoué (le verdict serait identique et le
 *     visiteur attendrait pour rien).
 */

const submissionId = "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3";

const CONTACT = {
  submissionId,
  formKey: "homepage_contact",
  name: "Naïma Cherif",
  phone: "+33612345678",
  email: "naima@example.test",
  sujet: "Autre demande",
  message: "Bonjour",
};

function run() {
  return contact(new Request("https://autologgia.test/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CONTACT),
  }));
}

/** Ce que produit AbortSignal.timeout quand le budget est dépassé. */
function timeout() {
  return new DOMException("The operation was aborted due to timeout", "TimeoutError");
}
function network() {
  return new TypeError("fetch failed");
}
/** Prospect créé. */
function created() {
  return new Response(JSON.stringify({ ok: true, id: "prospect-1", status: "created" }), { status: 201 });
}
/** Rejeu de la même clé : Synergy avait déjà ingéré la première tentative. */
function replay() {
  return new Response(JSON.stringify({ ok: true, id: "prospect-1", status: "idempotent_replay" }), { status: 200 });
}
function status(code: number) {
  return new Response(JSON.stringify({ ok: false, code: "error" }), { status: code });
}

/**
 * Programme les réponses successives de Synergy. Tout appel au-delà de ceux
 * prévus fait échouer le test : c'est ainsi qu'on verrouille « 2 au maximum ».
 */
function synergy(...outcomes: Array<Response | Error>) {
  const fetchMock = vi.fn();
  for (const outcome of outcomes) {
    if (outcome instanceof Response) fetchMock.mockResolvedValueOnce(outcome);
    else fetchMock.mockRejectedValueOnce(outcome);
  }
  fetchMock.mockImplementation(() => {
    throw new Error("appel Synergy inattendu : le maximum de 2 est dépassé");
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function forwards() {
  return vi.mocked(global.fetch).mock.calls.filter(([url]) => String(url).endsWith("/api/public/leads"));
}

function sentKeys() {
  return forwards().map(([, init]) => JSON.parse(String((init as RequestInit).body)).idempotencyKey);
}

let log: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-only";
  process.env.RESEND_TO_EMAIL = "compte.resend@example.test";
  process.env.SYNERGY_CMS_API_URL = "https://synergy.test";
  process.env.SYNERGY_LEAD_INGESTION_TOKEN = "test-token-not-real";
  send.mockResolvedValue({ data: { id: "fake-email-id" }, error: null });
  sanityCreate.mockResolvedValue({ _id: "fake-sanity-id" });
  log = vi.spyOn(console, "error").mockImplementation(() => {});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("erreurs transitoires — une seconde tentative, puis on s'arrête", () => {
  it("timeout puis succès : le prospect est récupéré", async () => {
    synergy(timeout(), created());

    expect((await run()).status).toBe(200);
    expect(forwards()).toHaveLength(2);
    expect(log).toHaveBeenCalledWith(
      "[synergy-leads] forward timed out -- retrying, ingestion status unknown",
      { submissionId, timeoutMs: 10_000 },
    );
    expect(warn).toHaveBeenCalledWith("[synergy-leads] forward recovered on retry", { submissionId, first: "timeout" });
  });

  it("timeout alors que l'ingestion avait abouti : le rejeu renvoie 200 sans créer de doublon", async () => {
    // Cas réel du 2026-09-25 : Synergy avait répondu 200 après notre abandon.
    // La même clé rejouée tombe sur lead_ingestion_requests -> duplicate_replay.
    synergy(timeout(), replay());

    expect((await run()).status).toBe(200);
    expect(forwards()).toHaveLength(2);
    expect(sentKeys()).toEqual([submissionId, submissionId]);
    expect(warn).toHaveBeenCalledWith("[synergy-leads] forward recovered on retry", { submissionId, first: "timeout" });
  });

  it("500 puis succès", async () => {
    synergy(status(500), created());

    expect((await run()).status).toBe(200);
    expect(forwards()).toHaveLength(2);
    expect(log).toHaveBeenCalledWith("[synergy-leads] ingestion unavailable -- retrying", { submissionId, status: 500 });
    expect(warn).toHaveBeenCalledWith("[synergy-leads] forward recovered on retry", { submissionId, first: "http_500" });
  });

  it("429 puis succès", async () => {
    synergy(status(429), created());

    expect((await run()).status).toBe(200);
    expect(forwards()).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith("[synergy-leads] forward recovered on retry", { submissionId, first: "http_429" });
  });

  it("panne réseau puis succès", async () => {
    synergy(network(), created());

    expect((await run()).status).toBe(200);
    expect(forwards()).toHaveLength(2);
    expect(log).toHaveBeenCalledWith("[synergy-leads] forward failed -- retrying", { submissionId, reason: "TypeError" });
  });

  it("deux timeouts : exactement 2 appels, statut d'ingestion inconnu", async () => {
    synergy(timeout(), timeout());

    expect((await run()).status).toBe(200);
    expect(forwards()).toHaveLength(2);
    expect(log).toHaveBeenCalledWith(
      "[synergy-leads] ingestion status unknown after retry",
      { submissionId, first: "timeout", retry: "timeout" },
    );
  });

  it("deux 503 : échec avéré, distinct d'un statut inconnu", async () => {
    synergy(status(503), status(503));

    expect((await run()).status).toBe(200);
    expect(forwards()).toHaveLength(2);
    expect(log).toHaveBeenCalledWith(
      "[synergy-leads] forward failed after retry",
      { submissionId, first: "http_503", retry: "http_503" },
    );
  });

  it("le retry dispose d'un budget court (3 s) après le budget plein (10 s)", async () => {
    const budgets = vi.spyOn(AbortSignal, "timeout");
    synergy(timeout(), created());

    await run();

    expect(budgets.mock.calls.map(([ms]) => ms)).toEqual([10_000, 3_000]);
    budgets.mockRestore();
  });
});

describe("erreurs permanentes — jamais rejouées", () => {
  it.each([400, 401, 403, 413, 422])("%i : un seul appel, rejet explicite", async (code) => {
    synergy(status(code));

    expect((await run()).status).toBe(200);
    expect(forwards()).toHaveLength(1);
    expect(log).toHaveBeenCalledWith("[synergy-leads] ingestion rejected -- not retryable", { submissionId, status: code });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("garanties transverses", () => {
  const scenarios = [
    { label: "succès direct", outcomes: () => [created()] },
    { label: "timeout puis succès", outcomes: () => [timeout(), created()] },
    { label: "500 puis succès", outcomes: () => [status(500), created()] },
    { label: "deux timeouts", outcomes: () => [timeout(), timeout()] },
    { label: "401 non rejoué", outcomes: () => [status(401)] },
  ] as const;

  it.each(scenarios)("$label : Resend n'est appelé qu'une seule fois", async ({ outcomes }) => {
    synergy(...outcomes());

    await run();

    // Le retry ne touche QUE le canal Synergy : un second email est impossible.
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.any(Object), { idempotencyKey: `autologgia-contact-${submissionId}` });
  });

  it.each(scenarios)("$label : jamais plus de 2 appels à Synergy", async ({ outcomes }) => {
    synergy(...outcomes());

    await run();

    expect(forwards().length).toBeLessThanOrEqual(2);
  });

  it.each(scenarios)("$label : toutes les tentatives portent la même idempotencyKey", async ({ outcomes }) => {
    synergy(...outcomes());

    await run();

    // C'est cette égalité qui rend le rejeu sûr côté ingest_lead.
    expect(sentKeys().every((key) => key === submissionId)).toBe(true);
  });
});
