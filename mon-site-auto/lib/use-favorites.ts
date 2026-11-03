"use client";
import {useMemo, useSyncExternalStore} from "react";

const KEY = "autologgia-favorites";
const EVENT = "autologgia-favorites-change";
let memory: string | null = null;
function snapshot() {
  if (memory !== null) return memory;
  try { return localStorage.getItem(KEY) ?? "[]"; } catch { return "[]"; }
}
function parse(value: string): string[] {
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; }
  catch { return []; }
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) { memory = null; listener(); } };
  window.addEventListener("storage", storage);
  window.addEventListener(EVENT, listener);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener(EVENT, listener); };
}
export function useFavorites(): [string[], (update: (previous: string[]) => string[]) => void] {
  const value = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const favorites = useMemo(() => parse(value), [value]);
  function updateFavorites(update: (previous: string[]) => string[]) {
    const next = JSON.stringify(update(parse(snapshot())));
    try { localStorage.setItem(KEY, next); memory = null; } catch { memory = next; }
    window.dispatchEvent(new Event(EVENT));
  }
  return [favorites, updateFavorites];
}
