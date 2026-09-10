import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { cmsSiteKey, vehicleTag, vehiclesTag } from "@/lib/cms/tags";

// Invalidation « push » déclenchée par Synergy après chaque écriture de
// contenu (voir synergy-app/src/lib/cms/notify-consumer.ts). Protégée par un
// secret partagé ; ne dépend d'aucune session utilisateur et ne renvoie
// jamais le secret.
export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

  const tags = [vehiclesTag(siteKey)];
  if (slug) tags.push(vehicleTag(slug, siteKey));
  // { expire: 0 } = purge immédiate, sans fenêtre stale-while-revalidate, pour
  // que la modification faite dans Synergy soit visible au plus vite.
  // `updateTag` n'est pas utilisable ici (réservé aux Server Actions).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  return Response.json(
    { revalidated: true, tags, now: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
