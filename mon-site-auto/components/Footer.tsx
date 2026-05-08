import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-navy px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Image
              src="/logo.png"
              alt="Autologgia"
              width={120}
              height={40}
              className="h-8 w-auto object-contain opacity-90"
            />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              Véhicules premium. Achat, vente et estimation avec
              transparence et exigence.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <nav className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-500 md:flex md:flex-wrap md:gap-x-8">
              <a href="/catalogue" className="transition hover:text-white">Catalogue</a>
              <a href="/estimation" className="transition hover:text-white">Estimation</a>
              <a href="/#histoire" className="transition hover:text-white">Notre histoire</a>
              <a href="/contact" className="transition hover:text-white">Contact</a>
            </nav>

            {/* Réseaux sociaux */}
            <div className="grid grid-cols-3 items-center gap-2 md:flex md:flex-wrap md:gap-3">
              <a
                href="https://www.instagram.com/autologgia/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-full border border-white/10 px-2 py-2 text-[11px] font-medium text-gray-400 transition hover:border-[#C9A84C]/40 hover:text-white md:gap-2 md:px-4 md:text-xs"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                Instagram
              </a>
              <a
                href="https://www.linkedin.com/company/autologgia/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-full border border-white/10 px-2 py-2 text-[11px] font-medium text-gray-400 transition hover:border-[#C9A84C]/40 hover:text-white md:gap-2 md:px-4 md:text-xs"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                LinkedIn
              </a>
              <a
                href="https://www.leboncoin.fr/boutique/7225147/autologgia.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-full border border-white/10 px-2 py-2 text-[11px] font-medium text-gray-400 transition hover:border-[#C9A84C]/40 hover:text-white md:gap-2 md:px-4 md:text-xs"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12h8M12 8v8" />
                </svg>
                LeBonCoin
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/5 pt-8 text-xs text-gray-600 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Autologgia – FRERES ROUX AUTO. Tous droits réservés.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-1.5">
            <a href="/mentions-legales" className="transition hover:text-gray-400">Mentions légales</a>
            <a href="/politique-confidentialite" className="transition hover:text-gray-400">Politique de confidentialité</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
