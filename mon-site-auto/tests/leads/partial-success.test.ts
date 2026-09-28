import { readFileSync } from "node:fs";
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
 * SUCCÈS PARTIEL : Resend accepte, Synergy expire.
 *
 * Ce fichier verrouille le comportement RÉEL de bout en bout, y compris ce
 * qu'il a d'inconfortable -- il ne décrit pas le comportement souhaitable.
 *
 * Le contrat « le visiteur ne voit une erreur que si les DEUX canaux ont
 * échoué » a une conséquence mesurée ici : la réponse d'un succès partiel est
 * **identique, octet pour octet**, à celle d'un succès complet. Le navigateur
 * ne peut donc pas savoir que le CRM n'a pas reçu le prospect, et les quatre
 * formulaires effacent leur submissionId dès `result.success`.
 *
 * Le serveur réessaie une fois l'ingestion (synergy-retry.test.ts), ce qui
 * rattrape les incidents transitoires. Mais quand les DEUX tentatives ont
 * échoué, tout ce qui suit reste vrai : plus personne ne rejouera ce lead, et
 * le client n'a aucun moyen de l'apprendre.
 *
 * Si l'un de ces tests casse, c'est que ce compromis a changé : vérifier que
 * c'était voulu, et que l'idempotence (une seule clé, un seul email) tient
 * toujours. Voir la réponse d'ingestion dans lib/synergy-leads.ts.
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

/** Ce que produit AbortSignal.timeout quand le forward dépasse la limite. */
function synergyTimeout() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError")),
  );
}

function leadForwards() {
  return vi.mocked(global.fetch).mock.calls.filter(([url]) => String(url).endsWith("/api/public/leads"));
}

const routes = [
  { label: "/api/contact", run: () => contact(request("/api/contact", CONTACT)) },
  { label: "/api/estimation", run: () => estimation(request("/api/estimation", ESTIMATION)) },
] as const;

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-only";
  process.env.RESEND_TO_EMAIL = "compte.resend@example.test";
  process.env.SYNERGY_CMS_API_URL = "https://synergy.test";
  process.env.SYNERGY_LEAD_INGESTION_TOKEN = "test-token-not-real";
  send.mockResolvedValue({ data: { id: "fake-email-id" }, error: null });
  sanityCreate.mockResolvedValue({ _id: "fake-sanity-id" });
  log = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe.each(routes)("$label — Resend OK + Synergy timeout", ({ run }) => {
  it("répond exactement { success: true }, sans trace du canal en échec", async () => {
    synergyTimeout();

    const response = await run();

    expect(response.status).toBe(200);
    // Égalité stricte, pas toMatchObject : c'est l'ABSENCE de tout indicateur
    // sur l'ingestion qui rend le succès partiel indétectable côté navigateur.
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      "[synergy-leads] ingestion status unknown after retry",
      { submissionId, first: "timeout", retry: "timeout" },
    );
  });

  it("réessaie une fois, puis s'arrête définitivement", async () => {
    synergyTimeout();

    await run();

    // Le rejeu est sûr (même clé -> duplicate_replay côté ingest_lead), mais il
    // est unique : passées ces deux tentatives, plus rien ne reprend le lead.
    expect(leadForwards()).toHaveLength(2);
  });
});

/**
 * Côté navigateur : lecture du source, comme tests/leads/honeypot.test.ts.
 * Monter les composants n'apporterait rien ici -- ce qu'on verrouille est une
 * décision écrite en clair dans la branche de succès.
 */
const CLIENT_FORMS = [
  "components/ContactForm.tsx",
  "components/HomepageContactForm.tsx",
  "components/EstimateForm.tsx",
  "components/HistoryGate.tsx",
] as const;

describe("formulaires — un succès partiel est traité comme un succès complet", () => {
  it.each(CLIENT_FORMS)("%s efface le submissionId dès result.success", (file) => {
    const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");

    expect(source).toContain("if (result.success) {");
    expect(source).toContain("submissionIdRef.current = null;");
  });

  it.each(CLIENT_FORMS)("%s ne lit aucun état d'ingestion dans la réponse", (file) => {
    const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");

    // Le seul signal utilisé est result.success ; rien ne distingue les canaux.
    expect(source).not.toMatch(/result\.(leadForwarded|synergy|crm|ingestion)/);
  });
});
