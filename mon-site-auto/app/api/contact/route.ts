import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCmsSource } from "@/lib/cms/config";
import { createHistoryAccessToken, historyAccessCookieName } from "@/lib/cms/history-access";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
// Destinataire réel en prod (fallback). Peut être surchargé via RESEND_TO_EMAIL,
// utile en local quand la clé Resend est en mode test (envoi limité à l'adresse du compte).
const TO = process.env.RESEND_TO_EMAIL ?? "autologgia.web@gmail.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+().\-\s]{6,30}$/;
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_FIELDS = new Set(["name", "phone", "email", "message", "sujet", "website", "historyVehicleSlug"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    });
    if (resendError) {
      console.error("[api/contact] resend rejected email", resendError.message);
      return jsonError("Impossible d'envoyer la demande pour le moment.", 502);
    }

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
      error instanceof Error ? error.message : "unknown error"
    );
    return jsonError("Impossible d'envoyer la demande pour le moment.", 500);
  }
}
