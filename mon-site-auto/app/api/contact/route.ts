import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const TO = "autologgia.web@gmail.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json();
  const { name, phone, email, message, website } = body as Record<string, string>;

  // Honeypot: bots fill this field, humans don't
  if (website) {
    return Response.json({ success: true });
  }

  if (!name?.trim() || !phone?.trim() || !message?.trim()) {
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

  try {
    await resend.emails.send({
      from: FROM,
      to: TO,
      subject: `Nouveau contact – ${name.trim()}`,
      text: [
        `Nom : ${name.trim()}`,
        `Téléphone : ${phone.trim()}`,
        `Email : ${email?.trim() || "non renseigné"}`,
        ``,
        `Message :`,
        message.trim(),
      ].join("\n"),
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
