"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { urlFor } from "@/lib/sanity";
import type { Car } from "@/lib/types";
import { formatCarPrice, formatMileage, formatPower } from "@/lib/format";
import { getVehicleStatusInfo } from "@/lib/vehicle-status";

interface Props {
  car: Car;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
  priority?: boolean;
}

export default function VehicleCard({ car, isFavorite, onToggleFavorite, priority = false }: Props) {
  const imageUrls = useMemo(
    () =>
      (car.images ?? []).map((image) =>
        urlFor(image).width(800).height(600).url()
      ),
    [car.images]
  );

  const [isMobile, setIsMobile] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const statusInfo = getVehicleStatusInfo(car.status);
  const hasMultipleImages = imageUrls.length > 1;
  const formattedPrice = formatCarPrice(car.numericPrice, car.price);
  const formattedMileage = formatMileage(car.mileage);
  const formattedPower = formatPower(car.power);

  function markVehicleNavigation() {
    try {
      sessionStorage.setItem("autologgia-returning-from-vehicle", "1");
    } catch {}
  }

  // Détecte mobile ET prefers-reduced-motion (identique à l'existant)
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function update() {
      setIsMobile(mobileQuery.matches && !reducedMotionQuery.matches);
    }

    update();
    mobileQuery.addEventListener("change", update);
    reducedMotionQuery.addEventListener("change", update);

    return () => {
      mobileQuery.removeEventListener("change", update);
      reducedMotionQuery.removeEventListener("change", update);
    };
  }, []);

  // Reset à 0 quand le véhicule change
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [car.slug, imageUrls.length]);

  // Rotation automatique mobile — 2 500 ms, transition identique à VehicleGallery
  useEffect(() => {
    if (!isMobile || !hasMultipleImages) return;

    const interval = window.setInterval(() => {
      setCurrentImageIndex((current) => (current + 1) % imageUrls.length);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [hasMultipleImages, imageUrls.length, isMobile]);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-navy-light transition-all duration-500 hover:-translate-y-1.5 hover:border-[#C9A84C]/30 hover:shadow-[0_16px_48px_rgba(201,168,76,0.12)]">

      {/* ── Image ── */}
      <div className="relative h-56 overflow-hidden bg-navy-mid">
        {imageUrls.length > 0 ? (
          isMobile && hasMultipleImages ? (
            // Mobile : toutes les images empilées, pur cross-fade opacity — identique à VehicleGallery
            imageUrls.map((src, index) => (
              <Image
                key={`${car.slug}-${index}`}
                src={src}
                alt={car.name}
                fill
                className={`object-cover transition-opacity duration-700 ease-in-out ${
                  index === currentImageIndex ? "opacity-100" : "opacity-0"
                }`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={index === 0 && priority}
              />
            ))
          ) : (
            // Desktop : image statique avec hover scale
            <Image
              src={imageUrls[0]}
              alt={car.name}
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-white/20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="1" y="3" width="15" height="13" rx="1" />
              <path d="M16 8h4l3 4v4H16V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        {statusInfo && (
          <div className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm ${statusInfo.badgeBg}`}>
            {statusInfo.label}
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={() => onToggleFavorite(car.slug)}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-2 backdrop-blur-sm transition hover:bg-black/70"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isFavorite ? "#C9A84C" : "none"}
            stroke={isFavorite ? "#C9A84C" : "white"}
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-xl font-medium text-white leading-snug">{car.name}</h3>
        <p className="mt-1 text-sm text-gray-400">
          {car.year}{formattedMileage ? ` · ${formattedMileage}` : ''}
        </p>
        {formattedPrice && (
          <p className="mt-2 font-heading text-lg font-semibold text-white">{formattedPrice}</p>
        )}

        {/* Specs */}
        <div className="mt-3 flex flex-wrap gap-2">
          {car.transmission && (
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-400">
              {car.transmission}
            </span>
          )}
          {car.fuel && (
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-400">
              {car.fuel}
            </span>
          )}
          {formattedPower && (
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-400">
              {formattedPower}
            </span>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <Link
            href={`/vehicules/${car.slug}`}
            onClick={markVehicleNavigation}
            className="rounded-full border border-white/20 px-3 py-2.5 text-center text-sm font-medium text-white transition hover:border-white/50 hover:bg-white/5"
          >
            Voir
          </Link>
          <Link
            href={`/contact?vehicule=${encodeURIComponent(car.name)}`}
            className="rounded-full bg-[#C9A84C] px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#b8962e]"
          >
            Contacter
          </Link>
        </div>
      </div>
    </div>
  );
}
