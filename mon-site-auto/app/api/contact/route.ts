import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const TO = "autologgia.web@gmail.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  // Instanciation lazily dans le handler — évite l'erreur au build si la clé est absente
  const resend = new Resend(process.env.RESEND_API_KEY);
  const body = await req.json();
  const { name, phone, email, message, sujet, website } = body as Record<string, string>;

  // Honeypot: bots fill this field, humans don't
  if (website) {
    return Response.json({ success: true });
  }

  if (!name?.trim() || !phone?.trim()) {
    return Response.json(
      { success: false, error: "Veuillez remplir tous les champs obligatoires." },
      { status: 400 }
    );
  }

  // Message requis seulement si aucun sujet n'est fourni
  if (!message?.trim() && !sujet?.trim()) {
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

  const emailSubject = sujet?.trim()
    ? `Nouveau contact – [${sujet.trim()}] ${name.trim()}`
    : `Nouveau contact – ${name.trim()}`;

  const bodyLines = [
    `Nom : ${name.trim()}`,
    `Téléphone : ${phone.trim()}`,
    `Email : ${email?.trim() || "non renseigné"}`,
    sujet?.trim() ? `Sujet : ${sujet.trim()}` : null,
    ``,
    `Message :`,
    message?.trim() || "(Pas de message supplémentaire)",
  ].filter((line): line is string => line !== null);

  try {
    await resend.emails.send({
      from: FROM,
      to: TO,
      subject: emailSubject,
      text: bodyLines.join("\n"),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[api/contact]", error);
    return Response.json(
      { success: false, error: "Une erreur est survenue lors de l'envoi." },
      { status: 500 }
    );
  }
}
