import "server-only";

import { getCmsSource } from "@/lib/cms/config";
import { fetchSynergyVehicle, fetchSynergyVehicles } from "@/lib/cms/synergy";
import { sanityFetch } from "@/lib/sanity";
import type { Car } from "@/lib/types";

const LIST_FIELDS = `
  name,
  "slug": slug.current,
  price,
  numericPrice,
  year,
  mileage,
  transmission,
  fuel,
  power,
  "images": images[defined(asset)],
  status,
  brand,
  model
`;

export async function getAllVehicles(): Promise<Car[]> {
  if (getCmsSource() === "supabase") return fetchSynergyVehicles();
  return sanityFetch<Car[]>(`*[_type == "car"] | order(_createdAt desc) {${LIST_FIELDS}}`);
}

export async function getRecentVehicles(): Promise<Car[]> {
  if (getCmsSource() === "supabase") return (await fetchSynergyVehicles()).slice(0, 3);
  return sanityFetch<Car[]>(`*[_type == "car"] | order(_createdAt desc) [0..2] {${LIST_FIELDS}}`);
}

export async function getVehicleBySlug(slug: string): Promise<Car | null> {
  if (getCmsSource() === "supabase") return fetchSynergyVehicle(slug);
  return sanityFetch<Car | null>(
    `*[_type == "car" && slug.current == $slug][0]{
      name,
      "slug": slug.current,
      price,
      numericPrice,
      year,
      mileage,
      transmission,
      fuel,
      power,
      "images": images[defined(asset)],
      description,
      status,
      location,
      critAir,
      options,
      brand,
      model,
      historyText,
      historyFile { asset->{ url } },
      "updatedAt": _updatedAt
    }`,
    { slug },
  );
}

export async function getVehicleMetadataBySlug(slug: string) {
  if (getCmsSource() === "supabase") {
    const car = await fetchSynergyVehicle(slug);
    return car
      ? { name: car.name, price: car.price, numericPrice: car.numericPrice, description: car.description }
      : null;
  }
  return sanityFetch<Pick<Car, "name" | "price" | "numericPrice" | "description"> | null>(
    `*[_type == "car" && slug.current == $slug][0]{ name, price, numericPrice, description }`,
    { slug },
  );
}

export async function getSitemapVehicles(): Promise<Array<{ slug: string; updatedAt: string }>> {
  if (getCmsSource() === "supabase") {
    const vehicles = await fetchSynergyVehicles();
    return vehicles
      .map((vehicle) => ({ slug: vehicle.slug, updatedAt: vehicle.updatedAt ?? new Date(0).toISOString() }))
      .sort((left, right) => left.slug.localeCompare(right.slug));
  }
  return sanityFetch<Array<{ slug: string; updatedAt: string }>>(`
    *[_type == "car" && defined(slug.current)] | order(slug.current asc) {
      "slug": slug.current,
      "updatedAt": _updatedAt
    }
  `);
}
