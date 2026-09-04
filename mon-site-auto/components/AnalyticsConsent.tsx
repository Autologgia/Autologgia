"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";
import {
  GA_MEASUREMENT_ID,
  type AnalyticsConsent as AnalyticsConsentValue,
  disableGoogleAnalytics,
  enableGoogleAnalytics,
  getAnalyticsConsent,
  saveAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from "@/lib/analytics";

function getServerAnalyticsConsent() {
  return null;
}

export default function AnalyticsConsent() {
  const consent = useSyncExternalStore<AnalyticsConsentValue | null>(
    subscribeToAnalyticsConsent,
    getAnalyticsConsent,
    getServerAnalyticsConsent,
  );
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  function acceptAnalytics() {
    enableGoogleAnalytics();
    saveAnalyticsConsent("granted");
    setPreferencesOpen(false);
  }

  function refuseAnalytics() {
    const analyticsWasLoaded = consent === "granted";

    disableGoogleAnalytics();
    saveAnalyticsConsent("denied");
    setPreferencesOpen(false);

    if (analyticsWasLoaded) {
      window.location.reload();
    }
  }

  return (
    <>
      {consent === "granted" && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}

      {(consent === null || preferencesOpen) && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="analytics-consent-title"
          aria-describedby="analytics-consent-description"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-4xl rounded-2xl border border-white/10 bg-navy px-5 py-5 text-white shadow-2xl sm:px-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p
                id="analytics-consent-title"
                className="font-heading text-xl font-medium text-white"
              >
                Mesure d&apos;audience
              </p>
              <p
                id="analytics-consent-description"
                className="mt-2 text-sm leading-relaxed text-gray-300"
              >
                Avec votre accord, Autologgia utilise Google Analytics 4 pour comprendre
                l&apos;utilisation du site et améliorer votre expérience. Aucun suivi Analytics
                n&apos;est chargé si vous refusez. Consultez notre{" "}
                <Link
                  href="/politique-confidentialite#cookies"
                  className="text-[#C9A84C] underline underline-offset-2 transition hover:text-[#d4b96a]"
                >
                  politique de confidentialité
                </Link>
                .
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={acceptAnalytics}
                className="min-w-36 rounded-full bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b8962e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              >
                Accepter
              </button>
              <button
                type="button"
                onClick={refuseAnalytics}
                className="min-w-36 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              >
                Refuser
              </button>
            </div>
          </div>
        </section>
      )}

      {!preferencesOpen && consent !== null && (
        <button
          type="button"
          onClick={() => setPreferencesOpen(true)}
          className="fixed bottom-4 left-4 z-[60] rounded-full border border-white/15 bg-navy/95 px-4 py-2 text-xs font-medium text-gray-300 shadow-lg backdrop-blur-md transition hover:border-[#C9A84C]/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
        >
          Gérer mes cookies
        </button>
      )}
    </>
  );
}
