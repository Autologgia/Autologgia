"use client";

import { sendGAEvent } from "@next/third-parties/google";

export const GA_MEASUREMENT_ID = "G-X6FK7Y19L7";
export const ANALYTICS_CONSENT_STORAGE_KEY = "autologgia_analytics_consent";
const ANALYTICS_CONSENT_CHANGE_EVENT = "autologgia-analytics-consent-change";

export type AnalyticsConsent = "granted" | "denied";

let inMemoryConsent: AnalyticsConsent | null = null;

const SAFE_PARAMETER_NAMES = new Set([
  "content_type",
  "currency",
  "form_name",
  "has_photos",
  "item_id",
  "item_name",
  "lead_type",
  "link_domain",
  "method",
  "placement",
  "value",
  "vehicle_id",
  "vehicle_name",
  "vehicle_slug",
] as const);

export type SafeAnalyticsParameterName =
  | "content_type"
  | "currency"
  | "form_name"
  | "has_photos"
  | "item_id"
  | "item_name"
  | "lead_type"
  | "link_domain"
  | "method"
  | "placement"
  | "value"
  | "vehicle_id"
  | "vehicle_name"
  | "vehicle_slug";

export type SafeAnalyticsParameters = Partial<
  Record<SafeAnalyticsParameterName, string | number | boolean>
>;

const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return stored === "granted" || stored === "denied" ? stored : inMemoryConsent;
  } catch {
    return inMemoryConsent;
  }
}

export function saveAnalyticsConsent(consent: AnalyticsConsent) {
  inMemoryConsent = consent;

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // The in-memory choice still applies if browser storage is unavailable.
  }

  window.dispatchEvent(new Event(ANALYTICS_CONSENT_CHANGE_EVENT));
}

export function subscribeToAnalyticsConsent(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === ANALYTICS_CONSENT_STORAGE_KEY) onChange();
  }

  window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function enableGoogleAnalytics() {
  if (typeof window === "undefined") return;

  const analyticsWindow = window as Window & Record<string, unknown>;
  analyticsWindow[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
}

export function disableGoogleAnalytics() {
  if (typeof window === "undefined") return;

  const analyticsWindow = window as Window & {
    gtag?: (...args: unknown[]) => void;
  } & Record<string, unknown>;

  analyticsWindow[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  analyticsWindow.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  deleteGoogleAnalyticsCookies();
}

export function trackGA4Event(
  eventName: string,
  parameters: SafeAnalyticsParameters = {},
): boolean {
  if (typeof window === "undefined" || getAnalyticsConsent() !== "granted") {
    return false;
  }

  if (!/^[a-z][a-z0-9_]{0,39}$/.test(eventName)) {
    console.warn(`[analytics] Invalid GA4 event name: ${eventName}`);
    return false;
  }

  for (const [key, value] of Object.entries(parameters)) {
    if (!SAFE_PARAMETER_NAMES.has(key as SafeAnalyticsParameterName)) {
      console.warn(`[analytics] Parameter not allowed: ${key}`);
      return false;
    }

    if (
      typeof value === "string" &&
      (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value))
    ) {
      console.warn(`[analytics] Parameter rejected because it may contain personal data: ${key}`);
      return false;
    }
  }

  if (!window.dataLayer) return false;

  sendGAEvent("event", eventName, parameters);
  return true;
}

function deleteGoogleAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name) && /^_ga(?:_|$)|^_gid$|^_gat/.test(name));

  const hostnameParts = window.location.hostname.split(".");
  const domains = new Set<string | null>([null, window.location.hostname]);

  for (let index = 0; index < hostnameParts.length - 1; index += 1) {
    domains.add(`.${hostnameParts.slice(index).join(".")}`);
  }

  for (const name of cookieNames) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${
        domain ? `; domain=${domain}` : ""
      }`;
    }
  }
}
