"use client";

import { useState } from "react";
import { trackGA4Event } from "@/lib/analytics";

type Status = "idle" | "loading" | "success" | "error";

const SUBJECTS = [
  "Achat d'un véhicule",
  "Vente d'un véhicule",
  "Estimation",
  "Recherche personnalisée",
  "Autre demande",
];

const fieldCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors duration-200 focus:border-[#C9A84C]/55 focus:bg-white/[0.08]";

export default function HomepageContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = {
      name:    (form.elements.namedItem("name")    as HTMLInputElement).value,
      email:   (form.elements.namedItem("email")   as HTMLInputElement).value,
      phone:   (form.elements.namedItem("phone")   as HTMLInputElement).value,
      sujet:   (form.elements.namedItem("sujet")   as HTMLSelectElement).value,
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
            form_name: "homepage_contact",
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
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p className="font-heading text-xl font-light text-white">Message envoyé</p>
          <p className="mt-1 text-sm text-gray-400">Notre équipe vous répond sous 24h.</p>
        </div>
        <button
          onClick={() => setStatus("idle")}
          className="mt-1 text-xs text-gray-500 underline underline-offset-2 transition hover:text-gray-300"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Honeypot anti-spam */}
      <div
        style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Nom + Email */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-400">
            Nom complet <span className="text-[#C9A84C]">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="Jean Dupont"
            className={`mt-2 ${fieldCls}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400">
            Email <span className="text-[#C9A84C]">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="votre@email.com"
            className={`mt-2 ${fieldCls}`}
          />
        </div>
      </div>

      {/* Téléphone + Sujet */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-400">
            Téléphone <span className="text-[#C9A84C]">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="+33 6 00 00 00 00"
            className={`mt-2 ${fieldCls}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400">
            Sujet <span className="text-[#C9A84C]">*</span>
          </label>
          <div className="relative mt-2">
            <select
              name="sujet"
              required
              defaultValue=""
              className={`${fieldCls} appearance-none pr-10`}
            >
              <option value="" disabled className="bg-[#0f2035] text-white">
                Choisir un sujet…
              </option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s} className="bg-[#0f2035] text-white">
                  {s}
                </option>
              ))}
            </select>
            {/* Chevron custom */}
            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-medium text-gray-400">
          Message{" "}
          <span className="text-gray-600">(optionnel)</span>
        </label>
        <textarea
          name="message"
          rows={4}
          placeholder="Décrivez votre projet en quelques mots…"
          className={`mt-2 ${fieldCls} resize-none`}
        />
      </div>

      {/* Consentement RGPD */}
      <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3.5">
        <input
          type="checkbox"
          name="consent"
          id="homepage-form-consent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#C9A84C]"
        />
        <label htmlFor="homepage-form-consent" className="text-xs leading-relaxed text-gray-400">
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

      {/* Bouton */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#C9A84C] py-4 font-semibold text-white shadow-[0_4px_24px_rgba(201,168,76,0.2)] transition hover:bg-[#b8962e] hover:shadow-[0_4px_32px_rgba(201,168,76,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Envoi en cours…
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Envoyer le message
          </>
        )}
      </button>

    </form>
  );
}
