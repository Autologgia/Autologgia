import "server-only";

export function formRequestError(req: Request): Response | null {
  const type = req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json") return error("Envoyez la demande au format JSON.", 415);
  const allowed = new Set(["https://autologgia.fr", "https://www.autologgia.fr"]);
  if (process.env.VERCEL_ENV === "preview") {
    allowed.clear();
    for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
      if (host) allowed.add(`https://${host}`);
    }
  }
  if (process.env.NODE_ENV !== "production") {
    // Local testing only; production and previews use the explicit hosts above.
    const url = new URL(req.url);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) allowed.add(url.origin);
  }
  if (req.headers.get("sec-fetch-site") === "cross-site" || !allowed.has(req.headers.get("origin") ?? "")) {
    return error("Origine de la demande non autorisée.", 403);
  }
  return null;
}

function error(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readFormJson(req: Request, limit: number): Promise<
  { ok: true; body: unknown } | { ok: false; response: Response }
> {
  const tooLarge = () => ({ ok: false as const, response: error("Demande trop volumineuse. Réduisez la taille ou le nombre des photos.", 413) });
  if (Number(req.headers.get("content-length")) > limit) return tooLarge();
  if (!req.body) return { ok: false, response: error("Requête invalide.", 400) };
  const reader = req.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel().catch(() => undefined);
        return tooLarge();
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: error("Requête invalide.", 400) };
  } finally {
    reader.releaseLock();
  }
}
