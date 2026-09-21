import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Routes serveur du pont Autologgia <-> Synergy : média, PDF d'historique, revalidation.

const revalidateTag = vi.hoisted(() => vi.fn());
const cookieValue = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookieValue.value ? { value: cookieValue.value } : undefined) }),
}));

import { GET as getHistory } from "@/app/api/vehicle-history/[slug]/route";
import { GET as getMedia } from "@/app/api/cms-media/[id]/route";
import { POST as postRevalidate } from "@/app/api/cms/revalidate/route";
import { createHistoryAccessToken, historyAccessCookieName } from "@/lib/cms/history-access";

const BASE_URL = "https://synergy.example";
const TOKEN = "t".repeat(43);
const REVALIDATE_SECRET = "s".repeat(40);
const HISTORY_SECRET = "h".repeat(40);
const MEDIA_ID = "11111111-1111-4111-8111-111111111111";

const fetchMock = vi.fn();
const savedEnv = { ...process.env };

beforeEach(() => {
  fetchMock.mockReset();
  revalidateTag.mockReset();
  cookieValue.value = undefined;
  vi.stubGlobal("fetch", fetchMock);
  process.env.CMS_SOURCE = "supabase";
  process.env.SYNERGY_CMS_API_URL = BASE_URL;
  process.env.SYNERGY_CMS_DELIVERY_TOKEN = TOKEN;
  process.env.CMS_REVALIDATE_SECRET = REVALIDATE_SECRET;
  process.env.HISTORY_ACCESS_SECRET = HISTORY_SECRET;
  delete process.env.CMS_SITE_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...savedEnv };
});

const mediaContext = (id: string) => ({ params: Promise.resolve({ id }) });
const slugContext = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("GET /api/cms-media/[id]", () => {
  it("relaie l'image de Synergy avec le jeton côté serveur ; le navigateur ne voit ni jeton ni URL amont", async () => {
    fetchMock.mockResolvedValue(
      new Response("PNGDATA", { status: 200, headers: { "content-type": "image/jpeg", "content-length": "7", etag: '"abc"' } }),
    );

    const response = await getMedia(new Request("https://site.test/api/cms-media/x"), mediaContext(MEDIA_ID));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("PNGDATA");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/public/cms/media/${MEDIA_ID}`);
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("etag")).toBe('"abc"');
    for (const [name, value] of response.headers.entries()) {
      expect(`${name}: ${value}`).not.toContain(TOKEN);
      expect(`${name}: ${value}`).not.toContain(BASE_URL);
    }
  });

  it("CMS_SOURCE=sanity -> 404 sans aucun appel Synergy (rollback : la route se désactive)", async () => {
    process.env.CMS_SOURCE = "sanity";
    const response = await getMedia(new Request("https://site.test/x"), mediaContext(MEDIA_ID));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["not-a-uuid", "../secret", "11111111-1111-4111-8111-11111111111", MEDIA_ID + "x"])(
    "identifiant invalide %j -> 404 sans appel amont",
    async (id) => {
      const response = await getMedia(new Request("https://site.test/x"), mediaContext(id));
      expect(response.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("média inconnu (404 amont) -> 404", async () => {
    fetchMock.mockResolvedValue(new Response("Not found", { status: 404 }));
    expect((await getMedia(new Request("https://site.test/x"), mediaContext(MEDIA_ID))).status).toBe(404);
  });

  it("réponse amont qui n'est pas une image -> 502 (jamais relayée)", async () => {
    fetchMock.mockResolvedValue(new Response("<html>oops</html>", { status: 200, headers: { "content-type": "text/html" } }));
    expect((await getMedia(new Request("https://site.test/x"), mediaContext(MEDIA_ID))).status).toBe(502);
  });

  it("erreur réseau amont -> 502 sans détail", async () => {
    fetchMock.mockRejectedValue(new Error(`connect ECONNREFUSED ${BASE_URL} ${TOKEN}`));
    const response = await getMedia(new Request("https://site.test/x"), mediaContext(MEDIA_ID));
    expect(response.status).toBe(502);
    expect(await response.text()).toBe("Media unavailable");
  });
});

describe("GET /api/vehicle-history/[slug] (PDF d'historique protégé)", () => {
  it("sans cookie d'accès valide -> 401 et Synergy n'est pas appelé", async () => {
    const response = await getHistory(new Request("https://site.test/x"), slugContext("clio-3"));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cookie signé pour un AUTRE véhicule -> 401", async () => {
    cookieValue.value = createHistoryAccessToken("autre-vehicule").token;
    const response = await getHistory(new Request("https://site.test/x"), slugContext("clio-3"));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cookie altéré -> 401", async () => {
    cookieValue.value = createHistoryAccessToken("clio-3").token.replace(/.$/, "x");
    const response = await getHistory(new Request("https://site.test/x"), slugContext("clio-3"));
    expect(response.status).toBe(401);
  });

  it("cookie valide : URL signée courte durée relayée, non mise en cache", async () => {
    cookieValue.value = createHistoryAccessToken("clio-3").token;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ url: "https://signed.example/pdf?token=abc" }), { status: 200 }));

    const response = await getHistory(new Request("https://site.test/x"), slugContext("clio-3"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://signed.example/pdf?token=abc" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/api/public/cms/vehicles/clio-3/history-pdf`);
    expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
  });

  it("document absent (404 amont) -> 404 ; panne amont -> 502 sans détail", async () => {
    cookieValue.value = createHistoryAccessToken("clio-3").token;
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 404 }));
    expect((await getHistory(new Request("https://site.test/x"), slugContext("clio-3"))).status).toBe(404);
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    const response = await getHistory(new Request("https://site.test/x"), slugContext("clio-3"));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain(TOKEN);
  });

  it("CMS_SOURCE=sanity -> 404 (la route se désactive)", async () => {
    process.env.CMS_SOURCE = "sanity";
    const response = await getHistory(new Request("https://site.test/x"), slugContext("clio-3"));
    expect(response.status).toBe(404);
  });

  it("le nom du cookie ne révèle pas le slug", () => {
    expect(historyAccessCookieName("clio-3")).not.toContain("clio");
  });
});

describe("POST /api/cms/revalidate (invalidation poussée par Synergy)", () => {
  function post(body: unknown, secret: string | null = REVALIDATE_SECRET) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (secret !== null) headers["x-cms-revalidate-secret"] = secret;
    return postRevalidate(new Request("https://site.test/api/cms/revalidate", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }));
  }

  it("secret côté serveur absent -> 503, aucune purge", async () => {
    delete process.env.CMS_REVALIDATE_SECRET;
    const response = await post({ siteKey: "autologgia", resource: "vehicles" });
    expect(response.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([null, "", "mauvais", REVALIDATE_SECRET + "x"])("secret %j invalide -> 401, aucune purge", async (secret) => {
    const response = await post({ siteKey: "autologgia", resource: "vehicles" }, secret);
    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("siteKey d'un autre site -> 409 (frontière multi-client)", async () => {
    expect((await post({ siteKey: "autre", resource: "vehicles" })).status).toBe(409);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("ressource non gérée -> 422 ; slug invalide -> 422 ; JSON invalide -> 400", async () => {
    expect((await post({ siteKey: "autologgia", resource: "leads" })).status).toBe(422);
    expect((await post({ siteKey: "autologgia", resource: "vehicles", slug: "../x" })).status).toBe(422);
    expect((await post("{pas du json")).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("purge la liste seule (sans slug) : immédiate, expire=0", async () => {
    const response = await post({ siteKey: "autologgia", resource: "vehicles" });
    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("cms:autologgia:vehicles", { expire: 0 });
  });

  it("purge la liste ET la fiche modifiée", async () => {
    const response = await post({ siteKey: "autologgia", resource: "vehicles", slug: "citroen-c1", reason: "vehicle.updated" });
    expect(response.status).toBe(200);
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(["cms:autologgia:vehicles", "cms:autologgia:vehicle:citroen-c1"]);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(await response.json())).not.toContain(REVALIDATE_SECRET);
  });
});
