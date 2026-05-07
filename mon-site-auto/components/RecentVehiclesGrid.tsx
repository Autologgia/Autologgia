"use client";

import { useState, useEffect, useRef } from "react";
import VehicleCard from "@/components/VehicleCard";
import type { Car } from "@/lib/types";

const FAVORITES_KEY = "autologgia-favorites";
const ROTATE_MS = 2200;

export default function RecentVehiclesGrid({ cars }: { cars: Car[] }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { setVisible(true); io.disconnect(); }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Auto-rotation — always scheduled, CSS hides the carousel on mobile
  useEffect(() => {
    if (reducedMotion || cars.length < 2) return;
    timerRef.current = setInterval(
      () => setActiveIndex(p => (p + 1) % cars.length),
      ROTATE_MS
    );
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [reducedMotion, cars.length]);

  const goTo = (i: number) => {
    setActiveIndex(i);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (!reducedMotion && cars.length >= 2) {
      timerRef.current = setInterval(
        () => setActiveIndex(p => (p + 1) % cars.length),
        ROTATE_MS
      );
    }
  };

  const toggleFavorite = (slug: string) => {
    setFavorites(prev => {
      const next = prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug];
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  if (cars.length === 0) {
    return (
      <p className="text-center text-gray-400 py-12">
        Aucun véhicule disponible pour le moment.
      </p>
    );
  }

  const n = cars.length;

  // Visual position in the 3D space relative to active card
  const getPos = (i: number): "center" | "left" | "right" => {
    if (i === activeIndex) return "center";
    if (i === (activeIndex + 1) % n) return "right";
    return "left";
  };

  // Inline styles for each 3D position
  const posStyle = (pos: "center" | "left" | "right") => {
    if (pos === "center") {
      return {
        transform: "translateX(-50%) translateZ(0px) rotateY(0deg) scale(1)",
        opacity: 1,
        zIndex: 3,
        filter: "none",
      };
    }
    const side = pos === "right" ? 1 : -1;
    return {
      // translateX(calc(-50% + Xpx)): centers the card then shifts it sideways
      transform: `translateX(calc(-50% + ${side * 333}px)) translateZ(-130px) rotateY(${-side * 18}deg) scale(0.85)`,
      opacity: 0.72,
      zIndex: 2,
      filter: "brightness(0.68) saturate(0.85)",
    };
  };

  return (
    <div ref={gridRef}>

      {/* ── Mobile + fallback grid (inchangé) ─────────────────────── */}
      {/* lg:hidden when 3 cars — the 3D carousel takes over on desktop */}
      <div className={`grid gap-6 sm:grid-cols-2 ${n >= 3 ? "lg:hidden" : ""}`}>
        {cars.map((car, i) => (
          <div
            key={car.slug}
            style={visible ? { animationDelay: `${i * 150}ms` } : undefined}
            className={visible ? "animate-fade-slide-up" : "opacity-0"}
          >
            <VehicleCard
              car={car}
              isFavorite={favorites.includes(car.slug)}
              onToggleFavorite={toggleFavorite}
            />
          </div>
        ))}
      </div>

      {/* ── Desktop 3D carousel (uniquement ≥ 3 véhicules, ≥ lg) ──── */}
      {n >= 3 && (
        <div className="hidden lg:block">

          {/* Stage avec perspective 3D */}
          <div
            className="relative"
            style={{
              perspective: "1400px",
              perspectiveOrigin: "50% 40%",
              height: "490px",
            }}
          >
            {cars.map((car, i) => {
              const pos = getPos(i);
              return (
                <div
                  key={car.slug}
                  onClick={() => pos !== "center" && goTo(i)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    width: "360px",
                    cursor: pos !== "center" ? "pointer" : "default",
                    transition: reducedMotion
                      ? "none"
                      : "transform 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.75s ease, filter 0.75s ease",
                    willChange: "transform, opacity",
                    ...posStyle(pos),
                  }}
                >
                  <VehicleCard
                    car={car}
                    isFavorite={favorites.includes(car.slug)}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              );
            })}
          </div>

          {/* Indicateurs de navigation */}
          <div className="flex justify-center gap-3 mt-5">
            {cars.map((car, i) => (
              <button
                key={car.slug}
                onClick={() => goTo(i)}
                aria-label={`Afficher ${car.name}`}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? "h-2 w-8 bg-[#C9A84C]"
                    : "h-2 w-2 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
