import { ESTIMATION_BODY_LIMIT_BYTES, MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_TOTAL_PHOTO_BYTES } from "@/lib/estimation-photos";
import { readFormJson, formRequestError } from "@/lib/form-request";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanityWriteToken, writeClient } from "@/lib/sanity-write";
import {
  LEAD_SOURCE,
  cleanAttribution,
  cleanSubmissionId,
  newSubmissionId,
} from "@/lib/lead-context";
import { forwardLeadToSynergy } from "@/lib/synergy-leads";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
// Destinataire réel en prod (fallback). Doit rester aligné sur /api/contact :
// une clé Resend en mode test n'autorise l'envoi qu'à l'adresse du compte, donc
// une valeur codée en dur ici faisait rejeter l'email (validation_error) en
// Preview -- et le 502 qui s'ensuit coupe la route AVANT forwardLeadToSynergy,
// donc aucun prospect n'arrivait non plus.
const TO = process.env.RESEND_TO_EMAIL ?? "autologgia.web@gmail.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+().\-\s]{6,30}$/;
const MAX_BODY_BYTES = ESTIMATION_BODY_LIMIT_BYTES;
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
  // Contexte transmis à Synergy (voir lib/lead-context.ts).
  "submissionId",
  "attribution",
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
  if (photos === undefined) return [];
  if (!Array.isArray(photos) || photos.length > MAX_PHOTOS) throw new Error("Sélectionnez au maximum 4 photos.");
  let total = 0;
  return photos.map((photo) => {
    if (!photo || typeof photo !== "object" || Array.isArray(photo)) throw new Error("Photo invalide.");
    const { filename, content } = photo as Partial<PhotoData>;
    const safeFilename = sanitizeFilename(filename);
    if (!safeFilename || typeof content !== "string" || content.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(content)) throw new Error("Format de photo invalide (JPG, PNG ou WebP).");
    const buffer = Buffer.from(content, "base64");
    total += buffer.length;
    if (!buffer.length || buffer.length > MAX_PHOTO_BYTES || total > MAX_TOTAL_PHOTO_BYTES) throw new Error("Photos trop volumineuses : réduisez leur taille ou leur nombre (2,5 Mo au total).");
    const extension = safeFilename.split(".").pop()!.toLowerCase();
    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const png = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp = buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
    if (!((jpeg && ["jpg","jpeg"].includes(extension)) || (png && extension === "png") || (webp && extension === "webp"))) throw new Error("Le contenu de la photo ne correspond pas à son format.");
    return { filename: safeFilename, content: buffer };
  });
}

export async function POST(req: Request) {
  if (!checkRateLimit(req, "estimation", 6, 10 * 60 * 1000)) {
    return jsonError("Trop de demandes. Reessayez plus tard.", 429);
  }

  const requestError = formRequestError(req);
  if (requestError) return requestError;
  const parsed = await readFormJson(req, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

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
  let attachments: Attachment[];
  try { attachments = buildAttachments(raw.photos); }
  catch (error) { return jsonError(error instanceof Error ? error.message : "Photo invalide."); }

  if (process.env.VERCEL_ENV === "preview") {
    return jsonError("Les envois sont désactivés sur cette version de test.", 503);
  }

  // Un rejeu de la même soumission (réessai après erreur réseau) réutilise la
  // même clé : ni email ni prospect dupliqués.
  const submissionId = cleanSubmissionId(raw.submissionId) ?? newSubmissionId();
  const attribution = cleanAttribution(raw.attribution);

  // Les deux canaux sont tentés INDÉPENDAMMENT et en parallèle : perdre le
  // prospect CRM parce que l'email a échoué (ou l'inverse) reviendrait à perdre
  // la demande d'un client. Le visiteur ne voit une erreur que si les DEUX ont
  // échoué ; sinon la demande est bien arrivée quelque part, et le canal en
  // échec est journalisé pour diagnostic.
  //
  // L'idempotence est portée par `submissionId`, que le client conserve tant
  // que la soumission n'a pas réussi : un réessai réutilise la même clé et ne
  // peut donc ni redoubler l'email (idempotencyKey Resend) ni le prospect
  // (déduplication de ingest_lead côté Synergy), y compris quand un seul des
  // deux canaux avait abouti au tour précédent.
  const sendEmail = async (): Promise<boolean> => {
    if (!process.env.RESEND_API_KEY) {
      console.error("[api/estimation] missing RESEND_API_KEY");
      return false;
    }
    try {
      const { error: resendError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
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
      }, { idempotencyKey: `autologgia-estimation-${submissionId}` });
      if (resendError) {
        console.error("[api/estimation] resend rejected email", resendError.name);
        return false;
      }
      return true;
    } catch (error) {
      console.error(
        "[api/estimation] resend send failed",
        error instanceof Error ? error.message : "unknown error",
      );
      return false;
    }
  };

  const [emailSent, leadForwarded] = await Promise.all([
    sendEmail(),
    forwardLeadToSynergy({
      // Le formulaire d'estimation ne collecte pas de nom : Synergy en exige un,
      // on compose donc un libellé lisible dans le CRM plutôt qu'un cadre vide.
      name: `Estimation ${brand} ${model}`,
      source: LEAD_SOURCE,
      formKey: "vehicle_estimation",
      ...(email ? { email } : {}),
      phone,
      ...(message ? { message } : {}),
      product: {
        type: "vehicle_estimation",
        label: `${brand} ${model}${version ? ` ${version}` : ""}`,
        estimation: {
          brand,
          model,
          year: yearNum,
          mileage: mileageNum,
          power: powerNum,
          fuel,
          transmission,
          ...(version ? { version } : {}),
          condition: etat,
          ...(localisation ? { location: localisation } : {}),
        },
      },
      ...(attribution ? { attribution } : {}),
      idempotencyKey: submissionId,
    }),
  ]);

  // Les deux canaux ont échoué : la demande n'est arrivée nulle part, le
  // visiteur doit pouvoir réessayer (avec le même submissionId).
  if (!emailSent && !leadForwarded) {
    return jsonError("Impossible d'envoyer la demande pour le moment.", 502);
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
