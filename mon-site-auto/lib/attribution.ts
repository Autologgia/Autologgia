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
 * (même origine). Aucune IP stockée, aucun fingerprinting, aucun historique
 * de navigation complet — uniquement le point d'entrée initial et son
 * contexte marketing (UTM/clic ids/référent), écrasés après expiration.
 *
 * Consentement : tout ce qui est ÉCRIT ou LU dans le stockage du navigateur
 * (first-touch, UTM, référent) exige le consentement mesure d'audience, et
 * est effacé s'il est retiré. `conversionPage` fait exception délibérément :
 * c'est la page sur laquelle le visiteur soumet lui-même le formulaire, elle
 * ne sort d'aucun stockage (juste `location.pathname`) et le serveur la
 * connaîtrait de toute façon via l'en-tête Referer. La joindre au lead relève
 * du contexte métier de la demande, pas du pistage : sans elle, un lead issu
 * d'un visiteur ayant refusé les cookies arriverait sans aucun contexte de
 * page, ce qui dégrade le suivi commercial légitime sans rien protéger.
 */

const STORAGE_KEY = "synergy_attribution_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const MAX_URL = 500;
const MAX_PARAM = 200;

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
  return value && value.length > 0 ? value.slice(0, MAX_PARAM) : null;
}

/**
 * Ne conserve que origine + chemin du référent. Un référent peut transporter
 * des données personnelles dans sa query string (email de désinscription,
 * jeton de session d'un site tiers) : on ne les transmet jamais à Synergy.
 */
function cleanReferrer(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, MAX_URL);
  } catch {
    return "";
  }
}

function currentConversionPage(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.pathname.slice(0, MAX_URL);
}

function emptyAttribution(): AttributionPayload {
  return {
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
}

/** Efface l'attribution stockée (consentement retiré, ou hygiène après conversion). */
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
    firstLandingPage: window.location.pathname.slice(0, MAX_URL),
    referrer: cleanReferrer(typeof document === "undefined" ? "" : document.referrer),
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
  const payload = emptyAttribution();
  if (typeof window === "undefined") return payload;

  // Contexte métier de la demande : jamais issu du stockage, donc toujours joint.
  payload.conversionPage = currentConversionPage();

  if (getAnalyticsConsent() !== "granted") return payload;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return payload;
    const stored = JSON.parse(raw) as StoredAttribution;
    return {
      ...payload,
      firstLandingPage: stored.firstLandingPage || null,
      referrer: stored.referrer || null,
      utmSource: stored.utmSource ?? null,
      utmMedium: stored.utmMedium ?? null,
      utmCampaign: stored.utmCampaign ?? null,
      utmContent: stored.utmContent ?? null,
      utmTerm: stored.utmTerm ?? null,
      gclid: stored.gclid ?? null,
      fbclid: stored.fbclid ?? null,
      msclkid: stored.msclkid ?? null,
    };
  } catch {
    return payload;
  }
}
