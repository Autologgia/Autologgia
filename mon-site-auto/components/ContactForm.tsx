"use client";

import { useState } from "react";
import { trackGA4Event } from "@/lib/analytics";

type Status = "idle" | "loading" | "success" | "error";

const inputCls =
  "mt-2 w-full rounded-xl border border-[#e5e3dd] bg-white px-4 py-3 text-navy outline-none transition focus:border-[#C9A84C]/60 placeholder:text-gray-400";

export default function ContactForm({
  vehicule,
  demande,
}: {
  vehicule?: string;
  demande?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function defaultMessage() {
    if (demande === "historique" && vehicule)
      return `Bonjour, je souhaite obtenir l'historique complet du véhicule : ${vehicule}.`;
    if (vehicule)
      return `Bonjour, je suis intéressé par le véhicule : ${vehicule}.`;
    return "";
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      website: (form.elements.namedItem("website") as HTMLInputElement)?.value ?? "",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        if (res.ok && !data.website.trim()) {
          trackGA4Event("generate_lead", {
            form_name: "contact_page",
            lead_type: vehicule ? "vehicle_interest" : "general_contact",
          });
        }
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setErrorMessage(result.error ?? "Une erreur est survenue.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Impossible de contacter le serveur. Réessayez.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-8 rounded-2xl border border-navy/20 bg-navy p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-900/30 text-xl text-emerald-400">
          ✓
        </div>
        <h3 className="mt-4 text-xl font-semibold text-white">Message envoyé</h3>
        <p className="mt-2 text-gray-400">Nous vous recontactons sous 24h.</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm text-gray-400 underline underline-offset-2 hover:text-white"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-5 rounded-2xl border border-navy/20 bg-navy p-8"
    >
      {/* Honeypot */}
      <div
        style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-300">Nom complet *</label>
        <input
          type="text"
          name="name"
          required
          className={inputCls}
          placeholder="Votre nom"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-300">Téléphone *</label>
        <input
          type="tel"
          name="phone"
          required
          className={inputCls}
          placeholder="+33 6 00 00 00 00"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-300">Email</label>
        <input
          type="email"
          name="email"
          className={inputCls}
          placeholder="votre@email.com (optionnel)"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-300">Message *</label>
        <textarea
          name="message"
          rows={6}
          required
          className={`${inputCls} lg:min-h-[220px]`}
          defaultValue={defaultMessage()}
        />
      </div>

      {/* Consentement RGPD */}
      <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3.5">
        <input
          type="checkbox"
          name="consent"
          id="contact-form-consent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#C9A84C]"
        />
        <label htmlFor="contact-form-consent" className="text-xs leading-relaxed text-gray-400">
          J&apos;accepte que mes données soient utilisées dans le cadre de ma demande conformément à la{" "}
          <a
            href="/politique-confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C9A84C] underline underline-offset-2 transition hover:text-[#d4b96a]"
          >
            politique de confidentialité
          </a>. <span className="text-[#C9A84C]">*</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-[#C9A84C] px-8 py-4 font-semibold text-white transition hover:bg-[#b8962e] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? "Envoi en cours…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}
