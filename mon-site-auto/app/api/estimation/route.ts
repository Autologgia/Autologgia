import { Resend } from "resend";
import { writeClient } from "@/lib/sanity";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const TO = "autologgia.web@gmail.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PhotoData = { filename: string; content: string };

export async function POST(req: Request) {
  const body = await req.json();
  const {
    brand,
    model,
    year,
    mileage,
    power,
    fuel,
    transmission,
    version,
    etat,
    localisation,
    phone,
    email,
    message,
    website,
    photos,
  } = body as Record<string, string> & { photos?: PhotoData[] };

  // Honeypot: bots fill this field, humans don't
  if (website) {
    return Response.json({ success: true });
  }

  if (!brand?.trim() || !model?.trim() || !year || !mileage || !power || !fuel?.trim() || !transmission?.trim() || !etat?.trim() || !phone?.trim()) {
    return Response.json(
      { success: false, error: "Veuillez remplir tous les champs obligatoires." },
      { status: 400 }
    );
  }

  if (email?.trim() && !EMAIL_REGEX.test(email)) {
    return Response.json(
      { success: false, error: "Adresse email invalide." },
      { status: 400 }
    );
  }

  const yearNum = Number(year);
  const mileageNum = Number(mileage);
  const powerNum = Number(power);

  if (isNaN(yearNum) || isNaN(mileageNum) || isNaN(powerNum) || mileageNum < 0 || powerNum < 1) {
    return Response.json(
      { success: false, error: "Année, kilométrage ou puissance invalide." },
      { status: 400 }
    );
  }

  const ETAT_LABELS: Record<string, string> = {
    excellent: "Excellent – comme neuf",
    bon: "Bon – entretenu régulièrement",
    correct: "Correct – quelques défauts mineurs",
    a_reviser: "À réviser – nécessite des travaux",
  };

  // Build attachments from base64 photos (max 4, silently skip invalid)
  const attachments: { filename: string; content: Buffer }[] = [];
  if (Array.isArray(photos)) {
    for (const photo of photos.slice(0, 4)) {
      try {
        if (photo.filename && photo.content) {
          attachments.push({
            filename: photo.filename,
            content: Buffer.from(photo.content, "base64"),
          });
        }
      } catch {
        // skip malformed entry
      }
    }
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: TO,
      subject: `Nouvelle estimation – ${brand.trim()} ${model.trim()}`,
      text: [
        `Nouvelle demande d'estimation`,
        ``,
        `── Véhicule ──`,
        `Marque      : ${brand.trim()}`,
        `Modèle      : ${model.trim()}`,
        version?.trim() ? `Version     : ${version.trim()}` : null,
        `Année       : ${yearNum}`,
        `Kilométrage : ${mileageNum.toLocaleString("fr-FR")} km`,
        `Puissance   : ${powerNum} ch`,
        `Carburant   : ${fuel.trim()}`,
        `Transmission: ${transmission.trim()}`,
        `État        : ${ETAT_LABELS[etat] ?? etat}`,
        attachments.length > 0 ? `Photos joints: ${attachments.length}` : null,
        ``,
        `── Contact ──`,
        `Téléphone   : ${phone.trim()}`,
        `Email       : ${email?.trim() || "non renseigné"}`,
        localisation?.trim() ? `Localisation: ${localisation.trim()}` : null,
        message?.trim() ? `\nMessage :\n${message.trim()}` : null,
        ``,
        `Date : ${new Date().toLocaleString("fr-FR")}`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
      ...(attachments.length > 0 ? { attachments } : {}),
    });
  } catch (error) {
    console.error("[api/estimation] email error:", error);
    return Response.json(
      { success: false, error: "Une erreur est survenue lors de l'envoi." },
      { status: 500 }
    );
  }

  // Save to Sanity if write token is configured
  if (process.env.SANITY_WRITE_TOKEN) {
    try {
      await writeClient.create({
        _type: "estimationLead",
        brand: brand.trim(),
        model: model.trim(),
        year: yearNum,
        mileage: mileageNum,
        power: powerNum,
        fuel: fuel.trim(),
        transmission: transmission.trim(),
        version: version?.trim() || undefined,
        etat: etat.trim(),
        localisation: localisation?.trim() || undefined,
        phone: phone.trim(),
        email: email?.trim() || undefined,
        message: message?.trim() || undefined,
        submittedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[api/estimation] sanity write error:", error);
    }
  }

  return Response.json({ success: true });
}
