"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import TrackedLink from "@/components/TrackedLink";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/estimation", label: "Estimation" },
  { href: "/#histoire", label: "Notre histoire" },
  { href: "/contact", label: "Contact" },
];

// ── Liens réseaux sociaux ────────────────────────────────────────────────────
// Remplacez ces URLs par les vraies pages de l'entreprise
const INSTAGRAM_URL = "https://www.instagram.com/autologgia/";
const LEBONCOIN_URL  = "https://www.leboncoin.fr/boutique/autologgia/";
const WHATSAPP_URL   = "https://wa.me/33664799424?text=Bonjour%2C+je+souhaite+des+informations+sur+vos+v%C3%A9hicules.";
const MOBILE_MENU_EVENT = "autologgia-mobile-menu";
// ────────────────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string): boolean {
  if (href.startsWith("/#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setMenuOpen(false);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(MOBILE_MENU_EVENT, { detail: { open: menuOpen } })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(MOBILE_MENU_EVENT, { detail: { open: false } })
      );
    };
  }, [menuOpen]);

  return (
    <>
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="fixed left-0 top-0 z-40 w-full border-b border-white/5 bg-navy/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Autologgia"
              width={240}
              height={84}
              className="h-20 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 text-sm md:flex">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative pb-1.5 transition-colors duration-200 hover:text-white ${active ? "text-white" : "text-gray-400"}`}
                >
                  {label}
                  <span
                    className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 rounded-full bg-[#C9A84C] transition-all duration-300 ${active ? "w-full" : "w-0"}`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Desktop phone CTA */}
          <TrackedLink
            href="tel:+33664799424"
            eventName="click_phone"
            eventParameters={{ placement: "header" }}
            className="hidden rounded-full bg-[#C9A84C] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#b8962e] md:block"
          >
            +33 6 64 79 94 24
          </TrackedLink>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            className="flex flex-col items-center justify-center gap-1.5 p-2 md:hidden"
          >
            <span className={`block h-0.5 w-5 bg-white transition-all duration-200 ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-white transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-white transition-all duration-200 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </nav>
      </header>

      {/* ── BACKDROP mobile ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ── DRAWER mobile ───────────────────────────────────────────────────── */}
      <div
        className="fixed right-0 top-0 z-[50] flex h-dvh w-[88vw] max-w-sm flex-col bg-[#0B1929] shadow-2xl transition-transform duration-300 ease-out md:hidden"
        style={{ transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}
        aria-hidden={!menuOpen}
      >
        {/* En-tête du drawer */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <Link href="/" onClick={close}>
            <Image
              src="/logo.png"
              alt="Autologgia"
              width={160}
              height={56}
              className="h-12 w-auto object-contain"
            />
          </Link>
          <button
            onClick={close}
            aria-label="Fermer le menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-gray-400 transition hover:border-white/30 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Liens de navigation */}
        <nav className="flex flex-col px-6 pt-2">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={`flex items-center justify-between border-b border-white/8 py-5 text-lg font-semibold tracking-[0.01em] transition hover:text-white ${
                  active ? "text-white" : "text-gray-200"
                }`}
              >
                {label}
                {active && <span className="h-2 w-2 shrink-0 rounded-full bg-[#C9A84C]" />}
              </Link>
            );
          })}
        </nav>

        {/* Espace flexible */}
        <div className="flex-1" />

        {/* Bouton téléphone */}
        <div className="px-6 pb-4">
          <TrackedLink
            href="tel:+33664799424"
            eventName="click_phone"
            eventParameters={{ placement: "header" }}
            className="flex items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-6 py-4 font-semibold text-white transition hover:bg-[#b8962e]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 3.12 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            +33 6 64 79 94 24
          </TrackedLink>
        </div>

        {/* Réseaux sociaux */}
        <div className="grid grid-cols-3 gap-3 px-6 pb-8">
          {/* Instagram */}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-xs text-gray-400 transition hover:border-pink-500/40 hover:text-pink-400"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
            Instagram
          </a>

          {/* WhatsApp */}
          <TrackedLink
            href={WHATSAPP_URL}
            eventName="click_whatsapp"
            eventParameters={{ placement: "header" }}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-xs text-gray-400 transition hover:border-[#25D366]/40 hover:text-[#25D366]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
            </svg>
            WhatsApp
          </TrackedLink>

          {/* Leboncoin */}
          <a
            href={LEBONCOIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-xs text-gray-400 transition hover:border-[#F56B2A]/40 hover:text-[#F56B2A]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
              <text
                x="12"
                y="15.5"
                textAnchor="middle"
                fill="currentColor"
                fontSize="7"
                fontWeight="700"
                fontFamily="sans-serif"
              >
                lbc
              </text>
            </svg>
            Leboncoin
          </a>
        </div>
      </div>
    </>
  );
}
