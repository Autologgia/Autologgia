import { cookies } from "next/headers";
import { getCmsSource } from "@/lib/cms/config";
import { historyAccessCookieName, verifyHistoryAccessToken } from "@/lib/cms/history-access";
import { fetchSynergyHistoryPdfUrl } from "@/lib/cms/synergy";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (getCmsSource() !== "supabase") return Response.json({ error: "Not found" }, { status: 404 });
  const { slug } = await context.params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(historyAccessCookieName(slug))?.value;
  if (!verifyHistoryAccessToken(accessToken, slug)) {
    return Response.json({ error: "Accès expiré ou invalide." }, { status: 401 });
  }

  try {
    const url = await fetchSynergyHistoryPdfUrl(slug);
    if (!url) return Response.json({ error: "Document introuvable." }, { status: 404 });
    return Response.json(
      { url },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    console.error("[vehicle-history] delivery failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Document temporairement indisponible." }, { status: 502 });
  }
}
