import Image from "next/image";
import type { Metadata } from "next";
import { getRecentVehicles } from "@/lib/cms/vehicles";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecentVehiclesGrid from "@/components/RecentVehiclesGrid";
import HomepageContactForm from "@/components/HomepageContactForm";
import TrackedLink from "@/components/TrackedLink";
import GoogleReviewsSection from "@/components/GoogleReviewsSection";
import SplashScreen from "@/components/SplashScreen";
import type { Car } from "@/lib/types";

export const metadata: Metadata = {
  title: "Autologgia – Véhicules premium, achat, vente et estimation",
  description:
    "Achetez, vendez ou estimez votre véhicule premium avec Autologgia. Sélection rigoureuse, transparence totale, accompagnement personnalisé.",
};

// Filet de sécurité : le rafraîchissement rapide passe par revalidateTag
// (POST /api/cms/revalidate déclenché par Synergy). Cf. lib/cms/tags.ts.
export const revalidate = 300;

export default async function Home() {
  const cars: Car[] = await getRecentVehicles();

  return (
    <main className="min-h-screen">

      <SplashScreen />

      <Header />

      {/* ── HERO ── */}
      <section className="hero-section relative flex flex-col items-center justify-center overflow-hidden px-5 sm:px-6 pt-24 pb-16 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1929] via-[#0B1929] to-[#0a1520]" />
        <div className="relative z-10 w-full max-w-4xl">
          <p className="hero-eyebrow text-[10px] sm:text-xs font-medium uppercase tracking-[0.35em] sm:tracking-[0.5em] text-[#C9A84C]">
            Automobile premium
          </p>

          <h1 className="hero-title mt-4 sm:mt-6 font-heading font-light text-white">
            Véhicules d&apos;exception,{" "}
            <em className="italic">sélectionnés avec exigence</em>
          </h1>

          <p className="hero-desc mt-5 sm:mt-8 mx-auto max-w-xl leading-relaxed text-gray-400">
            Achetez, vendez ou estimez votre véhicule avec un accompagnement
            sérieux, transparent et haut de gamme.
          </p>

          <div className="hero-ctas mt-8 sm:mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/catalogue"
              className="w-full max-w-[18rem] sm:w-auto rounded-full bg-[#C9A84C] px-7 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-white transition hover:bg-[#b8962e]"
            >
              Voir les véhicules
            </a>
            <a
              href="/estimation"
              className="w-full max-w-[18rem] sm:w-auto rounded-full border border-white/25 px-7 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base font-medium text-white transition hover:border-white/50 hover:bg-white/5"
            >
              Estimer mon véhicule
            </a>
          </div>
        </div>

        {/* Desktop: texte + trait */}
        <div className="hero-scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 hidden flex-col items-center gap-2 text-gray-600 md:flex">
          <p className="text-xs uppercase tracking-widest">Découvrir</p>
          <div className="h-8 w-px animate-bounce bg-gradient-to-b from-gray-600 to-transparent" />
        </div>

        {/* Mobile only: double chevron en cascade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-6 sm:bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5 md:hidden"
        >
          <div className="animate-scroll-chevron motion-reduce:animate-none motion-reduce:opacity-30">
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
              <path d="M1 1L9 9L17 1" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div
            className="animate-scroll-chevron motion-reduce:animate-none motion-reduce:opacity-30"
            style={{ animationDelay: "280ms" }}
          >
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
              <path d="M1 1L9 9L17 1" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── DERNIÈRES ARRIVÉES ── */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
            Notre collection
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-4xl font-light text-navy md:text-5xl">
                Nos dernières arrivées
              </h2>
              <p className="mt-4 max-w-xl text-navy/60">
                Découvrez notre sélection exclusive de véhicules d&apos;exception,
                soigneusement choisis pour leur qualité, leur configuration et
                leur caractère unique.
              </p>
            </div>
            <a
              href="/catalogue"
              className="shrink-0 self-start rounded-full bg-[#C9A84C] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b8962e] sm:self-auto"
            >
              Voir tous les véhicules →
            </a>
          </div>

          <div className="mt-12">
            <RecentVehiclesGrid cars={cars} />
          </div>

          <div className="mt-12 text-center">
            <a
              href="/catalogue"
              className="inline-block rounded-full bg-[#C9A84C] px-10 py-4 font-semibold text-white transition hover:bg-[#b8962e]"
            >
              Voir tous les véhicules
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS CONFIANCE ── */}
      <section className="border-y border-[#e5e3dd] bg-surface-muted px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 text-center sm:grid-cols-3">
          {[
            { value: "100%", label: "Véhicules vérifiés" },
            { value: "24h", label: "Délai de réponse" },
            { value: "0€", label: "Frais d'estimation" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-heading text-4xl font-light text-[#C9A84C]">
                {value}
              </p>
              <p className="mt-2 text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES / EXPERTISE ── */}
      <section className="bg-surface-alt px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
            Notre expertise
          </p>
          <h2 className="mt-3 font-heading text-4xl font-light text-navy md:text-5xl">
            Ce que nous faisons pour vous
          </h2>
          <p className="mt-4 max-w-xl text-gray-500">
            Un accompagnement complet, de la recherche ciblée à la remise des clés,
            avec l&apos;exigence de l&apos;univers Porsche.
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                ),
                title: "Recherche personnalisée",
                text: "Recherche personnalisée du véhicule idéal, en France comme à l'étranger.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                ),
                title: "Expertise Porsche",
                text: "Formation spécialisée et expérience issue de l'univers Porsche, au service de chaque projet.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                ),
                title: "Financement & Assurance",
                text: "Solutions de financement et d'assurance avec nos partenaires de confiance.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                ),
                title: "Garanties adaptées",
                text: "Garanties adaptées à chaque véhicule pour sécuriser votre achat en toute sérénité.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                ),
                title: "Expertise technique",
                text: "Une expertise technique forgée chez Porsche, mise au service de vos projets automobiles.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                title: "Accompagnement complet",
                text: "Du premier contact à la remise des clés, avec transparence, exigence et suivi personnalisé.",
              },
            ].map(({ icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-navy/20 bg-navy p-8 transition hover:border-[#C9A84C]/50 hover:shadow-[0_4px_24px_rgba(201,168,76,0.12)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A84C]/15 text-[#C9A84C]">
                  {icon}
                </div>
                <h3 className="mt-5 font-heading text-xl font-medium text-white">
                  {title}
                </h3>
                <p className="mt-3 leading-relaxed text-gray-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOTRE HISTOIRE ── */}
      <section id="histoire" className="bg-navy-light px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-2xl">
              <Image
                src="/fondateurs.jpeg"
                alt="Les fondateurs d'Autologgia"
                width={640}
                height={480}
                className="w-full object-cover object-center"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
            </div>

            {/* LinkedIn fondateurs */}
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <a
                href="https://www.linkedin.com/in/julien-roux-autologgia/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:border-[#C9A84C]/50 hover:text-white"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                Julien Roux
              </a>
              <a
                href="https://www.linkedin.com/in/thomasr20/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:border-[#C9A84C]/50 hover:text-white"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                Thomas Roux
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
              Notre histoire
            </p>
            <h2 className="mt-3 font-heading text-4xl font-light text-white md:text-5xl">
              Deux frères, une passion
            </h2>
            <p className="mt-6 text-base leading-relaxed text-gray-400 text-justify">
              Né d&apos;une passion commune pour l&apos;automobile, Autologgia est avant
              tout une aventure fraternelle. Formés chez Porsche et certifiés en tant
              que techniciens experts après-vente, nous mettons notre expertise
              technique au service de chaque projet automobile.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-400 text-justify">
              L&apos;un apporte un œil vigilant sur la qualité mécanique et la
              préparation minutieuse de chaque véhicule. L&apos;autre excelle dans la
              relation client, la recherche ciblée et l&apos;accompagnement
              personnalisé. Ensemble, nous vous garantissons une expérience fiable,
              transparente et résolument haut de gamme.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Formation et expertise issue de l'univers Porsche",
                "Techniciens experts certifiés après-vente",
                "Accompagnement humain de A à Z",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex justify-center md:justify-start">
              <a
                href="/contact"
                className="rounded-full bg-[#C9A84C] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#b8962e]"
              >
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── ESTIMATION CTA ── */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
            Estimation gratuite
          </p>
          <h2 className="mt-4 font-heading text-4xl font-light text-navy md:text-5xl">
            Vendez votre véhicule au meilleur prix
          </h2>
          <p className="mt-6 max-w-xl mx-auto text-lg leading-relaxed text-navy/60">
            Remplissez quelques informations sur votre voiture. Notre équipe vous
            recontacte sous 24h avec une estimation sur mesure et un accompagnement
            personnalisé.
          </p>
          <a
            href="/estimation"
            className="mt-10 inline-block rounded-full bg-[#C9A84C] px-10 py-4 font-semibold text-white transition hover:bg-[#b8962e]"
          >
            Obtenir une estimation gratuite
          </a>
          <p className="mt-4 text-sm text-navy/40">
            Service gratuit · Sans engagement · Réponse sous 24h
          </p>
        </div>
      </section>

      <GoogleReviewsSection />

      {/* ── CONTACT ── */}
      <section id="contact" className="bg-navy-light px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2 md:items-start">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
              Contact
            </p>
            <h2 className="mt-3 font-heading text-4xl font-light text-white md:text-5xl">
              Un projet d&apos;achat, de vente ou d&apos;estimation ?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-gray-400">
              Contactez-nous pour discuter de votre projet automobile. Notre
              équipe vous répond rapidement avec un accompagnement personnalisé.
            </p>

            <div className="mt-8 space-y-4">
              <TrackedLink
                href="tel:+33664799424"
                eventName="click_phone"
                eventParameters={{ placement: "homepage" }}
                className="flex items-center gap-3 text-gray-300 transition hover:text-white"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-navy text-[#C9A84C]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 3.12 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                +33 6 64 79 94 24
              </TrackedLink>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-navy text-[#C9A84C]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                autologgia.web@gmail.com
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-navy text-[#C9A84C]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                France
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-navy p-8">
            <h3 className="font-heading text-2xl font-light text-white">
              Contacter l&apos;équipe
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Choisissez votre moyen de contact préféré.
            </p>

            {/* Boutons rapides */}
            <div className="mt-6 grid gap-3">
              <TrackedLink
                href="tel:+33664799424"
                eventName="click_phone"
                eventParameters={{ placement: "homepage" }}
                className="flex items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-8 py-4 font-semibold text-white transition hover:bg-[#b8962e]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 3.12 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Appeler maintenant
              </TrackedLink>

              <TrackedLink
                href="https://wa.me/33664799424?text=Bonjour%2C+je+souhaite+des+informations+sur+vos+v%C3%A9hicules."
                eventName="click_whatsapp"
                eventParameters={{ placement: "homepage" }}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full border border-[#25D366]/30 px-8 py-4 font-medium text-[#25D366] transition hover:border-[#25D366]/60 hover:bg-[#25D366]/5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
                WhatsApp
              </TrackedLink>
            </div>

            {/* Séparateur */}
            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-xs uppercase tracking-widest text-gray-600">ou</span>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            {/* Sous-titre formulaire */}
            <p className="text-sm text-gray-400">
              Envoyez-nous directement un message via le formulaire suivant.
            </p>

            {/* Formulaire premium */}
            <div className="mt-6">
              <HomepageContactForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
