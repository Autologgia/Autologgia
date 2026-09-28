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
 * renvoyée. Le coût maximal pour le visiteur est donc borné par les budgets
 * ci-dessous (10 s + 250 ms + 3 s, soit ~13,25 s dans le pire cas), et
 * uniquement quand Synergy est réellement injoignable.
 *
 * UNE seule seconde tentative, sur erreur transitoire uniquement. Elle est
 * sûre parce que ingest_lead est idempotent sur (site_id, idempotency_key) :
 * rejouer la même clé renvoie `duplicate_replay` et ne crée jamais de second
 * prospect -- y compris après un timeout où Synergy avait en fait traité la
 * requête (cas observé en Preview le 2026-09-25). Le retry ne touche QUE ce
 * canal : Resend n'est pas rappelé, aucun second email n'est possible.
 */

/**
 * 10 s et non 5 s : un forward réel a été mesuré à ~5,1 s (cold start Vercel +
 * RPC ingest_lead, qui crée aussi séquence d'automatisation, tâche et
 * événements). Synergy avait répondu 200 -- le lead était ingéré -- mais
 * l'abandon côté client était déjà parti. Le timeout doit couvrir le pire cas
 * normal, pas le cas médian.
 */
const REQUEST_TIMEOUT_MS = 10_000;
/**
 * Budget volontairement court pour la seconde tentative : elle vise un
 * incident transitoire (cold start déjà payé, 503 bref, coupure réseau), pas
 * une panne durable. Rallonger l'attente du visiteur au-delà ne rachèterait
 * plus rien.
 */
const RETRY_TIMEOUT_MS = 3_000;
/** Laisse passer le micro-incident sans retarder perceptiblement la réponse. */
const RETRY_DELAY_MS = 250;
/** Doit rester sous la limite de l'endpoint Synergy (16 Ko). */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * 408/429/5xx : l'état est transitoire côté Synergy, un rejeu a une chance
 * d'aboutir. Tout le reste (400 payload invalide, 401/403 token, 413) vient
 * de CETTE requête : la rejouer à l'identique redonnerait le même verdict et
 * ne ferait que retarder la réponse au visiteur.
 */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

type Attempt =
  | { outcome: "accepted" }
  | { outcome: "timeout" }
  | { outcome: "network"; reason: string }
  | { outcome: "rejected"; status: number };

/** Étiquette compacte pour les logs. Ne contient jamais ni token ni payload. */
function describeAttempt(attempt: Attempt): string {
  switch (attempt.outcome) {
    case "accepted":
      return "accepted";
    case "timeout":
      return "timeout";
    case "network":
      return attempt.reason;
    case "rejected":
      return `http_${attempt.status}`;
  }
}

async function attemptForward(url: string, token: string, body: string, timeoutMs: number): Promise<Attempt> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok ? { outcome: "accepted" } : { outcome: "rejected", status: response.status };
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown";
    // Un timeout n'est PAS un échec avéré : on abandonne la lecture de la
    // réponse, mais Synergy peut très bien avoir enregistré le lead. Le
    // distinguer d'une vraie panne réseau évite de conclure à un prospect
    // perdu sur la seule foi d'un log.
    return reason === "TimeoutError" ? { outcome: "timeout" } : { outcome: "network", reason };
  }
}

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

  const url = `${baseUrl}/api/public/leads`;
  const submissionId = payload.idempotencyKey;

  const first = await attemptForward(url, token, body, REQUEST_TIMEOUT_MS);
  if (first.outcome === "accepted") return true;

  // Échec permanent : rejouer ne changerait rien, on s'arrête tout de suite.
  if (first.outcome === "rejected" && !isRetryableStatus(first.status)) {
    console.error("[synergy-leads] ingestion rejected -- not retryable", { submissionId, status: first.status });
    return false;
  }

  if (first.outcome === "timeout") {
    console.error("[synergy-leads] forward timed out -- retrying, ingestion status unknown", { submissionId, timeoutMs: REQUEST_TIMEOUT_MS });
  } else if (first.outcome === "network") {
    console.error("[synergy-leads] forward failed -- retrying", { submissionId, reason: first.reason });
  } else {
    console.error("[synergy-leads] ingestion unavailable -- retrying", { submissionId, status: first.status });
  }

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

  // MÊME body, donc même idempotencyKey : c'est ce qui rend ce rejeu sûr.
  const retry = await attemptForward(url, token, body, RETRY_TIMEOUT_MS);
  if (retry.outcome === "accepted") {
    console.warn("[synergy-leads] forward recovered on retry", { submissionId, first: describeAttempt(first) });
    return true;
  }

  // Dès qu'une des deux tentatives a expiré, l'ingestion a pu aboutir sans
  // qu'on l'apprenne : on ne peut pas affirmer que le prospect est perdu.
  if (first.outcome === "timeout" || retry.outcome === "timeout") {
    console.error("[synergy-leads] ingestion status unknown after retry", { submissionId, first: describeAttempt(first), retry: describeAttempt(retry) });
    return false;
  }

  console.error("[synergy-leads] forward failed after retry", { submissionId, first: describeAttempt(first), retry: describeAttempt(retry) });
  return false;
}
