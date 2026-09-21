import "server-only";

/**
 * Transfert serveur-à-serveur d'un lead vers l'ingestion Synergy
 * (POST /api/public/leads). Best-effort : une panne de Synergy ne doit
 * JAMAIS empêcher l'envoi de l'email de confirmation existant (Resend) ni
 * faire échouer la réponse au visiteur — seulement journalisée.
 *
 * Réutilise la même base d'URL que l'intégration CMS existante
 * (SYNERGY_CMS_API_URL) : un seul Synergy, deux usages distincts (lecture
 * véhicules vs écriture de leads), chacun avec son propre token dédié.
 * SYNERGY_LEAD_INGESTION_TOKEN n'est JAMAIS exposé via NEXT_PUBLIC_*.
 */

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

export async function forwardLeadToSynergy(payload: SynergyLeadPayload): Promise<void> {
  const baseUrl = process.env.SYNERGY_CMS_API_URL?.trim().replace(/\/$/, "");
  const token = process.env.SYNERGY_LEAD_INGESTION_TOKEN?.trim();
  if (!baseUrl || !token) {
    console.error("[synergy-leads] ingestion not configured", { submissionId: payload.idempotencyKey });
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/public/leads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error("[synergy-leads] ingestion rejected", { submissionId: payload.idempotencyKey, status: response.status });
    }
  } catch (error) {
    console.error("[synergy-leads] forward failed", { submissionId: payload.idempotencyKey, reason: error instanceof Error ? error.name : "unknown" });
  }
}
