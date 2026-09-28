import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConsent } = vi.hoisted(() => ({ getConsent: vi.fn() }));

vi.mock("@/lib/analytics", () => ({ getAnalyticsConsent: getConsent }));

import {
  captureFirstTouchAttribution,
  clearAttribution,
  getAttributionForSubmit,
} from "@/lib/attribution";

const storage = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

beforeEach(() => {
  storage.clear();
  getConsent.mockReturnValue("denied");
  vi.stubGlobal("window", {
    localStorage,
    location: {
      pathname: "/contact",
      search: "?utm_source=google&utm_campaign=septembre&gclid=click-123",
    },
  });
  vi.stubGlobal("document", {
    referrer: "https://example.test/source?email=person%40example.test",
  });
});

describe("attribution consent", () => {
  it("ne stocke rien et ne renvoie aucune donnée marketing sans consentement", () => {
    captureFirstTouchAttribution();

    expect(storage.size).toBe(0);
    expect(getAttributionForSubmit()).toEqual({
      // Page de conversion : le visiteur y soumet lui-même le formulaire, elle
      // ne sort d'aucun stockage et reste le contexte métier de la demande.
      conversionPage: "/contact",
      firstLandingPage: null,
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      gclid: null,
      fbclid: null,
      msclkid: null,
    });
  });

  it("capture le first-touch après consentement et retire la query string du référent", () => {
    getConsent.mockReturnValue("granted");
    captureFirstTouchAttribution();

    expect(getAttributionForSubmit()).toMatchObject({
      firstLandingPage: "/contact",
      conversionPage: "/contact",
      referrer: "https://example.test/source",
      utmSource: "google",
      utmCampaign: "septembre",
      gclid: "click-123",
    });
  });

  it("n'écrase jamais le first-touch lors d'une visite ultérieure", () => {
    getConsent.mockReturnValue("granted");
    captureFirstTouchAttribution();

    vi.stubGlobal("window", {
      localStorage,
      location: { pathname: "/catalogue", search: "?utm_source=facebook" },
    });
    captureFirstTouchAttribution();

    expect(getAttributionForSubmit()).toMatchObject({
      firstLandingPage: "/contact",
      utmSource: "google",
      conversionPage: "/catalogue",
    });
  });

  it("efface l'attribution stockée quand le consentement est retiré", () => {
    getConsent.mockReturnValue("granted");
    captureFirstTouchAttribution();
    expect(storage.size).toBe(1);

    clearAttribution();
    expect(storage.size).toBe(0);
  });

  it("reste silencieux si le stockage est corrompu", () => {
    getConsent.mockReturnValue("granted");
    storage.set("synergy_attribution_v1", "{ pas du JSON");

    expect(() => getAttributionForSubmit()).not.toThrow();
    expect(getAttributionForSubmit().conversionPage).toBe("/contact");
  });
});
