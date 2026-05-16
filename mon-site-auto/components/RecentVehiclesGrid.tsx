"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import VehicleCard from "@/components/VehicleCard";
import type { Car } from "@/lib/types";

const FAVORITES_KEY   = "autologgia-favorites";
const ROTATE_MS       = 2200;
const RESUME_MS       = 10_000;
const DRAG_THRESHOLD  = 50;   // px — minimum drag to trigger navigation
const DRAG_INTENT     = 8;    // px — minimum movement to be considered a drag
const PRESS_ANIM_MS   = 440;  // duration of the center-card press animation

export default function RecentVehiclesGrid({ cars }: { cars: Car[] }) {
  const [favorites, setFavorites]       = useState<string[]>([]);
  const [visible, setVisible]           = useState(false);
  const [activeIndex, setActiveIndex]   = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pressAnim, setPressAnim]       = useState(false);
  const [isDragging, setIsDragging]     = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [carouselDims, setCarouselDims] = useState({ cardW: 360, offset: 333 });

  const gridRef       = useRef<HTMLDivElement>(null);
  const autoplayRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef       = useRef({ startX: 0, active: false, moved: false });

  // Stable refs — avoids stale closures inside setInterval / setTimeout
  const carsLengthRef     = useRef(cars.length);
  const reducedMotionRef  = useRef(reducedMotion);
  useEffect(() => { carsLengthRef.current = cars.length; }, [cars.length]);
  useEffect(() => { reducedMotionRef.current = reducedMotion; }, [reducedMotion]);

  // ── Favorites ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {}
  }, []);

  // ── prefers-reduced-motion ─────────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ── Dimensions du carousel : tablettes (< 1024px) vs desktop ──────────────
  useEffect(() => {
    function update() {
      setCarouselDims(window.innerWidth < 1024
        ? { cardW: 260, offset: 200 }
        : { cardW: 360, offset: 333 }
      );
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── IntersectionObserver (fade-in) ─────────────────────────────────────────
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ── Autoplay helpers ───────────────────────────────────────────────────────
  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) { clearInterval(autoplayRef.current); autoplayRef.current = null; }
  }, []);

  const startAutoplay = useCallback(() => {
    if (reducedMotionRef.current || carsLengthRef.current < 2) return;
    stopAutoplay();
    autoplayRef.current = setInterval(
      () => setActiveIndex(p => (p + 1) % carsLengthRef.current),
      ROTATE_MS
    );
  }, [stopAutoplay]);

  // Schedule autoplay resumption after RESUME_MS inactivity
  const scheduleResume = useCallback(() => {
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(startAutoplay, RESUME_MS);
  }, [startAutoplay]);

  // Initial autoplay — runs on mount, respects reducedMotion
  useEffect(() => {
    if (reducedMotion || cars.length < 2) return;
    startAutoplay();
    return () => {
      stopAutoplay();
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, [reducedMotion, cars.length, startAutoplay, stopAutoplay]);

  // ── User interaction entry point ───────────────────────────────────────────
  // Any user touch: stop autoplay, reset 10-second resume timer
  const interact = useCallback((newIndex?: number) => {
    if (newIndex !== undefined) setActiveIndex(newIndex);
    stopAutoplay();
    if (resumeRef.current) clearTimeout(resumeRef.current);
    scheduleResume();
  }, [stopAutoplay, scheduleResume]);

  // ── Card click handler ─────────────────────────────────────────────────────
  const handleCardClick = useCallback((e: React.MouseEvent, isCenter: boolean, i: number) => {
    // Suppress click if this mouseup followed a drag
    if (dragRef.current.moved) return;

    // Unlock drag mode on first-ever interaction
    if (!isInteractive) setIsInteractive(true);

    // Press animation: center card body click while autoplay is running.
    // Excluded: <a> and <button> elements (Voir / Contacter / Favori).
    const onCardBody = !(e.target as HTMLElement).closest("a, button");
    if (isCenter && onCardBody && autoplayRef.current !== null && !reducedMotionRef.current) {
      setPressAnim(true);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      pressTimerRef.current = setTimeout(() => setPressAnim(false), PRESS_ANIM_MS);
    }

    interact(isCenter ? undefined : i);
  }, [isInteractive, interact]);

  // ── Drag / swipe (desktop only, unlocked after first interaction) ──────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    dragRef.current = { startX: e.clientX, active: true, moved: false };
    // NOTE: pointer capture is set only once actual drag movement is confirmed
    // (see handlePointerMove). Setting it here would redirect the browser's
    // click event to the stage div, breaking onClick on child card wrappers.
  }, [isInteractive]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    if (Math.abs(e.clientX - dragRef.current.startX) > DRAG_INTENT) {
      if (!dragRef.current.moved) {
        dragRef.current.moved = true;
        setIsDragging(true);
        // Capture pointer now that we're certain it's a drag, not a tap/click.
        // This keeps pointermove/pointerup routed here even if pointer leaves.
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const delta = e.clientX - dragRef.current.startX;
    dragRef.current.active = false;
    setIsDragging(false);

    if (dragRef.current.moved && Math.abs(delta) > DRAG_THRESHOLD) {
      const dir = delta < 0 ? 1 : -1;
      setActiveIndex(p => (p + dir + carsLengthRef.current) % carsLengthRef.current);
      stopAutoplay();
      if (resumeRef.current) clearTimeout(resumeRef.current);
      scheduleResume();
    }

    // Reset after click event fires (same synchronous task)
    setTimeout(() => { dragRef.current.moved = false; }, 0);
  }, [stopAutoplay, scheduleResume]);

  // Capture-phase click: suppress link navigation when a drag just happened
  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  // ── Favorites toggle ───────────────────────────────────────────────────────
  const toggleFavorite = (slug: string) => {
    setFavorites(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug];
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ── Early return: no vehicles ──────────────────────────────────────────────
  if (cars.length === 0) {
    return (
      <p className="text-center text-gray-400 py-12">
        Aucun véhicule disponible pour le moment.
      </p>
    );
  }

  const n = cars.length;

  // ── 3D position helpers ────────────────────────────────────────────────────
  const getPos = (i: number): "center" | "left" | "right" => {
    if (i === activeIndex) return "center";
    if (i === (activeIndex + 1) % n) return "right";
    return "left";
  };

  const posStyle = (pos: "center" | "left" | "right"): React.CSSProperties => {
    if (pos === "center") {
      return {
        transform: "translateX(-50%) translateZ(0px) rotateY(0deg) scale(1)",
        opacity: 1,
        zIndex: 3,
        filter: "none",
      };
    }
    const { offset, cardW } = carouselDims;
    const isCompact = cardW < 360;
    const side = pos === "right" ? 1 : -1;
    return {
      transform: `translateX(calc(-50% + ${side * offset}px)) translateZ(${isCompact ? -90 : -130}px) rotateY(${-side * (isCompact ? 14 : 18)}deg) scale(${isCompact ? 0.82 : 0.85})`,
      opacity: 0.72,
      zIndex: 2,
      filter: "brightness(0.68) saturate(0.85)",
    };
  };

  // Build card style — injects press animation for center card when active
  const cardStyle = (pos: "center" | "left" | "right"): React.CSSProperties => {
    const base = posStyle(pos);
    const isCenter = pos === "center";
    const useAnim  = isCenter && pressAnim && !reducedMotion;
    return {
      position: "absolute",
      top: 0,
      left: "50%",
      width: `${carouselDims.cardW}px`,
      willChange: "transform, opacity",
      // Suppress transition while the CSS animation runs to avoid fighting it
      transition: reducedMotion || useAnim
        ? "none"
        : "transform 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.75s ease, filter 0.75s ease",
      // Spread base (sets transform / opacity / zIndex / filter)
      ...base,
      // Override transform with animation when press is active
      ...(useAnim
        ? {
            transform: undefined,
            animation: `rvg-press ${PRESS_ANIM_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
          }
        : {}),
    };
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={gridRef}>

      {/* Press keyframe — scoped to this component, no external stylesheet needed */}
      <style>{`
        @keyframes rvg-press {
          0%   { transform: translateX(-50%) translateZ(  0px) rotateY(0deg) scale(1);    }
          32%  { transform: translateX(-50%) translateZ(-22px) rotateY(0deg) scale(0.95); }
          66%  { transform: translateX(-50%) translateZ(  7px) rotateY(0deg) scale(1.02); }
          100% { transform: translateX(-50%) translateZ(  0px) rotateY(0deg) scale(1);    }
        }
      `}</style>

      {/* ── Mobile + fallback grid (inchangé) ─────────────────────── */}
      <div className={`grid gap-6 sm:grid-cols-2 ${n >= 3 ? "md:hidden" : ""}`}>
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

      {/* ── Desktop 3D carousel (≥ 3 véhicules, ≥ lg) ────────────── */}
      {n >= 3 && (
        <div className="hidden md:block">

          {/* Stage 3D */}
          <div
            className="relative select-none"
            style={{
              perspective: "1400px",
              perspectiveOrigin: "50% 40%",
              height: "490px",
              cursor: isDragging ? "grabbing" : isInteractive ? "grab" : "default",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClickCapture={handleClickCapture}
          >
            {cars.map((car, i) => {
              const pos      = getPos(i);
              const isCenter = pos === "center";

              return (
                <div
                  key={car.slug}
                  onClick={(e) => handleCardClick(e, isCenter, i)}
                  style={{
                    ...cardStyle(pos),
                    cursor: isCenter
                      ? isDragging ? "grabbing" : "grab"
                      : "pointer",
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
                onClick={() => interact(i)}
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
