import { getCmsSource, getSynergyDeliveryConfig } from "@/lib/cms/config";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (getCmsSource() !== "supabase" || !UUID_PATTERN.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { baseUrl, token } = getSynergyDeliveryConfig();
    const upstream = await fetch(`${baseUrl}/api/public/cms/media/${id}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "image/*" },
      cache: "no-store",
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !upstream.body || !contentType.startsWith("image/")) {
      return new Response("Not found", { status: upstream.status === 404 ? 404 : 502 });
    }

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
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
