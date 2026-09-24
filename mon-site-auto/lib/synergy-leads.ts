import "server-only";

/**
 * Transfert serveur-à-serveur d'un lead vers l'ingestion Synergy
 * (POST /api/public/leads). Best-effort : une panne de Synergy ne doit
 * JAMAIS empêcher l'envoi de l'email de confirmation existant (Resend) ni
 * faire échouer la réponse au visiteur — seulement journalisée.
 *
 * Retourne `true` uniquement si Synergy a bien accepté le lead. Les routes
 * s'en servent pour ne renvoyer une erreur au visiteur que si l'email ET
 * l'ingestion ont échoué : un seul des deux canaux suffit à ne pas perdre la
 * demande. Aucune exception n'est propagée, l'appelant n'a rien à try/catch.
 *
 * Réutilise la même base d'URL que l'intégration CMS existante
 * (SYNERGY_CMS_API_URL) : un seul Synergy, deux usages distincts (lecture
 * véhicules vs écriture de leads), chacun avec son propre token dédié.
 * SYNERGY_LEAD_INGESTION_TOKEN n'est JAMAIS exposé via NEXT_PUBLIC_*.
 *
 * L'appel est attendu (await) plutôt que détaché : sur une fonction
 * serverless, tout travail non attendu risque d'être gelé dès la réponse
 * renvoyée. Le coût maximal pour le visiteur est donc borné par le timeout
 * ci-dessous, et uniquement quand Synergy est réellement injoignable.
 */

const REQUEST_TIMEOUT_MS = 5000;
/** Doit rester sous la limite de l'endpoint Synergy (16 Ko). */
const MAX_BODY_BYTES = 16 * 1024;

export type SynergyLeadPayload = {
  name: string;
  source: string;
  formKey: string;
  email?: string;
  phone?: string;
  message?: string;
  subject?: string;
  product?: {
    type?: string;
    externalId?: string;
    slug?: string;
    label?: string;
    estimation?: Record<string, string | number | undefined>;
  };
  attribution?: {
    firstLandingPage?: string | null;
    conversionPage?: string | null;
    referrer?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
    gclid?: string | null;
    fbclid?: string | null;
    msclkid?: string | null;
  };
  idempotencyKey: string;
};

export async function forwardLeadToSynergy(payload: SynergyLeadPayload): Promise<boolean> {
  const baseUrl = process.env.SYNERGY_CMS_API_URL?.trim().replace(/\/$/, "");
  const token = process.env.SYNERGY_LEAD_INGESTION_TOKEN?.trim();
  if (!baseUrl || !token) {
    console.error("[synergy-leads] ingestion not configured", { submissionId: payload.idempotencyKey });
    return false;
  }

  const body = JSON.stringify(payload);
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    // Inutile de faire l'aller-retour : Synergy répondrait 413.
    console.error("[synergy-leads] payload too large", { submissionId: payload.idempotencyKey });
    return false;
  }

  try {
    const response = await fetch(`${baseUrl}/api/public/leads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error("[synergy-leads] ingestion rejected", { submissionId: payload.idempotencyKey, status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    console.error("[synergy-leads] forward failed", { submissionId: payload.idempotencyKey, reason: error instanceof Error ? error.name : "unknown" });
    return false;
  }
}
