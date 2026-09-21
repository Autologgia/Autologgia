"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from "@/lib/analytics";
import {
  captureFirstTouchAttribution,
  clearAttribution,
} from "@/lib/attribution";

function getServerConsent() {
  return null;
}

/** Monté une fois dans le layout racine : capture l'attribution first-touch sur chaque page vue. */
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
