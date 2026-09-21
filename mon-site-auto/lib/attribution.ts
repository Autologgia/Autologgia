"use client";

import { getAnalyticsConsent } from "@/lib/analytics";

/**
 * Attribution marketing first-touch, capturée côté navigateur, pour
 * transmission à Synergy à la conversion (formulaires contact/estimation).
 *
 * Choix cookie vs localStorage : localStorage. Cette donnée n'a besoin
 * d'être lue QUE par le JavaScript client au moment de la conversion (jamais
 * par le serveur via l'en-tête Cookie) : localStorage évite d'alourdir
 * chaque requête HTTP et suffit largement à survivre à la navigation interne
 * (même origine). L'écriture reste conditionnée au consentement de mesure
 * d'audience et d'attribution. Aucune IP stockée, aucun fingerprinting, aucun historique de
 * navigation complet — uniquement le point d'entrée initial et son contexte
 * marketing (UTM/clic ids/référent), écrasés uniquement après expiration.
 */

const STORAGE_KEY = "synergy_attribution_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

type StoredAttribution = {
  firstLandingPage: string;
  referrer: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  msclkid: string | null;
  capturedAt: number;
};

export type AttributionPayload = {
  firstLandingPage: string | null;
  conversionPage: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  msclkid: string | null;
};

function readParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key);
  return value && value.length > 0 ? value.slice(0, 200) : null;
}

function cleanReferrer(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return "";
  }
}

export function clearAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage indisponible : aucune donnée accessible à supprimer
  }
}

/** À appeler une fois par page vue (voir components/AttributionCapture.tsx). Écrit UNIQUEMENT si absent/expiré : first-touch, jamais écrasé par une visite ultérieure. */
export function captureFirstTouchAttribution(): void {
  if (typeof window === "undefined" || getAnalyticsConsent() !== "granted") return;

  try {
    const existingRaw = window.localStorage.getItem(STORAGE_KEY);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as StoredAttribution;
      if (Date.now() - existing.capturedAt < TTL_MS) return;
    }
  } catch {
    // stockage corrompu -> on réécrit proprement ci-dessous
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: StoredAttribution = {
    firstLandingPage: window.location.pathname.slice(0, 500),
    referrer: cleanReferrer(document.referrer),
    utmSource: readParam(params, "utm_source"),
    utmMedium: readParam(params, "utm_medium"),
    utmCampaign: readParam(params, "utm_campaign"),
    utmContent: readParam(params, "utm_content"),
    utmTerm: readParam(params, "utm_term"),
    gclid: readParam(params, "gclid"),
    fbclid: readParam(params, "fbclid"),
    msclkid: readParam(params, "msclkid"),
    capturedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // localStorage indisponible (navigation privée stricte, quota) -> tant pis
  }
}

/** À appeler au moment de la conversion (soumission d'un formulaire). */
export function getAttributionForSubmit(): AttributionPayload {
  const fallback: AttributionPayload = {
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
  };
  if (typeof window === "undefined" || getAnalyticsConsent() !== "granted") return fallback;

  fallback.conversionPage = window.location.pathname.slice(0, 500);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as StoredAttribution;
    return {
      firstLandingPage: stored.firstLandingPage || null,
      conversionPage: fallback.conversionPage,
      referrer: stored.referrer || null,
      utmSource: stored.utmSource,
      utmMedium: stored.utmMedium,
      utmCampaign: stored.utmCampaign,
      utmContent: stored.utmContent,
      utmTerm: stored.utmTerm,
      gclid: stored.gclid,
      fbclid: stored.fbclid,
      msclkid: stored.msclkid,
    };
  } catch {
    return fallback;
  }
}
