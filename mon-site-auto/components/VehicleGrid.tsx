"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Car } from "@/lib/types";
import { getCarPriceValue, parseNumericValue } from "@/lib/format";
import VehicleCard from "./VehicleCard";

const STATUS_OPTIONS = [
  { label: "Statut : tous les véhicules", value: "tous" },
  { label: "Disponible", value: "disponible" },
  { label: "En préparation", value: "en_preparation" },
  { label: "Réservé", value: "reserve" },
  { label: "Vendu", value: "vendu" },
];

const MOBILE_STATUS_OPTIONS = [
  { label: "Statut", value: "tous" },
  ...STATUS_OPTIONS.slice(1),
];

const SORT_OPTIONS = [
  { label: "Tri : par défaut", value: "defaut" },
  { label: "Plus récent", value: "recent" },
  { label: "Plus ancien", value: "ancien" },
  { label: "Prix croissant", value: "prix_asc" },
  { label: "Prix décroissant", value: "prix_desc" },
  { label: "Année croissante", value: "annee_asc" },
  { label: "Année décroissante", value: "annee_desc" },
];

const MOBILE_SORT_OPTIONS = [
  { label: "Tri", value: "defaut" },
  ...SORT_OPTIONS.slice(1),
];

const STATUS_PRIORITY: Record<string, number> = {
  disponible: 0,
  occasion: 0,
  neuf: 0,
  en_preparation: 1,
  reserve: 2,
  vendu: 3,
};

function normalizeStatus(status?: string): string {
  if (!status) return "";
  if (status === "occasion" || status === "neuf") return "disponible";
  return status;
}

function getStatusPriority(status?: string): number {
  return STATUS_PRIORITY[normalizeStatus(status)] ?? 4;
}

const selectClass =
  "w-full rounded-xl border border-[#071A2D]/40 bg-white pl-4 pr-10 py-3 text-sm text-[#071A2D] outline-none transition focus:border-[#C9A84C]/60 appearance-none cursor-pointer md:w-auto";

export default function VehicleGrid({ cars }: { cars: Car[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("tous");
  const [brand, setBrand] = useState("Toutes");
  const [model, setModel] = useState("Tous");
  const [sort, setSort] = useState("defaut");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [forceRevealCards, setForceRevealCards] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("autologgia-favorites");
      if (saved) setFavorites(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const navigation = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isBackNavigation = navigation?.type === "back_forward";
      const isReturningFromVehicle =
        sessionStorage.getItem("autologgia-returning-from-vehicle") === "1";

      if (isBackNavigation || isReturningFromVehicle) {
        setForceRevealCards(true);
        sessionStorage.removeItem("autologgia-returning-from-vehicle");
      }
    } catch {}
  }, []);

  function toggleFavorite(slug: string) {
    setFavorites((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug];
      try {
        localStorage.setItem("autologgia-favorites", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function handleBrandChange(newBrand: string) {
    setBrand(newBrand);
    setModel("Tous");
  }

  function reset() {
    setQuery("");
    setStatus("tous");
    setBrand("Toutes");
    setModel("Tous");
    setSort("defaut");
    setShowFavoritesOnly(false);
  }

  const indexMap = useMemo(
    () => new Map(cars.map((car, i) => [car.slug, i])),
    [cars]
  );

  const brands = useMemo(() => {
    const unique = [
      ...new Set(cars.map((c) => c.brand).filter(Boolean) as string[]),
    ].sort();
    return unique;
  }, [cars]);

  const models = useMemo(() => {
    const pool = brand === "Toutes" ? cars : cars.filter((c) => c.brand === brand);
    const unique = [
      ...new Set(pool.map((c) => c.model).filter(Boolean) as string[]),
    ].sort();
    return unique;
  }, [cars, brand]);

  const processedCars = useMemo(() => {
    const filtered = cars.filter((car) => {
      if (query && !car.name.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (status !== "tous" && normalizeStatus(car.status) !== status)
        return false;
      if (brand !== "Toutes" && car.brand !== brand) return false;
      if (model !== "Tous" && car.model !== model) return false;
      if (showFavoritesOnly && !favorites.includes(car.slug)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const ai = indexMap.get(a.slug) ?? 0;
      const bi = indexMap.get(b.slug) ?? 0;
      switch (sort) {
        case "recent":
          return ai - bi;
        case "ancien":
          return bi - ai;
        case "prix_asc":
          return (getCarPriceValue(a.numericPrice, a.price) ?? 0) - (getCarPriceValue(b.numericPrice, b.price) ?? 0);
        case "prix_desc":
          return (getCarPriceValue(b.numericPrice, b.price) ?? 0) - (getCarPriceValue(a.numericPrice, a.price) ?? 0);
        case "annee_asc":
          return (parseNumericValue(a.year) ?? 0) - (parseNumericValue(b.year) ?? 0);
        case "annee_desc":
          return (parseNumericValue(b.year) ?? 0) - (parseNumericValue(a.year) ?? 0);
        default: {
          const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
          return statusDiff !== 0 ? statusDiff : ai - bi;
        }
      }
    });
  }, [cars, query, status, brand, model, sort, showFavoritesOnly, favorites, indexMap]);

  const activeCount = [
    query ? 1 : 0,
    status !== "tous" ? 1 : 0,
    brand !== "Toutes" ? 1 : 0,
    model !== "Tous" ? 1 : 0,
    sort !== "defaut" ? 1 : 0,
    showFavoritesOnly ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Search bar — */}
      <div className="relative mb-4">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#071A2D]/40"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un modèle, une marque…"
          className="w-full rounded-xl border border-[#071A2D]/40 bg-white py-3 pl-11 pr-4 text-sm text-[#071A2D] outline-none transition placeholder:text-[#071A2D]/40 focus:border-[#C9A84C]/60"
        />
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-2 items-center gap-3 pb-1 md:flex md:overflow-x-auto">
        {/* Statut */}
        <div className="relative min-w-0 md:shrink-0">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${selectClass} md:hidden`}
          >
            {MOBILE_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${selectClass} hidden md:block`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#071A2D]/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </div>

        {/* Marque */}
        {brands.length > 0 && (
          <div className="relative min-w-0 md:shrink-0">
            <select
              value={brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className={`${selectClass} md:hidden`}
            >
              <option value="Toutes">Marque</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className={`${selectClass} hidden md:block`}
            >
              <option value="Toutes">Marque : toutes les marques</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#071A2D]/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        )}

        {/* Modèle — visible uniquement si une marque est sélectionnée */}
        {models.length > 0 && (
          <div className={`relative min-w-0 md:shrink-0 ${brand === "Toutes" ? "hidden md:block" : ""}`}>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={`${selectClass} md:hidden`}
            >
              <option value="Tous">Modèle</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={`${selectClass} hidden md:block`}
            >
              <option value="Tous">Modèle : tous les modèles</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#071A2D]/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        )}

        {/* Tri */}
        <div className="relative min-w-0 md:shrink-0">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={`${selectClass} md:hidden`}
          >
            {MOBILE_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={`${selectClass} hidden md:block`}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#071A2D]/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </div>

        {/* Favoris */}
        <button
          onClick={() => setShowFavoritesOnly((v) => !v)}
          className={`${brand === "Toutes" ? "col-span-1" : "col-span-2"} flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm transition md:col-span-1 md:w-auto md:shrink-0 ${
            showFavoritesOnly
              ? "border-[#C9A84C]/60 bg-[#C9A84C]/10 text-[#C9A84C]"
              : "border-[#071A2D]/40 bg-white text-[#071A2D]/60 hover:border-[#C9A84C]/60 hover:text-[#071A2D]"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={showFavoritesOnly ? "#C9A84C" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Favoris
          {favorites.length > 0 && (
            <span className="rounded-full bg-[#C9A84C]/20 px-1.5 py-0.5 text-xs text-[#C9A84C]">
              {favorites.length}
            </span>
          )}
        </button>

        {/* Reset */}
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="col-span-2 text-sm text-gray-400 underline underline-offset-2 transition hover:text-gray-700 md:col-span-1 md:shrink-0"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="mb-6 mt-5 text-sm text-gray-500">
        {processedCars.length} véhicule{processedCars.length !== 1 ? "s" : ""}
        {activeCount > 0 ? " correspondant à votre recherche" : ""}
      </p>

      {/* Grid */}
      {processedCars.length === 0 ? (
        <div className="rounded-2xl border border-[#e5e3dd] bg-surface-muted py-16 text-center">
          <p className="text-gray-400">Aucun véhicule ne correspond à vos critères.</p>
          <button
            onClick={reset}
            className="mt-4 text-sm text-[#C9A84C] underline underline-offset-2 hover:text-[#b8962e]"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {processedCars.map((car, i) => (
            <AnimatedVehicleCard
              key={car.slug}
              car={car}
              gridIndex={i}
              isFavorite={favorites.includes(car.slug)}
              onToggleFavorite={toggleFavorite}
              forceVisible={forceRevealCards}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Scroll-reveal wrapper ──────────────────────────────────────────────────
// Desktop: cards in the same row (3 columns) stagger left→right (0 / 100 / 200 ms).
// Mobile : each card triggers individually with no stagger.
// The delay is read once at mount via matchMedia, stored in a ref so it's
// stable even if the component re-renders before becoming visible.
function AnimatedVehicleCard({
  car,
  gridIndex,
  isFavorite,
  onToggleFavorite,
  forceVisible,
}: {
  car: Car;
  gridIndex: number;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
  forceVisible: boolean;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const delayRef = useRef(0);

  useEffect(() => {
    if (forceVisible) {
      setVisible(true);
      return;
    }

    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    delayRef.current = isDesktop ? (gridIndex % 3) * 100 : 0;

    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.06, rootMargin: "0px 0px -24px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [forceVisible, gridIndex]);

  return (
    <div
      ref={wrapRef}
      style={{
        opacity:   visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: visible
          ? `opacity 0.55s ease ${delayRef.current}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delayRef.current}ms`
          : "none",
      }}
    >
      <VehicleCard
        car={car}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}
