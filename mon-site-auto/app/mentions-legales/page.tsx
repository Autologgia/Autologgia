import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Mentions légales – Autologgia",
  description:
    "Mentions légales du site Autologgia, édité par la société FRERES ROUX AUTO, SAS spécialisée dans le commerce de véhicules automobiles premium.",
  robots: { index: true, follow: true },
};

const UPDATED = "9 mai 2026";

export default function MentionsLegalesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">

        {/* ── Hero ── */}
        <div className="bg-navy-light px-6 pb-14 pt-28">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
              Informations légales
            </p>
            <h1 className="mt-3 font-heading text-4xl font-light text-white md:text-5xl">
              Mentions légales
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              Dernière mise à jour : {UPDATED}
            </p>
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="px-6 py-14">
          <div className="mx-auto max-w-3xl space-y-14">

            {/* 1. Éditeur */}
            <section>
              <SectionTitle n="1" title="Éditeur du site" />
              <dl className="mt-6 space-y-3.5">
                <InfoRow label="Raison sociale"              value="FRERES ROUX AUTO" />
                <InfoRow label="Forme juridique"             value="Société par actions simplifiée (SAS)" />
                <InfoRow label="SIREN"                       value="989 297 742" />
                <InfoRow label="SIRET"                       value="989 297 742 00011" />
                <InfoRow label="N° TVA intracommunautaire"   value="FR49989297742" />
                <InfoRow label="Activité principale"         value="Commerce de voitures et de véhicules automobiles légers – NAF 4511Z" />
                <InfoRow label="Date de création"            value="12 août 2025" />
                <InfoRow label="Siège social"                value="11B Chemin des Gourguettes, 06150 Cannes" />
              </dl>
            </section>

            {/* 2. Directeur de publication */}
            <section>
              <SectionTitle n="2" title="Directeur de la publication" />
              <p className="mt-5 leading-relaxed text-navy/70">
                Le directeur de la publication est <strong className="font-medium text-navy">Thomas ROUX</strong>,
                co-dirigeant de la société FRERES ROUX AUTO.
              </p>
            </section>

            {/* 3. Hébergeur */}
            <section>
              <SectionTitle n="3" title="Hébergeur du site" />
              <dl className="mt-6 space-y-3.5">
                <InfoRow label="Société"  value="Vercel Inc." />
                <InfoRow label="Adresse"  value="440 N Barranca Ave #4133, Covina, CA 91723, États-Unis" />
                <InfoRow label="Site web" value="vercel.com" />
              </dl>
              <p className="mt-5 text-sm leading-relaxed text-navy/60">
                Le site est développé avec Next.js, framework open-source édité par Vercel Inc. Le
                contenu éditorial (fiches véhicules) est géré via Sanity CMS (Sanity AS, Oslo,
                Norvège). Les e-mails transactionnels sont envoyés via Resend Inc. (San Francisco,
                CA, USA).
              </p>
            </section>

            {/* 4. Propriété intellectuelle */}
            <section>
              <SectionTitle n="4" title="Propriété intellectuelle" />
              <div className="mt-5 space-y-4 leading-relaxed text-navy/70">
                <p>
                  L'ensemble des éléments constituant ce site (textes, images, graphismes, logotypes,
                  icônes, logiciels) est la propriété exclusive de FRERES ROUX AUTO ou de ses
                  partenaires. Toute reproduction, représentation, modification, publication ou
                  adaptation, totale ou partielle, par quelque procédé que ce soit, est strictement
                  interdite sans l'accord préalable écrit de FRERES ROUX AUTO.
                </p>
                <p>
                  Les marques et logos des constructeurs automobiles présentés sur le site sont la
                  propriété exclusive de leurs titulaires respectifs. Leur mention n'implique aucun
                  lien de partenariat ou de représentation officielle.
                </p>
              </div>
            </section>

            {/* 5. Responsabilité */}
            <section>
              <SectionTitle n="5" title="Limitation de responsabilité" />
              <div className="mt-5 space-y-4 leading-relaxed text-navy/70">
                <p>
                  FRERES ROUX AUTO s'efforce d'assurer l'exactitude et la mise à jour des
                  informations diffusées sur ce site. Toutefois, la société ne peut garantir
                  l'exactitude, la complétude ou l'actualité des informations présentées et décline
                  toute responsabilité pour les erreurs ou omissions éventuelles.
                </p>
                <p>
                  Les informations relatives aux véhicules (caractéristiques, prix, disponibilité)
                  sont communiquées à titre indicatif et sont susceptibles d'évoluer sans préavis.
                  Elles ne constituent pas une offre contractuelle ferme.
                </p>
                <p>
                  La société ne saurait être tenue responsable des dommages directs ou indirects
                  résultant de l'accès au site, de son utilisation ou de l'impossibilité d'y accéder.
                </p>
              </div>
            </section>

            {/* 6. Données personnelles */}
            <section>
              <SectionTitle n="6" title="Données personnelles" />
              <p className="mt-5 leading-relaxed text-navy/70">
                Le traitement des données personnelles collectées sur ce site est détaillé dans
                notre{" "}
                <Link
                  href="/politique-confidentialite"
                  className="font-medium text-[#C9A84C] underline underline-offset-2 transition hover:text-[#b8962e]"
                >
                  politique de confidentialité
                </Link>
                , conformément au Règlement Général sur la Protection des Données (RGPD –
                Règlement UE 2016/679).
              </p>
            </section>

            {/* 7. Cookies */}
            <section>
              <SectionTitle n="7" title="Cookies" />
              <p className="mt-5 leading-relaxed text-navy/70">
                Ce site utilise uniquement des cookies techniques strictement nécessaires à son
                fonctionnement (gestion des sessions, préférences de navigation). Aucun cookie de
                tracking publicitaire ou d'analyse tiers n'est déposé sans votre consentement.
              </p>
            </section>

            {/* 8. Contact */}
            <section>
              <SectionTitle n="8" title="Contact" />
              <p className="mb-4 mt-5 leading-relaxed text-navy/70">
                Pour toute question relative au présent site ou à son contenu :
              </p>
              <dl className="space-y-3.5">
                <InfoRow label="Email"     value="autologgia.web@gmail.com" />
                <InfoRow label="Téléphone" value="+33 6 64 79 94 24" />
                <InfoRow label="Adresse"   value="11B Chemin des Gourguettes, 06150 Cannes" />
              </dl>
            </section>

            {/* Retour */}
            <div className="border-t border-[#e5e3dd] pt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-navy/50 transition hover:text-navy"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Retour à l&apos;accueil
              </Link>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-[#e5e3dd] pb-3">
      <span className="font-heading text-2xl font-light text-[#C9A84C]">{n}.</span>
      <h2 className="font-heading text-2xl font-light text-navy">{title}</h2>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-0">
      <dt className="w-full shrink-0 text-sm font-medium text-navy/50 sm:w-56">{label}</dt>
      <dd className="text-sm font-medium text-navy">{value}</dd>
    </div>
  );
}
