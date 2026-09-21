import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCmsSource } from "@/lib/cms/config";
import { createHistoryAccessToken, historyAccessCookieName } from "@/lib/cms/history-access";
import { forwardLeadToSynergy } from "@/lib/synergy-leads";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
// Destinataire réel en prod (fallback). Peut être surchargé via RESEND_TO_EMAIL,
// utile en local quand la clé Resend est en mode test (envoi limité à l'adresse du compte).
const TO = process.env.RESEND_TO_EMAIL ?? "autologgia.web@gmail.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+().\-\s]{6,30}$/;
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_FIELDS = new Set([
  "name",
  "phone",
  "email",
  "message",
  "sujet",
  "website",
  "historyVehicleSlug",
  "vehicleSlug",
  "vehicleName",
  "attribution",
  "submissionId",
  "formKey",
]);
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_ATTRIBUTION_FIELDS = new Set([
  "firstLandingPage",
  "conversionPage",
  "referrer",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "utmTerm",
  "gclid",
  "fbclid",
  "msclkid",
]);

function cleanAttribution(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of Object.keys(source)) {
    if (!ALLOWED_ATTRIBUTION_FIELDS.has(key)) continue;
    const cleaned = cleanSingleLine(source[key], 500);
    if (cleaned) result[key] = cleaned;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function jsonError(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}

function cleanSingleLine(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n\t\0]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\0/g, "").trim().slice(0, max);
}

function hasOnlyAllowedFields(body: Record<string, unknown>) {
  return Object.keys(body).every((key) => ALLOWED_FIELDS.has(key));
}

export async function POST(req: Request) {
  if (!checkRateLimit(req, "contact", 10, 10 * 60 * 1000)) {
    return jsonError("Trop de demandes. Reessayez plus tard.", 429);
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError("Demande trop volumineuse.", 413);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Requete invalide.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Requete invalide.");
  }

  const raw = body as Record<string, unknown>;
  if (!hasOnlyAllowedFields(raw)) {
    return jsonError("Requete invalide.");
  }

  const name = cleanSingleLine(raw.name, 100);
  const phone = cleanSingleLine(raw.phone, 30);
  const email = cleanSingleLine(raw.email, 120).toLowerCase();
  const message = cleanText(raw.message, 3000);
  const sujet = cleanSingleLine(raw.sujet, 120);
  const website = cleanSingleLine(raw.website, 120);
  const historyVehicleSlug = cleanSingleLine(raw.historyVehicleSlug, 200);
  const vehicleSlug = cleanSingleLine(raw.vehicleSlug, 200);
  const vehicleName = cleanSingleLine(raw.vehicleName, 300);
  const attribution = cleanAttribution(raw.attribution);
  const suppliedSubmissionId = cleanSingleLine(raw.submissionId, 36);
  if (raw.submissionId !== undefined && !UUID_V4_PATTERN.test(suppliedSubmissionId)) {
    return jsonError("Identifiant de soumission invalide.");
  }
  const submissionId = suppliedSubmissionId || crypto.randomUUID();
  const requestedFormKey = cleanSingleLine(raw.formKey, 40);
  const inferredFormKey = historyVehicleSlug ? "vehicle_history" : vehicleSlug || vehicleName ? "vehicle_contact" : "general_contact";
  const formKey = requestedFormKey || inferredFormKey;
  const hasVehicle = Boolean(vehicleSlug || vehicleName);
  if (!(["homepage_contact", "general_contact", "vehicle_contact", "vehicle_history"].includes(formKey)) ||
      ((formKey === "homepage_contact" || formKey === "general_contact") && (hasVehicle || historyVehicleSlug)) ||
      (formKey.startsWith("vehicle_") && !hasVehicle) ||
      (historyVehicleSlug && formKey !== "vehicle_history") ||
      (historyVehicleSlug && historyVehicleSlug !== vehicleSlug)) {
    return jsonError("Contexte de formulaire invalide.");
  }

  // Honeypot: bots fill this field, humans don't.
  if (website) {
    return Response.json({ success: true });
  }

  if (!name || !phone) {
    return jsonError("Veuillez remplir tous les champs obligatoires.");
  }

  if (!PHONE_REGEX.test(phone)) {
    return jsonError("Telephone invalide.");
  }

  if (!message && !sujet) {
    return jsonError("Veuillez remplir tous les champs obligatoires.");
  }

  if (email && !EMAIL_REGEX.test(email)) {
    return jsonError("Adresse email invalide.");
  }

  if (historyVehicleSlug && !SLUG_PATTERN.test(historyVehicleSlug)) {
    return jsonError("Véhicule invalide.");
  }

  if (vehicleSlug && !SLUG_PATTERN.test(vehicleSlug)) {
    return jsonError("Véhicule invalide.");
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("[api/contact] missing RESEND_API_KEY");
    return jsonError("Impossible d'envoyer la demande pour le moment.", 500);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const emailSubject = sujet
    ? `Nouveau contact - [${sujet}] ${name}`
    : `Nouveau contact - ${name}`;

  const bodyLines = [
    `Nom : ${name}`,
    `Telephone : ${phone}`,
    `Email : ${email || "non renseigne"}`,
    sujet ? `Sujet : ${sujet}` : null,
    "",
    "Message :",
    message || "(Pas de message supplementaire)",
  ].filter((line): line is string => line !== null);

  try {
    const { error: resendError } = await resend.emails.send({
      from: FROM,
      to: TO,
      subject: emailSubject,
      text: bodyLines.join("\n"),
    }, { idempotencyKey: `autologgia-contact-${submissionId}` });
    if (resendError) {
      console.error("[api/contact] resend rejected email", { submissionId, reason: resendError.name });
      return jsonError("Impossible d'envoyer la demande pour le moment.", 502);
    }

    // Transfert Synergy best-effort : ne doit jamais faire échouer la
    // confirmation déjà envoyée par email (voir lib/synergy-leads.ts).
    await forwardLeadToSynergy({
      name,
      source: "autologgia",
      formKey,
      idempotencyKey: submissionId,
      email: email || undefined,
      phone,
      message: message || undefined,
      subject: sujet || formKey,
      product: vehicleSlug || vehicleName ? { type: "vehicle", slug: vehicleSlug || undefined, label: vehicleName || undefined } : undefined,
      attribution,
    });

    const response = Response.json({ success: true });
    if (historyVehicleSlug && getCmsSource() === "supabase") {
      const access = createHistoryAccessToken(historyVehicleSlug);
      response.headers.append(
        "Set-Cookie",
        `${historyAccessCookieName(historyVehicleSlug)}=${access.token}; Max-Age=${access.maxAge}; Path=/api/vehicle-history/${historyVehicleSlug}; HttpOnly; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      );
    }
    return response;
  } catch (error) {
    console.error(
      "[api/contact] resend send failed",
      { submissionId, reason: error instanceof Error ? error.name : "unknown" }
    );
    return jsonError("Impossible d'envoyer la demande pour le moment.", 500);
  }
}
