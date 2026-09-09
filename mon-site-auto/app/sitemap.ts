import type { MetadataRoute } from "next";

import { getSitemapVehicles } from "@/lib/cms/vehicles";

const BASE_URL = "https://www.autologgia.fr";

type SitemapVehicle = {
  slug: string;
  updatedAt: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: generatedAt,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/catalogue`,
      lastModified: generatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/estimation`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/mentions-legales`,
      lastModified: generatedAt,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/politique-confidentialite`,
      lastModified: generatedAt,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const vehicles: SitemapVehicle[] = await getSitemapVehicles();

    const vehiclePages: MetadataRoute.Sitemap = vehicles.map((vehicle) => ({
      url: `${BASE_URL}/vehicules/${encodeURIComponent(vehicle.slug)}`,
      lastModified: new Date(vehicle.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticPages, ...vehiclePages];
  } catch (error) {
    console.error("Impossible de charger les véhicules pour le sitemap.", error);
    return staticPages;
  }
}
