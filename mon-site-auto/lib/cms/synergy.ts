import "server-only";

import type { PortableTextBlock } from "@portabletext/types";
import { getSynergyDeliveryConfig } from "@/lib/cms/config";
import type { Car, DeliveryImage } from "@/lib/types";

type RichTextDoc = {
  version: 1;
  blocks: Array<{
    type: "paragraph";
    style: string;
    listItem?: string;
    level?: number;
    children: Array<{ text: string; marks: string[] }>;
  }>;
};

type DeliveryVehicle = {
  slug: string;
  name: string;
  brand: string;
  model: string;
  commercialStatus: "available" | "preparing" | "reserved" | "sold";
  priceCents: number;
  year: number;
  mileageKm: number;
  transmission: "manual" | "semi_automatic" | "automatic";
  fuel: "petrol" | "diesel" | "hybrid" | "electric";
  powerHp: number;
  location: string | null;
  critAir: "0" | "1" | "2" | "3" | "4" | "5" | "not_applicable" | null;
  description: RichTextDoc;
  options: string[];
  historyText: RichTextDoc;
  listedAt: string;
  updatedAt: string;
  hasHistoryPdf: boolean;
  images: Array<{
    mediaId: string;
    position: number;
    altText: string;
    width: number | null;
    height: number | null;
  }>;
};

const STATUS = {
  available: "disponible",
  preparing: "en_preparation",
  reserved: "reserve",
  sold: "vendu",
} as const;

const TRANSMISSION = {
  manual: "Manuelle",
  semi_automatic: "Semi-automatique",
  automatic: "Automatique",
} as const;

const FUEL = {
  petrol: "Essence",
  diesel: "Diesel",
  hybrid: "Hybride",
  electric: "Électrique",
} as const;

function toPortableText(document: RichTextDoc | null | undefined): PortableTextBlock[] {
  if (!document?.blocks?.length) return [];
  return document.blocks.map((block, blockIndex) => ({
    _type: "block",
    _key: `block-${blockIndex}`,
    style: block.style,
    markDefs: [],
    ...(block.listItem ? { listItem: block.listItem, level: block.level ?? 1 } : {}),
    children: block.children.map((child, childIndex) => ({
      _type: "span",
      _key: `span-${blockIndex}-${childIndex}`,
      text: child.text,
      marks: child.marks,
    })),
  })) as PortableTextBlock[];
}

function mapCritAir(value: DeliveryVehicle["critAir"]) {
  if (value === null) return undefined;
  return value === "not_applicable" ? "Non concerné" : `Crit'air ${value}`;
}

function mapVehicle(vehicle: DeliveryVehicle): Car {
  const images: DeliveryImage[] = vehicle.images.map((image) => ({
    _key: image.mediaId,
    url: `/api/cms-media/${image.mediaId}`,
    altText: image.altText,
    width: image.width,
    height: image.height,
  }));
  const priceEuros = vehicle.priceCents / 100;
  return {
    name: vehicle.name,
    slug: vehicle.slug,
    price: priceEuros,
    numericPrice: priceEuros,
    year: vehicle.year,
    mileage: vehicle.mileageKm,
    transmission: TRANSMISSION[vehicle.transmission],
    fuel: FUEL[vehicle.fuel],
    power: vehicle.powerHp,
    images,
    description: toPortableText(vehicle.description),
    status: STATUS[vehicle.commercialStatus],
    location: vehicle.location ?? undefined,
    critAir: mapCritAir(vehicle.critAir),
    options: vehicle.options,
    brand: vehicle.brand,
    model: vehicle.model,
    historyText: toPortableText(vehicle.historyText),
    hasHistoryFile: vehicle.hasHistoryPdf,
    updatedAt: vehicle.updatedAt,
  };
}

async function synergyFetch<T>(path: string): Promise<T> {
  const { baseUrl, token } = getSynergyDeliveryConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    throw new Error(`API CMS Synergy indisponible (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function fetchSynergyVehicles(): Promise<Car[]> {
  const payload = await synergyFetch<{ vehicles: DeliveryVehicle[] }>("/api/public/cms/vehicles");
  return payload.vehicles.map(mapVehicle);
}

export async function fetchSynergyVehicle(slug: string): Promise<Car | null> {
  const { baseUrl, token } = getSynergyDeliveryConfig();
  const response = await fetch(`${baseUrl}/api/public/cms/vehicles/${encodeURIComponent(slug)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API CMS Synergy indisponible (${response.status}).`);
  const payload = (await response.json()) as { vehicle: DeliveryVehicle };
  return mapVehicle(payload.vehicle);
}

export async function fetchSynergyHistoryPdfUrl(slug: string): Promise<string | null> {
  const { baseUrl, token } = getSynergyDeliveryConfig();
  const response = await fetch(
    `${baseUrl}/api/public/cms/vehicles/${encodeURIComponent(slug)}/history-pdf`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API CMS Synergy indisponible (${response.status}).`);
  const payload = (await response.json()) as { url: string };
  return payload.url;
}
