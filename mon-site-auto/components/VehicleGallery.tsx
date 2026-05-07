"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const AUTOPLAY_MS = 4000;
const MOBILE_THUMB_COUNT = 4;
const DESKTOP_THUMB_COUNT = 6;

function getThumbnailStart(index: number, visibleCount: number, total: number) {
  return Math.min(Math.max(index - (visibleCount - 1), 0), Math.max(total - visibleCount, 0));
}

export default function VehicleGallery({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [mainTouchStartX, setMainTouchStartX] = useState<number | null>(null);
  const [mobileThumbStart, setMobileThumbStart] = useState(0);
  const [desktopThumbStart, setDesktopThumbStart] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);
  const [isRailInteracting, setIsRailInteracting] = useState(false);

  const total = images?.length ?? 0;

  // Autoplay — redémarre proprement à chaque interaction manuelle (timerKey)
  // ou changement de hover
  useEffect(() => {
    if (total <= 1 || isHovered || isRailInteracting || showAllImages) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % total;
        setMobileThumbStart(getThumbnailStart(next, MOBILE_THUMB_COUNT, total));
        setDesktopThumbStart(getThumbnailStart(next, DESKTOP_THUMB_COUNT, total));
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [total, isHovered, isRailInteracting, showAllImages, timerKey]);

  useEffect(() => {
    setActiveIndex(0);
    setMobileThumbStart(0);
    setDesktopThumbStart(0);
    setShowAllImages(false);
  }, [images]);

  if (total === 0) return null;

  // Navigation manuelle : reset le timer à 0
  const navigate = (newIndex: number) => {
    setActiveIndex(newIndex);
    setMobileThumbStart(getThumbnailStart(newIndex, MOBILE_THUMB_COUNT, total));
    setDesktopThumbStart(getThumbnailStart(newIndex, DESKTOP_THUMB_COUNT, total));
    setTimerKey((k) => k + 1);
  };

  const goPrev = () => navigate((activeIndex - 1 + total) % total);
  const goNext = () => navigate((activeIndex + 1) % total);

  const handleMainTouchEnd = (x: number) => {
    if (mainTouchStartX === null) return;
    const diff = mainTouchStartX - x;
    setMainTouchStartX(null);
    if (Math.abs(diff) < 40) return;
    if (diff > 0) goNext();
    else goPrev();
  };

  return (
    <div className="space-y-3">
      {/* ── Image principale ── */}
      <div
        className="relative h-[260px] w-full overflow-hidden rounded-2xl bg-navy-mid sm:h-[380px] md:h-[480px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={(event) => setMainTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => handleMainTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        {images.map((src, i) => (
          <Image
            key={i}
            src={src}
            alt="Image véhicule"
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${
              i === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            priority={i === 0}
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        ))}

        {/* Flèches */}
        {total > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="Image précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-[#C9A84C]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              onClick={goNext}
              aria-label="Image suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-[#C9A84C]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Compteur d'images (toujours visible si > 1) */}
        {total > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {activeIndex + 1} / {total}
          </div>
        )}

        {/* Indicateurs dots (jusqu'à 8 images) */}
        {total > 1 && total <= 8 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => navigate(i)}
                aria-label={`Aller à l'image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none ${
                  i === activeIndex
                    ? "w-6 bg-[#C9A84C]"
                    : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Miniatures ── */}
      {total > 1 && (
        <>
          <div className="space-y-2 md:hidden">
            <ThumbnailRail
              images={images}
              activeIndex={activeIndex}
              startIndex={mobileThumbStart}
              visibleCount={MOBILE_THUMB_COUNT}
              onNavigate={navigate}
              onStartIndexChange={setMobileThumbStart}
              onInteractionStart={() => setIsRailInteracting(true)}
              onInteractionEnd={() => setIsRailInteracting(false)}
            />
            {total > MOBILE_THUMB_COUNT && (
              <ViewAllButton onClick={() => setShowAllImages(true)} />
            )}
          </div>

          <div className="hidden space-y-2 md:block">
            <ThumbnailRail
              images={images}
              activeIndex={activeIndex}
              startIndex={desktopThumbStart}
              visibleCount={DESKTOP_THUMB_COUNT}
              onNavigate={navigate}
              onStartIndexChange={setDesktopThumbStart}
              onInteractionStart={() => setIsRailInteracting(true)}
              onInteractionEnd={() => setIsRailInteracting(false)}
            />
            {total > DESKTOP_THUMB_COUNT && (
              <ViewAllButton onClick={() => setShowAllImages(true)} />
            )}
          </div>
        </>
      )}

      {showAllImages && (
        <AllImagesOverlay
          images={images}
          activeIndex={activeIndex}
          onClose={() => setShowAllImages(false)}
          onSelect={(index) => {
            navigate(index);
            setShowAllImages(false);
          }}
        />
      )}
    </div>
  );
}

function ViewAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
    >
      Voir toutes les images
    </button>
  );
}

function AllImagesOverlay({
  images,
  activeIndex,
  onClose,
  onSelect,
}: {
  images: string[];
  activeIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] bg-navy/95 px-4 py-5 text-white backdrop-blur-md md:px-8 md:py-8">
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-[#C9A84C]">
              Galerie
            </p>
            <h2 className="mt-1 font-heading text-3xl font-light">
              Toutes les images
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la galerie"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-gray-300 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 pb-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, index) => (
              <button
                key={`${img}-full-${index}`}
                onClick={() => onSelect(index)}
                aria-label={`Afficher l'image ${index + 1}`}
                className={`group relative aspect-[4/3] overflow-hidden rounded-xl border-2 bg-navy-mid transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] ${
                  index === activeIndex
                    ? "border-[#C9A84C]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <Image
                  src={img}
                  alt={`Image véhicule ${index + 1}`}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1 text-xs font-medium backdrop-blur-sm">
                  {index + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThumbnailRail({
  images,
  activeIndex,
  startIndex,
  visibleCount,
  onNavigate,
  onStartIndexChange,
  onInteractionStart,
  onInteractionEnd,
  className = "",
}: {
  images: string[];
  activeIndex: number;
  startIndex: number;
  visibleCount: number;
  onNavigate: (index: number) => void;
  onStartIndexChange?: (index: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number | null>(null);
  const didDragRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const gapPx = 8;
  const itemBasis = `calc((100% - ${(visibleCount - 1) * gapPx}px) / ${visibleCount})`;
  const maxStartIndex = Math.max(images.length - visibleCount, 0);
  const itemWidth = containerWidth > 0
    ? (containerWidth - (visibleCount - 1) * gapPx) / visibleCount
    : 0;
  const itemStep = itemWidth + gapPx;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setContainerWidth(container.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const clampStartIndex = (index: number) => Math.min(Math.max(index, 0), maxStartIndex);

  const pauseRailAutoplay = () => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    onInteractionStart?.();
  };

  const resumeRailAutoplay = (delay = 1200) => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = window.setTimeout(() => {
      onInteractionEnd?.();
      resumeTimerRef.current = null;
    }, delay);
  };

  const finishDrag = () => {
    if (dragStartXRef.current === null || !onStartIndexChange) return;
    const movedSlots = itemStep > 0
      ? (Math.abs(dragOffset) > 18 ? Math.sign(-dragOffset) * Math.max(1, Math.round(Math.abs(dragOffset) / itemStep)) : 0)
      : 0;
    const nextStart = itemStep > 0
      ? clampStartIndex(startIndex + movedSlots)
      : startIndex;

    if (didDragRef.current) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    onStartIndexChange(nextStart);
    dragStartXRef.current = null;
    didDragRef.current = false;
    setDragOffset(0);
    setIsDragging(false);
    resumeRailAutoplay();
  };

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden select-none ${className}`}
      onMouseEnter={pauseRailAutoplay}
      onMouseLeave={() => {
        if (!isDragging) resumeRailAutoplay(600);
      }}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (!onStartIndexChange || maxStartIndex === 0) return;
        pauseRailAutoplay();
        dragStartXRef.current = event.clientX;
        didDragRef.current = false;
        setIsDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (dragStartXRef.current === null) return;
        event.preventDefault();
        const nextOffset = event.clientX - dragStartXRef.current;
        if (Math.abs(nextOffset) > 4) didDragRef.current = true;
        const minOffset = -maxStartIndex * itemStep - -startIndex * itemStep;
        const maxOffset = startIndex * itemStep;
        setDragOffset(Math.min(Math.max(nextOffset, minOffset), maxOffset));
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <div
        className={`flex gap-2 ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${
          isDragging ? "" : "transition-transform duration-500 ease-out"
        }`}
        style={{
          transform: itemStep > 0
            ? `translateX(${-startIndex * itemStep + dragOffset}px)`
            : `translateX(calc(-${startIndex} * (${itemBasis} + ${gapPx}px)))`,
          touchAction: "pan-y",
        }}
      >
        {images.map((img, i) => (
          <button
            key={`${img}-${i}`}
            onClick={() => {
              if (suppressClickRef.current) return;
              onNavigate(i);
            }}
            type="button"
            aria-label={`Voir l'image ${i + 1}`}
            className={`relative h-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] sm:h-20 ${
              i === activeIndex
                ? "border-[#C9A84C] opacity-100 shadow-[0_0_0_1px_#C9A84C]"
                : "border-transparent opacity-50 hover:opacity-80"
            }`}
            style={{ flexBasis: itemBasis }}
          >
            <Image
              src={img}
              alt={`Vue ${i + 1}`}
              fill
              draggable={false}
              className="object-cover"
              sizes="120px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
