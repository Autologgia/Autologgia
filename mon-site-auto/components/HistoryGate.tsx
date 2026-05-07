"use client";

import { useState } from "react";
import PortableTextContent from "@/components/PortableTextContent";
import type { PortableTextBlock } from "@portabletext/types";

type Phase = "unavailable" | "locked" | "form" | "unlocked";
type FormStatus = "idle" | "loading" | "error";

interface Props {
  carName: string;
  historyText?: PortableTextBlock[] | string;
  historyFileUrl?: string;
}

const inputCls =
  "mt-2 w-full rounded-xl border border-[#e5e3dd] bg-white px-4 py-3 text-navy outline-none transition focus:border-[#C9A84C]/60 placeholder:text-gray-400 text-sm";

export default function HistoryGate({ carName, historyText, historyFileUrl }: Props) {
  const hasHistory = !!(historyText || historyFileUrl);

  const [phase, setPhase] = useState<Phase>(hasHistory ? "locked" : "unavailable");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormStatus("loading");
    setErrorMessage("");

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          message: `Demande d'accès à l'historique du véhicule : ${carName}.`,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setPhase("unlocked");
      } else {
        setFormStatus("error");
        setErrorMessage(result.error ?? "Une erreur est survenue.");
      }
    } catch {
      setFormStatus("error");
      setErrorMessage("Impossible de contacter le serveur. Réessayez.");
    }
  }

  // ── Non disponible ──
  if (phase === "unavailable") {
    return (
      <div className="rounded-2xl border border-[#e5e3dd] bg-[#f8f7f5] px-8 py-7">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e5e3dd] bg-white text-navy/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <div>
            <p className="font-heading text-lg font-light text-navy">Historique du véhicule</p>
            <p className="mt-0.5 text-sm text-navy/50">L&apos;historique de ce véhicule sera bientôt disponible.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Verrouillé ──
  if (phase === "locked") {
    return (
      <div className="rounded-2xl border border-navy/10 bg-navy px-8 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-light text-white">Historique du véhicule</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-400">
              Accédez à l&apos;historique complet de ce véhicule en laissant vos coordonnées.
              Notre équipe vous confirme l&apos;accès rapidement.
            </p>
          </div>
          <button
            onClick={() => setPhase("form")}
            className="shrink-0 rounded-full bg-[#C9A84C] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#b8962e]"
          >
            Accéder à l&apos;historique →
          </button>
        </div>
      </div>
    );
  }

  // ── Formulaire ──
  if (phase === "form") {
    return (
      <div className="rounded-2xl border border-navy/10 bg-navy px-8 py-8">
        <h2 className="font-heading text-xl font-light text-white">Historique du véhicule</h2>
        <p className="mt-1 text-sm text-gray-400">
          Laissez vos coordonnées pour accéder à l&apos;historique complet.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {formStatus === "error" && (
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={formStatus === "loading"}
              className="flex-1 rounded-full bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b8962e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {formStatus === "loading" ? "Envoi…" : "Accéder à l'historique"}
            </button>
            <button
              type="button"
              onClick={() => setPhase("locked")}
              className="rounded-full border border-white/15 px-5 py-3 text-sm text-gray-400 transition hover:border-white/30 hover:text-white"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Déverrouillé ──
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-950/15 px-5 py-3 text-sm text-emerald-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Historique déverrouillé — merci pour votre confiance.
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#071A2D]/20">
        {/* Bannière titre — navy */}
        <div className="bg-[#071A2D] px-8 py-6">
          <h2 className="font-heading text-xl font-light text-white">Historique du véhicule</h2>
        </div>

        {/* Contenu — fond blanc, texte navy */}
        <div className="bg-white px-8 pb-8 pt-6 text-[#071A2D]">
          {historyText && (
            <PortableTextContent value={historyText} className="text-sm text-[#071A2D]" />
          )}

          {historyFileUrl && (
            <a
              href={historyFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b8962e]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Télécharger le rapport PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
