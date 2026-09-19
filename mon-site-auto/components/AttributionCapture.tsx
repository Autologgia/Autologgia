"use client";

import { useEffect } from "react";
import { captureFirstTouchAttribution } from "@/lib/attribution";

/** Monté une fois dans le layout racine : capture l'attribution first-touch sur chaque page vue. */
export default function AttributionCapture() {
  useEffect(() => {
    captureFirstTouchAttribution();
  }, []);
  return null;
}
