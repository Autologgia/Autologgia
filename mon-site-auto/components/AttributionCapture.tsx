"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getAnalyticsConsent, subscribeToAnalyticsConsent } from "@/lib/analytics";
import { captureFirstTouchAttribution, clearAttribution } from "@/lib/attribution";

function getServerConsent() {
  return null;
}

/**
 * Monté une fois dans le layout racine : capture l'attribution first-touch
 * dès que le consentement est accordé, et efface ce qui a été stocké s'il est
 * retiré. `useSyncExternalStore` permet de réagir au choix de la bannière
 * sans attendre un rechargement de page.
 */
export default function AttributionCapture() {
  const consent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    getAnalyticsConsent,
    getServerConsent,
  );

  useEffect(() => {
    if (consent === "granted") {
      captureFirstTouchAttribution();
      return;
    }

    if (consent === "denied") {
      clearAttribution();
    }
  }, [consent]);

  return null;
}
