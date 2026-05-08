"use client";

import { useRef, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const inputCls =
  "w-full rounded-xl border border-[#e5e3dd] bg-white px-4 py-3 text-navy outline-none transition focus:border-[#C9A84C]/60 placeholder:text-gray-400";

const selectCls =
  "w-full rounded-xl border border-[#e5e3dd] bg-white px-4 py-3 text-navy outline-none transition focus:border-[#C9A84C]/60 appearance-none";

const labelCls = "text-sm font-medium text-gray-300";

const MAX_PHOTOS = 4;
const MAX_PHOTO_MB = 3;

type PhotoData = { filename: string; content: string };

async function filesToBase64(files: FileList): Promise<PhotoData[]> {
  const result: PhotoData[] = [];
  const allowed = Array.from(files).slice(0, MAX_PHOTOS);
  for (const file of allowed) {
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) continue;
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    result.push({ filename: file.name, content: base64 });
  }
  return result;
}

export default function EstimateForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const form = e.currentTarget;
    const get = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value ?? "";

    const files = fileInputRef.current?.files;
    let photos: PhotoData[] = [];
    try {
      if (files && files.length > 0) {
        photos = await filesToBase64(files);
      }
    } catch {
      // photos silently skipped if conversion fails
    }

    const data = {
      brand: get("brand"),
      model: get("model"),
      year: get("year"),
      mileage: get("mileage"),
      power: get("power"),
      fuel: get("fuel"),
      transmission: get("transmission"),
      version: get("version"),
      etat: get("etat"),
      localisation: get("localisation"),
      phone: get("phone"),
      email: get("email"),
      message: get("message"),
      website: get("website"),
      photos,
    };

    try {
      const res = await fetch("/api/estimation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        setStatus("success");
        form.reset();
        setPhotoCount(0);
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
      <div className="rounded-2xl border border-navy/20 bg-navy p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-900/30 text-xl text-emerald-400">
          ✓
        </div>
        <h3 className="mt-4 text-xl font-semibold text-white">Demande reçue</h3>
        <p className="mt-2 text-gray-400">
          Nous analysons votre demande et vous recontactons sous 24h.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-navy/20 bg-navy p-8">
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

      {/* ── Véhicule ── */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">Votre véhicule</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Marque *</label>
          <input type="text" name="brand" required className={`mt-2 ${inputCls}`} placeholder="ex : Porsche" />
        </div>
        <div>
          <label className={labelCls}>Modèle *</label>
          <input type="text" name="model" required className={`mt-2 ${inputCls}`} placeholder="ex : 911 Carrera" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Année *</label>
          <input
            type="number"
            name="year"
            required
            min="1950"
            max={new Date().getFullYear()}
            className={`mt-2 ${inputCls}`}
            placeholder="2020"
          />
        </div>
        <div>
          <label className={labelCls}>Kilométrage *</label>
          <input
            type="number"
            name="mileage"
            required
            min="0"
            className={`mt-2 ${inputCls}`}
            placeholder="45 000"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Puissance (ch) *</label>
          <input
            type="number"
            name="power"
            required
            min="1"
            max="2000"
            className={`mt-2 ${inputCls}`}
            placeholder="ex : 450"
          />
        </div>
        <div>
          <label className={labelCls}>Carburant *</label>
          <div className="relative mt-2">
            <select name="fuel" required className={selectCls} defaultValue="">
              <option value="" disabled>Sélectionner…</option>
              <option value="essence">Essence</option>
              <option value="diesel">Diesel / Gasoil</option>
              <option value="hybride">Hybride</option>
              <option value="electrique">Électrique</option>
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Transmission *</label>
        <div className="relative mt-2">
          <select name="transmission" required className={selectCls} defaultValue="">
            <option value="" disabled>Sélectionner…</option>
            <option value="automatique">Automatique</option>
            <option value="manuelle">Manuelle</option>
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      <div>
        <label className={labelCls}>Version / Finition</label>
        <input type="text" name="version" className={`mt-2 ${inputCls}`} placeholder="ex : S, GT3, AMG Line… (optionnel)" />
      </div>

      <div>
        <label className={labelCls}>État général *</label>
        <div className="relative mt-2">
          <select name="etat" required className={selectCls} defaultValue="">
            <option value="" disabled>Sélectionner…</option>
            <option value="excellent">Excellent – comme neuf</option>
            <option value="bon">Bon – entretenu régulièrement</option>
            <option value="correct">Correct – quelques défauts mineurs</option>
            <option value="a_reviser">À réviser – nécessite des travaux</option>
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      {/* ── Photos ── */}
      <div>
        <label className={labelCls}>Photos du véhicule</label>
        <p className="mb-2 mt-1 text-xs text-gray-500">
          Optionnel · Jusqu&apos;à {MAX_PHOTOS} photos · {MAX_PHOTO_MB} Mo max par photo (JPEG, PNG)
        </p>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#e5e3dd] bg-[#f8f7f5] px-4 py-6 text-center transition hover:border-[#C9A84C]/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#C9A84C]">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-sm text-navy/60">
            {photoCount > 0
              ? `${photoCount} photo${photoCount > 1 ? "s" : ""} sélectionnée${photoCount > 1 ? "s" : ""}`
              : "Cliquez pour ajouter des photos"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => setPhotoCount(e.target.files?.length ?? 0)}
          />
        </label>
      </div>

      {/* ── Contact ── */}
      <p className="pt-2 text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">Vos coordonnées</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Téléphone *</label>
          <input
            type="tel"
            name="phone"
            required
            className={`mt-2 ${inputCls}`}
            placeholder="+33 6 00 00 00 00"
          />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            name="email"
            className={`mt-2 ${inputCls}`}
            placeholder="votre@email.com (optionnel)"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Localisation</label>
        <input
          type="text"
          name="localisation"
          className={`mt-2 ${inputCls}`}
          placeholder="Ville ou département (optionnel)"
        />
      </div>

      <div>
        <label className={labelCls}>Message complémentaire</label>
        <textarea
          name="message"
          rows={4}
          className={`mt-2 ${inputCls}`}
          placeholder="Informations supplémentaires sur le véhicule… (optionnel)"
        />
      </div>

      {/* Consentement RGPD */}
      <div className="flex items-start gap-3 rounded-xl border border-[#e5e3dd] bg-[#f8f7f5] px-4 py-3.5">
        <input
          type="checkbox"
          name="consent"
          id="estimate-form-consent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#C9A84C]"
        />
        <label htmlFor="estimate-form-consent" className="text-xs leading-relaxed text-navy/60">
          J&apos;accepte que mes données soient utilisées dans le cadre de ma demande conformément à la{" "}
          <a
            href="/politique-confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C9A84C] underline underline-offset-2 transition hover:text-[#b8962e]"
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
        {status === "loading" ? "Envoi en cours…" : "Demander une estimation gratuite"}
      </button>
    </form>
  );
}
