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
  it("does not persist or return attribution without consent", () => {
    captureFirstTouchAttribution();

    expect(storage.size).toBe(0);
    expect(getAttributionForSubmit()).toEqual({
      firstLandingPage: null,
      conversionPage: null,
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

  it("captures first-touch attribution after consent and strips referrer query data", () => {
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

  it("removes stored attribution when consent is withdrawn", () => {
    getConsent.mockReturnValue("granted");
    captureFirstTouchAttribution();
    expect(storage.size).toBe(1);

    clearAttribution();
    expect(storage.size).toBe(0);
  });
});
