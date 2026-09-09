import "server-only";

export type CmsSource = "sanity" | "supabase";

export function getCmsSource(): CmsSource {
  return process.env.CMS_SOURCE?.trim().toLowerCase() === "supabase" ? "supabase" : "sanity";
}

export function getSynergyDeliveryConfig() {
  const baseUrl = process.env.SYNERGY_CMS_API_URL?.trim().replace(/\/$/, "");
  const token = process.env.SYNERGY_CMS_DELIVERY_TOKEN?.trim();
  if (!baseUrl || !token) {
    throw new Error(
      "CMS_SOURCE=supabase exige SYNERGY_CMS_API_URL et SYNERGY_CMS_DELIVERY_TOKEN côté serveur.",
    );
  }
  return { baseUrl, token };
}
