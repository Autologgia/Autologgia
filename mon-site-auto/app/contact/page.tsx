import ContactForm from "@/components/ContactForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact – Autologgia",
  description:
    "Contactez l'équipe Autologgia pour toute question sur nos véhicules ou pour demander un rappel.",
};

// ── Adresse de l'entreprise ──────────────────────────────────────────────────
// Remplacez cette valeur par l'adresse exacte d'Autologgia.
// Vous pouvez aussi copier l'URL "Intégrer" directement depuis Google Maps
// (Partager → Intégrer une carte) et coller le src de l'iframe dans MAPS_EMBED.
const COMPANY_ADDRESS = "11B Chemin des Gourguettes, 06150 Cannes";
const MAPS_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(COMPANY_ADDRESS)}&output=embed`;
const MAPS_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(COMPANY_ADDRESS)}`;
// ────────────────────────────────────────────────────────────────────────────

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicule?: string; demande?: string; retourVehicule?: string }>;
}) {
  const { vehicule, demande, retourVehicule } = await searchParams;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white px-6 pb-16 pt-28">
        <div className="mx-auto max-w-6xl">
          {retourVehicule && (
            <a
              href={`/vehicules/${encodeURIComponent(retourVehicule)}`}
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-navy/55 transition hover:text-navy"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Retour au véhicule
            </a>
          )}

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">

            {/* ── COLONNE GAUCHE : formulaire ── */}
            <div className="text-center lg:text-left">
              <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
                Prendre contact
              </p>
              <h1 className="mt-3 font-heading text-5xl font-light text-navy">Contact</h1>
              <p className="mt-4 text-sm leading-6 text-navy/70 sm:text-base">
                Laissez-nous vos coordonnées. Nous vous recontacterons rapidement.
              </p>

              {vehicule && (
                <div className="mt-8 rounded-2xl border border-navy/20 bg-navy p-5">
                  <p className="text-sm text-gray-400">
                    {demande === "historique" ? "Historique demandé pour" : "Véhicule concerné"}
                  </p>
                  <p className="mt-1 text-xl font-light text-white">{vehicule}</p>
                </div>
              )}

              <ContactForm vehicule={vehicule} demande={demande} />
            </div>

            {/* ── COLONNE DROITE : carte Google Maps ── */}
            <div className="text-center lg:sticky lg:top-28 lg:text-left">
              <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
                Nous trouver
              </p>
              <h2 className="mt-3 font-heading text-5xl font-light text-navy">
                Notre localisation
              </h2>
              <p className="mt-4 text-sm leading-6 text-navy/70 sm:text-base">
                Trouvez-nous facilement à Cannes.
              </p>

              <div className="mt-8 overflow-hidden rounded-2xl border border-navy/15 shadow-sm">
                <iframe
                  src={MAPS_EMBED}
                  width="100%"
                  height="400"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localisation Autologgia"
                />
                <div className="flex items-center justify-center gap-3 border-t border-navy/10 bg-[#f8f7f5] px-5 py-4 text-center text-sm text-navy/70">
                  <svg
                    className="shrink-0 text-[#C9A84C]"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{COMPANY_ADDRESS}</span>
                </div>
              </div>

              <a
                href={MAPS_DIRECTIONS}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-6 py-4 font-semibold text-white transition hover:bg-[#b8962e]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
                Obtenir l&apos;itinéraire
              </a>

              {/* Infos contact rapides */}
              <div className="mt-6 space-y-3">
                <a
                  href="tel:+33664799424"
                  className="flex items-center gap-3 rounded-xl border border-navy/10 bg-[#f8f7f5] px-5 py-3.5 text-sm text-navy/70 transition hover:border-[#C9A84C]/40 hover:text-navy"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 3.12 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  +33 6 64 79 94 24
                </a>
                <div className="flex items-center gap-3 rounded-xl border border-navy/10 bg-[#f8f7f5] px-5 py-3.5 text-sm text-navy/70">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  autologgia.web@gmail.com
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
