import "server-only";

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "9pij4ihx";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-01-01";

export const sanityWriteToken =
  process.env.SANITY_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN;

export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: sanityWriteToken,
});
