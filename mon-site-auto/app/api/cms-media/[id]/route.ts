import { getCmsSource, getSynergyDeliveryConfig } from "@/lib/cms/config";
import { CMS_MEDIA_DEFAULT_WIDTH, isVehicleSlug, snapCmsMediaWidth } from "@/lib/cms-media-variants";
import { cmsMediaTag, vehicleTag } from "@/lib/cms/tags";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPSTREAM_TIMEOUT_MS = 10_000;

export const dynamic = "force-dynamic";

function requestedWidth(url: URL) {
  const parsed = Number(url.searchParams.get("w") ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? snapCmsMediaWidth(parsed) : CMS_MEDIA_DEFAULT_WIDTH;
}

/**
 * Relaie une image publiée de Synergy (jeton côté serveur uniquement) en
 * variante WebP (`?w=`, voir lib/cms-media-variants.ts), et la fait garder par
 * le CDN Vercel : la requête du navigateur ne porte pas d'`Authorization`, donc
 * cette réponse, contrairement à celle de Synergy, est cachable.
 *
 * Invalidation : un remplacement d'image crée un NOUVEL id côté Synergy (donc
 * une nouvelle URL). Une image retirée, un véhicule dépublié, archivé ou
 * supprimé déclenchent la revalidation envoyée par Synergy, qui purge le tag du
 * véhicule (app/api/cms/revalidate) : les réponses portant `?v=<slug>` sont
 * étiquetées avec ce même tag et disparaissent donc du CDN avec la fiche. La
 * requête suivante redemande à Synergy, qui répond 404 si l'image n'est plus
 * publiée. Une erreur n'est jamais mise en cache.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (getCmsSource() !== "supabase" || !UUID_PATTERN.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const url = new URL(request.url);
  const slug = url.searchParams.get("v");
  if (slug !== null && !isVehicleSlug(slug)) {
    return new Response("Not found", { status: 404 });
  }
  const width = requestedWidth(url);

  try {
    const { baseUrl, token } = getSynergyDeliveryConfig();
    const upstream = await fetch(`${baseUrl}/api/public/cms/media/${id}?w=${width}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "image/*" },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !upstream.body || !contentType.startsWith("image/")) {
      return new Response("Not found", { status: upstream.status === 404 ? 404 : 502 });
    }

    const tags = [cmsMediaTag()];
    if (slug) tags.push(vehicleTag(slug));
    const headers = new Headers({
      "Content-Type": contentType,
      // Navigateur : un an, sans revalidation (l'URL change avec l'image).
      "Cache-Control": "public, max-age=31536000, immutable",
      // CDN Vercel : un an aussi, jusqu'à la purge par tag (ni transmis au
      // navigateur ni à un autre CDN).
      "Vercel-CDN-Cache-Control": "max-age=31536000",
      "Vercel-Cache-Tag": tags.join(","),
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = upstream.headers.get("content-length");
    const etag = upstream.headers.get("etag");
    if (contentLength) headers.set("Content-Length", contentLength);
    if (etag) headers.set("ETag", etag);
    return new Response(upstream.body, { headers });
  } catch (error) {
    console.error("[cms-media] delivery failed", error instanceof Error ? error.message : "unknown");
    return new Response("Media unavailable", { status: 502 });
  }
}
