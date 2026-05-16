import { createClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";

export const client = createClient({
  projectId: "9pij4ihx",
  dataset: "production",
  apiVersion: "2026-01-01",
  useCdn: false,
});

// Used only in API routes to create documents (estimation leads, etc.)
// Requires SANITY_WRITE_TOKEN in .env.local
export const writeClient = createClient({
  projectId: "9pij4ihx",
  dataset: "production",
  apiVersion: "2026-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const builder = createImageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
