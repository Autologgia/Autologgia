import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanityWriteToken, writeClient } from "@/lib/sanity-write";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const TO = "autologgia.web@gmail.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+().\-\s]{6,30}$/;
const MAX_BODY_BYTES = 18 * 1024 * 1024;
const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const ALLOWED_FIELDS = new Set([
  "brand",
  "model",
  "year",
  "mileage",
  "power",
  "fuel",
  "transmission",
  "version",
  "etat",
  "localisation",
  "phone",
  "email",
  "message",
  "website",
  "photos",
]);
const ALLOWED_FUELS = new Set(["essence", "diesel", "hybride", "electrique"]);
const ALLOWED_TRANSMISSIONS = new Set(["automatique", "manuelle"]);
const ALLOWED_ETATS = new Set(["excellent", "bon", "correct", "a_reviser"]);
const ALLOWED_PHOTO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

type PhotoData = { filename: string; content: string };
type Attachment = { filename: string; content: Buffer };

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

function parsePositiveInt(value: string) {
  if (!/^\d+$/.test(value)) return NaN;
  return Number(value);
}

function sanitizeFilename(filename: unknown) {
  const cleaned = cleanSingleLine(filename, 120).replace(/[\\/]/g, "_");
  const extension = cleaned.split(".").pop()?.toLowerCase() ?? "";
  if (!cleaned || !ALLOWED_PHOTO_EXTENSIONS.has(extension)) return "";
  return cleaned;
}

function buildAttachments(photos: unknown): Attachment[] {
  if (!Array.isArray(photos)) return [];

  const attachments: Attachment[] = [];
  for (const photo of photos.slice(0, MAX_PHOTOS)) {
    if (!photo || typeof photo !== "object" || Array.isArray(photo)) continue;
    const { filename, content } = photo as Partial<PhotoData>;
    const safeFilename = sanitizeFilename(filename);
    if (!safeFilename || typeof content !== "string") continue;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(content)) continue;

    try {
      const buffer = Buffer.from(content, "base64");
      if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) continue;
      attachments.push({ filename: safeFilename, content: buffer });
    } catch {
      // Ignore malformed photos.
    }
  }

  return attachments;
}

export async function POST(req: Request) {
  if (!checkRateLimit(req, "estimation", 6, 10 * 60 * 1000)) {
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

  const brand = cleanSingleLine(raw.brand, 80);
  const model = cleanSingleLine(raw.model, 80);
  const year = cleanSingleLine(raw.year, 4);
  const mileage = cleanSingleLine(raw.mileage, 8);
  const power = cleanSingleLine(raw.power, 4);
  const fuel = cleanSingleLine(raw.fuel, 30);
  const transmission = cleanSingleLine(raw.transmission, 30);
  const version = cleanSingleLine(raw.version, 120);
  const etat = cleanSingleLine(raw.etat, 30);
  const localisation = cleanSingleLine(raw.localisation, 120);
  const phone = cleanSingleLine(raw.phone, 30);
  const email = cleanSingleLine(raw.email, 120).toLowerCase();
  const message = cleanText(raw.message, 3000);
  const website = cleanSingleLine(raw.website, 120);

  // Honeypot: bots fill this field, humans don't.
  if (website) {
    return Response.json({ success: true });
  }

  if (!brand || !model || !year || !mileage || !power || !fuel || !transmission || !etat || !phone) {
    return jsonError("Veuillez remplir tous les champs obligatoires.");
  }

  if (!PHONE_REGEX.test(phone)) {
    return jsonError("Telephone invalide.");
  }

  if (email && !EMAIL_REGEX.test(email)) {
    return jsonError("Adresse email invalide.");
  }

  const yearNum = parsePositiveInt(year);
  const mileageNum = parsePositiveInt(mileage);
  const powerNum = parsePositiveInt(power);
  const currentYear = new Date().getFullYear();

  if (
    !Number.isInteger(yearNum) ||
    !Number.isInteger(mileageNum) ||
    !Number.isInteger(powerNum) ||
    yearNum < 1950 ||
    yearNum > currentYear ||
    mileageNum < 0 ||
    mileageNum > 2000000 ||
    powerNum < 1 ||
    powerNum > 2000
  ) {
    return jsonError("Annee, kilometrage ou puissance invalide.");
  }

  if (!ALLOWED_FUELS.has(fuel) || !ALLOWED_TRANSMISSIONS.has(transmission) || !ALLOWED_ETATS.has(etat)) {
    return jsonError("Requete invalide.");
  }

  const etatLabels: Record<string, string> = {
    excellent: "Excellent - comme neuf",
    bon: "Bon - entretenu regulierement",
    correct: "Correct - quelques defauts mineurs",
    a_reviser: "A reviser - necessite des travaux",
  };
  const attachments = buildAttachments(raw.photos);

  if (!process.env.RESEND_API_KEY) {
    console.error("[api/estimation] missing RESEND_API_KEY");
    return jsonError("Impossible d'envoyer la demande pour le moment.", 500);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: FROM,
      to: TO,
      subject: `Nouvelle estimation - ${brand} ${model}`,
      text: [
        "Nouvelle demande d'estimation",
        "",
        "-- Vehicule --",
        `Marque      : ${brand}`,
        `Modele      : ${model}`,
        version ? `Version     : ${version}` : null,
        `Annee       : ${yearNum}`,
        `Kilometrage : ${mileageNum.toLocaleString("fr-FR")} km`,
        `Puissance   : ${powerNum} ch`,
        `Carburant   : ${fuel}`,
        `Transmission: ${transmission}`,
        `Etat        : ${etatLabels[etat] ?? etat}`,
        attachments.length > 0 ? `Photos jointes: ${attachments.length}` : null,
        "",
        "-- Contact --",
        `Telephone   : ${phone}`,
        `Email       : ${email || "non renseigne"}`,
        localisation ? `Localisation: ${localisation}` : null,
        message ? `\nMessage :\n${message}` : null,
        "",
        `Date : ${new Date().toLocaleString("fr-FR")}`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
      ...(attachments.length > 0 ? { attachments } : {}),
    });
  } catch (error) {
    console.error(
      "[api/estimation] resend send failed",
      error instanceof Error ? error.message : "unknown error"
    );
    return jsonError("Impossible d'envoyer la demande pour le moment.", 500);
  }

  if (sanityWriteToken) {
    try {
      await writeClient.create({
        _type: "estimationLead",
        brand,
        model,
        year: yearNum,
        mileage: mileageNum,
        power: powerNum,
        fuel,
        transmission,
        version: version || undefined,
        etat,
        localisation: localisation || undefined,
        phone,
        email: email || undefined,
        message: message || undefined,
        submittedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "[api/estimation] sanity write failed",
        error instanceof Error ? error.message : "unknown error"
      );
    }
  }

  return Response.json({ success: true });
}
