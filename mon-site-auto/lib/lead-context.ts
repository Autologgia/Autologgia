/**
 * Normalisation du contexte de lead reçu du navigateur, avant transfert à
 * Synergy. Module PUR (aucun import serveur) : directement testable.
 *
 * Rôle : garantir que le payload envoyé à Synergy respecte déjà le contrat de
 * POST /api/public/leads (types et longueurs), pour qu'une saisie hostile ou
 * simplement inattendue ne provoque jamais un 400 côté Synergy — le lead
 * partirait alors dans le vide alors que le visiteur a vu « message envoyé ».
 * Les bornes ci-dessous sont celles de src/lib/leads/validation.ts côté
 * Synergy ; elles doivent rester alignées.
 */

import type { SynergyLeadPayload } from "@/lib/synergy-leads";

/** Identifie le site émetteur dans Synergy (alimente prospects.source). */
export const LEAD_SOURCE = "autologgia";

export const LEAD_FORM_KEYS = [
  "general_contact",
  "homepage_contact",
  "vehicle_history",
  "vehicle_estimation",
] as const;

export type LeadFormKey = (typeof LEAD_FORM_KEYS)[number];

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_URL = 500;
const MAX_PARAM = 200;

const URL_KEYS = ["firstLandingPage", "conversionPage", "referrer"] as const;
const PARAM_KEYS = [
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "utmTerm",
  "gclid",
  "fbclid",
  "msclkid",
] as const;

type AttributionPayload = NonNullable<SynergyLeadPayload["attribution"]>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanAttributionValue(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\r\n\t\0]/g, " ").trim().slice(0, max);
  return cleaned.length > 0 ? cleaned : null;
}

/** Retourne la clé telle quelle si c'est un UUID v4, sinon null. */
export function cleanSubmissionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_V4_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
}

/**
 * Secours quand le navigateur n'a pas fourni d'identifiant exploitable (JS
 * partiel, client tiers, payload trafiqué). Le lead part quand même ; seule
 * la déduplication d'un rejeu est perdue pour cette soumission précise.
 */
export function newSubmissionId(): string {
  return crypto.randomUUID();
}

export function cleanFormKey(value: unknown, fallback: LeadFormKey): LeadFormKey {
  return typeof value === "string" && (LEAD_FORM_KEYS as readonly string[]).includes(value)
    ? (value as LeadFormKey)
    : fallback;
}

/**
 * Ne conserve que les clés connues, en chaînes bornées. Tout le reste est
 * ignoré : le navigateur ne peut pas injecter de champ arbitraire dans le
 * payload Synergy. Retourne undefined si rien d'exploitable.
 */
export function cleanAttribution(value: unknown): AttributionPayload | undefined {
  if (!isPlainObject(value)) return undefined;

  const attribution: AttributionPayload = {};
  let hasValue = false;

  for (const key of URL_KEYS) {
    const cleaned = cleanAttributionValue(value[key], MAX_URL);
    attribution[key] = cleaned;
    if (cleaned) hasValue = true;
  }
  for (const key of PARAM_KEYS) {
    const cleaned = cleanAttributionValue(value[key], MAX_PARAM);
    attribution[key] = cleaned;
    if (cleaned) hasValue = true;
  }

  return hasValue ? attribution : undefined;
}
