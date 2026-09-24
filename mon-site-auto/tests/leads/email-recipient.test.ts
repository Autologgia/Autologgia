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

/**
 * Régression Preview du 2026-09-24 : /api/estimation codait son destinataire en
 * dur (`autologgia.web@gmail.com`) au lieu de lire RESEND_TO_EMAIL comme
 * /api/contact. Or une clé Resend en mode test n'autorise l'envoi qu'à l'adresse
 * du compte : l'email était rejeté (validation_error), la route renvoyait 502...
 * et ce 502 coupe l'exécution AVANT forwardLeadToSynergy, donc aucun prospect
 * n'arrivait dans Synergy non plus. /api/contact, lui, fonctionnait.
 *
 * Les deux routes lisent RESEND_TO_EMAIL au chargement du module : chaque cas
 * réinitialise donc les modules avant d'importer la route.
 */

const submissionId = "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3";
const DEFAULT_TO = "autologgia.web@gmail.com";

function request(path: string, payload: Record<string, unknown>) {
  return new Request(`https://autologgia.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const contactPayload = {
  submissionId,
  formKey: "homepage_contact",
  name: "Naïma Cherif",
  phone: "+33612345678",
  email: "naima@example.test",
  sujet: "Autre demande",
  message: "Bonjour",
};

const estimationPayload = {
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

/** Importe la route APRÈS que l'environnement soit posé (TO est lu à l'import). */
async function loadRoutes() {
  vi.resetModules();
  const [contact, estimation] = await Promise.all([
    import("@/app/api/contact/route"),
    import("@/app/api/estimation/route"),
  ]);
  return { contact: contact.POST, estimation: estimation.POST };
}

/** Destinataire réellement passé à Resend. */
function recipient() {
  return (send.mock.calls[0]?.[0] as { to?: string } | undefined)?.to;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-only";
  process.env.SYNERGY_CMS_API_URL = "https://synergy.test";
  process.env.SYNERGY_LEAD_INGESTION_TOKEN = "test-token-not-real";
  delete process.env.RESEND_TO_EMAIL;
  send.mockResolvedValue({ data: { id: "fake-email-id" }, error: null });
  sanityCreate.mockResolvedValue({ _id: "fake-sanity-id" });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, status: "created" }), { status: 201 })),
  );
});

describe("destinataire Resend — /api/contact et /api/estimation alignés", () => {
  it("les deux routes respectent RESEND_TO_EMAIL quand il est défini", async () => {
    process.env.RESEND_TO_EMAIL = "compte.resend@example.test";
    const { contact, estimation } = await loadRoutes();

    expect((await contact(request("/api/contact", contactPayload))).status).toBe(200);
    expect(recipient()).toBe("compte.resend@example.test");

    send.mockClear();
    expect((await estimation(request("/api/estimation", estimationPayload))).status).toBe(200);
    expect(recipient()).toBe("compte.resend@example.test");
  });

  it("les deux routes retombent sur le même destinataire par défaut sans la variable", async () => {
    const { contact, estimation } = await loadRoutes();

    await contact(request("/api/contact", contactPayload));
    expect(recipient()).toBe(DEFAULT_TO);

    send.mockClear();
    await estimation(request("/api/estimation", estimationPayload));
    expect(recipient()).toBe(DEFAULT_TO);
  });

  it("estimation transmet le lead à Synergy quand l'email part (RESEND_TO_EMAIL honoré)", async () => {
    process.env.RESEND_TO_EMAIL = "compte.resend@example.test";
    const { estimation } = await loadRoutes();

    const response = await estimation(request("/api/estimation", estimationPayload));

    expect(response.status).toBe(200);
    const call = vi.mocked(global.fetch).mock.calls[0];
    expect(call?.[0]).toBe("https://synergy.test/api/public/leads");
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      source: "autologgia",
      formKey: "vehicle_estimation",
      idempotencyKey: submissionId,
    });
  });

  it("un rejet Resend renvoie 502 et court-circuite Synergy — le couplage est documenté", async () => {
    // C'est exactement ce que la Preview a produit : l'email refusé empêchait
    // aussi l'ingestion du lead. Ce test fige le comportement actuel ; si l'on
    // décide un jour de découpler (forward même sans email), il faudra le
    // mettre à jour sciemment.
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "refusé" } });
    const { estimation } = await loadRoutes();

    const response = await estimation(request("/api/estimation", estimationPayload));

    expect(response.status).toBe(502);
    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
