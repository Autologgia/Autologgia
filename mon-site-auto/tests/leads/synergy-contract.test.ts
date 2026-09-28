import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Conformité du payload sortant au contrat de POST /api/public/leads côté
 * Synergy (src/lib/leads/validation.ts). Les deux dépôts sont séparés : ce
 * test rejoue les bornes de Synergy sur ce que cette application envoie
 * réellement, pour qu'une dérive soit détectée ici plutôt qu'en Production
 * par un 400 silencieux — le visiteur voyant « message envoyé » alors que le
 * prospect n'a jamais été créé.
 */

const { send, sanityCreate } = vi.hoisted(() => ({ send: vi.fn(), sanityCreate: vi.fn() }));

vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => true }));
vi.mock("@/lib/cms/config", () => ({ getCmsSource: () => "sanity" }));
vi.mock("@/lib/cms/history-access", () => ({ createHistoryAccessToken: () => ({ token: "test", maxAge: 60 }), historyAccessCookieName: () => "history-test" }));
vi.mock("@/lib/sanity-write", () => ({ sanityWriteToken: "", writeClient: { create: sanityCreate } }));

import { POST as contact } from "@/app/api/contact/route";
import { POST as estimation } from "@/app/api/estimation/route";

// Bornes de Synergy (src/lib/leads/validation.ts).
const SYNERGY = {
  name: 200, email: 320, phone: 30, message: 5000, subject: 300,
  source: 120, formKey: 100, idempotencyKey: 200,
  productType: 60, productExternalId: 200, productSlug: 200, productLabel: 300,
  url: 500, utm: 200, estimationField: 120, bodyBytes: 16 * 1024,
} as const;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]{6,30}$/;

const URL_KEYS = ["firstLandingPage", "conversionPage", "referrer"];

type Payload = Record<string, unknown>;

function request(path: string, payload: Record<string, unknown>) {
  return new Request(`https://autologgia.test${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}

function sentBody() {
  const call = vi.mocked(global.fetch).mock.calls[0];
  return (call?.[1]?.body ?? "") as string;
}

function sentPayload(): Payload {
  return JSON.parse(sentBody()) as Payload;
}

/** Rejoue la validation de Synergy sur le payload réellement émis. */
function assertSynergyWouldAccept(payload: Payload) {
  expect(Buffer.byteLength(sentBody(), "utf8")).toBeLessThanOrEqual(SYNERGY.bodyBytes);

  expect(typeof payload.name).toBe("string");
  expect((payload.name as string).length).toBeGreaterThan(0);
  expect((payload.name as string).length).toBeLessThanOrEqual(SYNERGY.name);

  // Synergy exige au moins un moyen de contact.
  const email = payload.email as string | undefined;
  const phone = payload.phone as string | undefined;
  expect(Boolean(email) || Boolean(phone)).toBe(true);
  if (email) {
    expect(email.length).toBeLessThanOrEqual(SYNERGY.email);
    expect(email).toMatch(EMAIL_PATTERN);
  }
  if (phone) {
    expect(phone.length).toBeLessThanOrEqual(SYNERGY.phone);
    expect(phone).toMatch(PHONE_PATTERN);
  }

  for (const [key, max] of [["message", SYNERGY.message], ["subject", SYNERGY.subject]] as const) {
    const value = payload[key];
    if (value !== undefined) {
      expect(typeof value, key).toBe("string");
      expect((value as string).length, key).toBeLessThanOrEqual(max);
    }
  }

  for (const key of ["source", "formKey"] as const) {
    expect(typeof payload[key], key).toBe("string");
    expect((payload[key] as string).length, key).toBeGreaterThan(0);
  }
  expect((payload.source as string).length).toBeLessThanOrEqual(SYNERGY.source);
  expect((payload.formKey as string).length).toBeLessThanOrEqual(SYNERGY.formKey);

  expect(payload.idempotencyKey).toMatch(UUID_V4);
  expect((payload.idempotencyKey as string).length).toBeLessThanOrEqual(SYNERGY.idempotencyKey);

  if (payload.product !== undefined) {
    const product = payload.product as Record<string, unknown>;
    for (const [key, max] of [["type", SYNERGY.productType], ["externalId", SYNERGY.productExternalId], ["slug", SYNERGY.productSlug], ["label", SYNERGY.productLabel]] as const) {
      const value = product[key];
      if (value !== undefined) {
        expect(typeof value, `product.${key}`).toBe("string");
        expect((value as string).length, `product.${key}`).toBeLessThanOrEqual(max);
      }
    }
    if (product.estimation !== undefined) {
      for (const [key, value] of Object.entries(product.estimation as Record<string, unknown>)) {
        expect(["string", "number"], `estimation.${key}`).toContain(typeof value);
        expect(String(value).length, `estimation.${key}`).toBeLessThanOrEqual(SYNERGY.estimationField);
      }
    }
  }

  if (payload.attribution !== undefined) {
    for (const [key, value] of Object.entries(payload.attribution as Record<string, unknown>)) {
      // Synergy refuse tout ce qui n'est ni chaîne ni null.
      expect(value === null || typeof value === "string", `attribution.${key}`).toBe(true);
      if (typeof value === "string") {
        expect(value.length, `attribution.${key}`).toBeLessThanOrEqual(URL_KEYS.includes(key) ? SYNERGY.url : SYNERGY.utm);
      }
    }
  }

  // Le payload public ne peut jamais imposer le tenant : Synergy le résout par le token.
  for (const forbidden of ["site_id", "siteId", "company_id", "companyId", "role", "tenant", "site_key"]) {
    expect(payload, forbidden).not.toHaveProperty(forbidden);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-only";
  process.env.SYNERGY_CMS_API_URL = "https://synergy.test";
  process.env.SYNERGY_LEAD_INGESTION_TOKEN = "test-token-not-real";
  send.mockResolvedValue({ data: { id: "fake-email-id" }, error: null });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 201 })));
});

describe("payload Autologgia conforme au contrat Synergy", () => {
  it("contact nominal", async () => {
    await contact(request("/api/contact", {
      submissionId: "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3", formKey: "homepage_contact",
      name: "Jean Dupont", phone: "+33 6 12 34 56 78", email: "Jean.Dupont@Example.TEST",
      sujet: "Achat d'un véhicule", message: "Bonjour, je suis intéressé.",
      attribution: { firstLandingPage: "/", conversionPage: "/contact", referrer: "https://www.google.com/", utmSource: "google", utmMedium: "cpc", gclid: "abc123" },
    }));
    assertSynergyWouldAccept(sentPayload());
  });

  it("contact aux longueurs maximales acceptées par cette application", async () => {
    await contact(request("/api/contact", {
      submissionId: "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3", formKey: "vehicle_history",
      name: "n".repeat(300), phone: "0612345678", email: `${"e".repeat(100)}@example.test`,
      message: "m".repeat(6000), sujet: "s".repeat(400),
      vehicleSlug: "porsche-boxster-s-987", vehicleName: "v".repeat(400),
      attribution: {
        firstLandingPage: `/${"a".repeat(900)}`, conversionPage: `/${"b".repeat(900)}`,
        referrer: `https://example.test/${"c".repeat(900)}`, utmSource: "u".repeat(500),
        utmMedium: "m".repeat(500), utmCampaign: "c".repeat(500), gclid: "g".repeat(500),
      },
    }));
    assertSynergyWouldAccept(sentPayload());
  });

  it("estimation nominale", async () => {
    await estimation(request("/api/estimation", {
      submissionId: "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3",
      brand: "Porsche", model: "911", year: "2020", mileage: "42000", power: "450",
      fuel: "essence", transmission: "automatique", version: "Carrera 4S", etat: "excellent",
      localisation: "Le Cannet", phone: "+33612345678", email: "vendeur@example.test",
      message: "Véhicule suivi en concession.",
      attribution: { conversionPage: "/estimation", utmSource: "newsletter" },
    }));
    assertSynergyWouldAccept(sentPayload());
  });

  it("ignore les champs d'attribution hostiles ou mal typés au lieu de les relayer", async () => {
    await contact(request("/api/contact", {
      submissionId: "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3",
      name: "Test", phone: "+33612345678", message: "Bonjour",
      attribution: { utmSource: { nested: "objet" }, utmMedium: 42, gclid: ["tableau"], site_id: "pirate", conversionPage: "/contact" },
    }));
    const payload = sentPayload();
    assertSynergyWouldAccept(payload);
    const attribution = payload.attribution as Record<string, unknown>;
    expect(attribution).not.toHaveProperty("site_id");
    expect(attribution.utmSource).toBeNull();
    expect(attribution.utmMedium).toBeNull();
    expect(attribution.gclid).toBeNull();
    expect(attribution.conversionPage).toBe("/contact");
  });

  it("remplace une clé d'idempotence invalide par un UUID v4 valide", async () => {
    await contact(request("/api/contact", {
      submissionId: "pas-un-uuid", name: "Test", phone: "+33612345678", message: "Bonjour",
    }));
    const payload = sentPayload();
    expect(payload.idempotencyKey).not.toBe("pas-un-uuid");
    assertSynergyWouldAccept(payload);
  });
});
