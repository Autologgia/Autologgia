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
 * Régression du 2026-09-24 : le honeypot était déplacé hors écran
 * (`left:-9999px`). Chrome traite un champ hors écran comme visible et
 * l'autofill le remplissait : de vraies soumissions étaient prises pour des
 * bots et repartaient en succès silencieux, sans email ni prospect.
 *
 * Le champ doit donc être `display:none` (ignoré par l'autofill et par les
 * gestionnaires de mots de passe) tout en restant dans le HTML, pour continuer
 * à piéger les bots qui remplissent tous les champs sans évaluer le CSS.
 */

const FORMS_WITH_HONEYPOT = [
  "components/ContactForm.tsx",
  "components/HomepageContactForm.tsx",
  "components/EstimateForm.tsx",
] as const;

describe("honeypot — résistant à l'autofill du navigateur", () => {
  it.each(FORMS_WITH_HONEYPOT)("%s masque le honeypot avec display:none", (file) => {
    const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");

    expect(source).toContain('<input type="text" name="website"');
    expect(source).toContain('style={{ display: "none" }}');
  });

  it.each(FORMS_WITH_HONEYPOT)("%s n'utilise plus le déplacement hors écran", (file) => {
    const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");

    // On vise la forme CODE (`left: "-9999px"` dans un style), pas une simple
    // mention : le commentaire qui explique la régression cite la valeur, et un
    // test qu'un commentaire peut faire échouer ne protège rien.
    expect(source).not.toContain('left: "-9999px"');
    expect(source).not.toContain('position: "absolute", left:');
  });

  it.each(FORMS_WITH_HONEYPOT)("%s garde le champ hors du parcours clavier", (file) => {
    const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");

    expect(source).toMatch(/name="website"[^/]*tabIndex=\{-1\}/);
    expect(source).toMatch(/name="website"[^/]*autoComplete="off"/);
    expect(source).toContain('aria-hidden="true"');
  });
});

const submissionId = "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3";

function request(path: string, payload: Record<string, unknown>) {
  return new Request(`https://autologgia.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-only";
  process.env.SYNERGY_CMS_API_URL = "https://synergy.test";
  process.env.SYNERGY_LEAD_INGESTION_TOKEN = "test-token-not-real";
  send.mockResolvedValue({ data: { id: "fake-email-id" }, error: null });
  sanityCreate.mockResolvedValue({ _id: "fake-sanity-id" });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, status: "created" }), { status: 201 })),
  );
});

describe("honeypot — la protection anti-spam reste entière côté serveur", () => {
  it("/api/contact : un honeypot rempli n'envoie ni email ni prospect", async () => {
    const response = await contact(
      request("/api/contact", {
        submissionId,
        name: "Bot",
        phone: "+33612345678",
        message: "spam",
        website: "http://spam.example",
      }),
    );

    // Réponse volontairement indiscernable d'un succès : on ne renseigne pas le bot.
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(send).not.toHaveBeenCalled();
    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
  });

  it("/api/estimation : un honeypot rempli n'envoie ni email ni prospect", async () => {
    const response = await estimation(
      request("/api/estimation", {
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
        website: "http://spam.example",
      }),
    );

    expect(response.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
  });

  it("/api/contact : un honeypot vide laisse passer la soumission", async () => {
    const response = await contact(
      request("/api/contact", {
        submissionId,
        name: "Naïma Cherif",
        phone: "+33612345678",
        message: "Bonjour",
        website: "",
      }),
    );

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch)).toHaveBeenCalled();
  });
});
