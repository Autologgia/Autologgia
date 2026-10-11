import { timingSafeEqual } from "node:crypto";
import { dangerouslyDeleteByTag } from "@vercel/functions";
import { revalidatePath, revalidateTag } from "next/cache";
import { cmsSiteKey, vehicleMediaTag, vehicleTag, vehiclesTag } from "@/lib/cms/tags";

// Invalidation « push » déclenchée par Synergy après chaque écriture de
// contenu (voir synergy-app/src/lib/cms/notify-consumer.ts). Protégée par un
// secret partagé ; ne dépend d'aucune session utilisateur et ne renvoie
// jamais le secret.
export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.CMS_REVALIDATE_SECRET?.trim();
  if (!expected) {
    console.error("[cms/revalidate] CMS_REVALIDATE_SECRET absent");
    return Response.json({ error: "Revalidation non configurée." }, { status: 503 });
  }

  const provided = request.headers.get("x-cms-revalidate-secret") ?? "";
  if (!safeEqual(provided, expected)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
  }
  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const siteKey = typeof payload.siteKey === "string" ? payload.siteKey.trim() : "";
  const resource = typeof payload.resource === "string" ? payload.resource.trim() : "";
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const vehicleId = typeof payload.vehicleId === "string" ? payload.vehicleId.trim() : "";

  // Frontière multi-client : ce déploiement ne sert qu'un seul site.
  if (siteKey !== cmsSiteKey()) {
    return Response.json({ error: "siteKey inattendu pour ce site." }, { status: 409 });
  }
  if (resource !== "vehicles") {
    return Response.json({ error: "Ressource non gérée." }, { status: 422 });
  }
  if (slug && !SLUG_PATTERN.test(slug)) {
    return Response.json({ error: "Slug invalide." }, { status: 422 });
  }
  if (vehicleId && !UUID_PATTERN.test(vehicleId)) {
    return Response.json({ error: "Identifiant de véhicule invalide." }, { status: 422 });
  }

  // Images du véhicule dans le CDN (tag posé par /api/cms-media d'après
  // Synergy). SUPPRESSION, pas invalidation : une invalidation servirait encore
  // une fois l'ancienne réponse -- donc une image peut-être devenue privée --
  // pendant son rafraîchissement. Échec -> 503, et Synergy retente.
  if (vehicleId) {
    try {
      await dangerouslyDeleteByTag(vehicleMediaTag(vehicleId, siteKey), { revalidationDeadlineSeconds: 0 });
    } catch (error) {
      console.error("[cms/revalidate] purge des images impossible", error instanceof Error ? error.message : "unknown");
      return Response.json({ error: "Purge des images impossible." }, { status: 503 });
    }
  }

  const tags = [vehiclesTag(siteKey)];
  if (slug) tags.push(vehicleTag(slug, siteKey));
  // { expire: 0 } = purge immédiate, sans fenêtre stale-while-revalidate, pour
  // que la modification faite dans Synergy soit visible au plus vite.
  // `updateTag` n'est pas utilisable ici (réservé aux Server Actions).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  // Filet complémentaire : purge aussi le Full Route Cache des pages ISR
  // (revalidate = 300) qui dépendent de ces données. revalidateTag() seul ne
  // garantit pas que la prochaine requête serve du HTML frais ; revalidatePath()
  // force la régénération de la page elle-même au prochain accès.
  revalidatePath("/");
  revalidatePath("/catalogue");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/vehicules/${slug}`);

  return Response.json(
    { revalidated: true, tags, now: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
