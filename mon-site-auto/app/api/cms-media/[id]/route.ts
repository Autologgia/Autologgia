import { getCmsSource, getSynergyDeliveryConfig } from "@/lib/cms/config";
import { CMS_MEDIA_DEFAULT_WIDTH, isCmsMediaWidth, type CmsMediaWidth } from "@/lib/cms-media-variants";
import { cmsMediaTag, vehicleMediaTag } from "@/lib/cms/tags";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPSTREAM_TIMEOUT_MS = 10_000;
// Navigateur : un jour. CDN Vercel : sept jours au plus, purgé bien avant par
// tag à chaque écriture ; ce délai ne sert que de filet si une notification
// de Synergy se perdait.
const BROWSER_CACHE = "public, max-age=86400";
const CDN_CACHE = "max-age=604800";
const NO_SHARED_CACHE = "private, no-store";

export const dynamic = "force-dynamic";

/** `?w=` canonique (une des largeurs du jeu fermé) ou absent ; toute autre forme -> null. */
function canonicalWidth(url: URL): CmsMediaWidth | null {
  const keys = [...url.searchParams.keys()];
  if (keys.length === 0) return CMS_MEDIA_DEFAULT_WIDTH;
  if (keys.length !== 1 || keys[0] !== "w") return null;
  const raw = url.searchParams.get("w") ?? "";
  const width = Number(raw);
  return isCmsMediaWidth(width) && String(width) === raw ? width : null;
}

/**
 * Relaie une image publiée de Synergy (jeton côté serveur uniquement) en
 * variante WebP (`?w=`, voir lib/cms-media-variants.ts), et la fait garder par
 * le CDN Vercel : la requête du navigateur ne porte pas d'`Authorization`, donc
 * cette réponse, contrairement à celle de Synergy, est cachable.
 *
 * Invalidation -- aucune image devenue privée ne reste servie :
 *  - tags posés d'après Synergy (`X-Cms-Vehicle-Ids` : tous les véhicules qui
 *    utilisent l'image), jamais d'après l'URL ; par identifiant, donc
 *    insensibles à un changement de slug ;
 *  - chaque écriture sur un véhicule (images, dépublication, archivage,
 *    suppression, contenu, slug) notifie /api/cms/revalidate avec son
 *    identifiant, qui purge ce tag : la requête suivante redemande à Synergy,
 *    qui répond 404 si l'image n'est plus publiée (jamais mis en cache) ;
 *  - sans tag exploitable, la réponse n'est PAS mise en cache partagé ;
 *  - une seule URL par image et par largeur (paramètres non canoniques refusés),
 *    et l'optimiseur /_next/image refuse ces URL (images.localPatterns) ;
 *  - filet : sept jours de CDN au plus si une notification se perdait.
 * Un remplacement d'image crée un NOUVEL id côté Synergy (donc une nouvelle URL).
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const width = canonicalWidth(new URL(request.url));
  if (getCmsSource() !== "supabase" || !UUID_PATTERN.test(id) || width === null) {
    return new Response("Not found", { status: 404 });
  }

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

    const vehicleIds = (upstream.headers.get("x-cms-vehicle-ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => UUID_PATTERN.test(value));
    const headers = new Headers({ "Content-Type": contentType, "X-Content-Type-Options": "nosniff" });
    if (vehicleIds.length > 0) {
      headers.set("Cache-Control", BROWSER_CACHE);
      headers.set("Vercel-CDN-Cache-Control", CDN_CACHE);
      headers.set("Vercel-Cache-Tag", [cmsMediaTag(), ...vehicleIds.map((vehicleId) => vehicleMediaTag(vehicleId))].join(","));
    } else {
      // Impossible de rattacher l'image à un véhicule, donc de la purger plus
      // tard : jamais dans un cache partagé.
      headers.set("Cache-Control", NO_SHARED_CACHE);
    }
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
