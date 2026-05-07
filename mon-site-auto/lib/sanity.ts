import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

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

const builder = imageUrlBuilder(client);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function urlFor(source: any) {
  return builder.image(source);
}