import EstimateForm from "@/components/EstimateForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Estimation véhicule – Autologgia",
  description:
    "Faites estimer votre véhicule gratuitement. Notre équipe vous recontacte sous 24h avec une estimation personnalisée et un accompagnement complet.",
};

export default function EstimationPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white px-6 pb-16 pt-28">
        <div className="mx-auto max-w-2xl">

          <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
            Estimation gratuite
          </p>
          <h1 className="mt-3 font-heading text-5xl font-light text-navy">
            Faites estimer votre véhicule
          </h1>
          <p className="mt-4 text-navy/70">
            Remplissez le formulaire ci-dessous. Notre équipe vous recontacte sous 24h
            avec une estimation personnalisée et un accompagnement complet.
          </p>

          <div className="mt-8 grid gap-6 rounded-2xl border border-white/5 bg-navy p-6 text-sm text-gray-300 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-[#C9A84C]">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
              </svg>
              <p>Remplissez le formulaire en quelques secondes</p>
            </div>
            <div className="flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-[#C9A84C]">
                <path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
              </svg>
              <p>Nous analysons votre demande sous 24h</p>
            </div>
            <div className="flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-[#C9A84C]">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p>Estimation personnalisée, sans engagement</p>
            </div>
          </div>

          <div className="mt-8">
            <EstimateForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
