import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Routes serveur du pont Autologgia <-> Synergy : média, PDF d'historique, revalidation.

const revalidateTag = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const dangerouslyDeleteByTag = vi.hoisted(() => vi.fn<(tag: string | string[], options?: { revalidationDeadlineSeconds: number }) => Promise<void>>(async () => undefined));
const cookieValue = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/cache", () => ({ revalidateTag, revalidatePath }));
vi.mock("@vercel/functions", () => ({ dangerouslyDeleteByTag }));
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
  revalidatePath.mockReset();
  dangerouslyDeleteByTag.mockClear();
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
  const VEHICLE_A = "22222222-2222-4222-8222-222222222222";
  const VEHICLE_B = "33333333-3333-4333-8333-333333333333";
  const image = (vehicleIds: string | null = `${VEHICLE_A},${VEHICLE_B}`, type = "image/webp") =>
    new Response("WEBP", { status: 200, headers: { "content-type": type, ...(vehicleIds === null ? {} : { "x-cms-vehicle-ids": vehicleIds }) } });
  const media = (query = "?w=1280", id = MEDIA_ID) => getMedia(new Request(`https://site.test/api/cms-media/${id}${query}`), mediaContext(id));

  it("relaie l'image de Synergy avec le jeton côté serveur ; le navigateur ne voit ni jeton, ni URL amont, ni identifiants de véhicules", async () => {
    fetchMock.mockResolvedValue(
      new Response("PNGDATA", { status: 200, headers: { "content-type": "image/jpeg", "content-length": "7", etag: '"abc"', "x-cms-vehicle-ids": VEHICLE_A } }),
    );

    const response = await media("?w=1280");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("PNGDATA");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/public/cms/media/${MEDIA_ID}?w=1280`);
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("etag")).toBe('"abc"');
    expect(response.headers.get("x-cms-vehicle-ids")).toBeNull();
    for (const [name, value] of response.headers.entries()) {
      expect(`${name}: ${value}`).not.toContain(TOKEN);
      expect(`${name}: ${value}`).not.toContain(BASE_URL);
    }
  });

  it("cache CDN étiqueté d'après SYNERGY : un tag par véhicule qui utilise l'image (par identifiant) + le tag global", async () => {
    fetchMock.mockResolvedValue(image());
    const response = await media("?w=640");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(response.headers.get("vercel-cdn-cache-control")).toBe("max-age=604800");
    expect(response.headers.get("vercel-cache-tag")).toBe(
      `cms:autologgia:media,cms:autologgia:vehicle-media:${VEHICLE_A},cms:autologgia:vehicle-media:${VEHICLE_B}`,
    );
  });

  it("sans identifiant de véhicule exploitable (absent, vide, mal formé) : JAMAIS de cache partagé", async () => {
    for (const ids of [null, "", "pas-un-uuid", "../x,1"]) {
      fetchMock.mockResolvedValueOnce(image(ids));
      const response = await media("?w=640");
      expect(response.status, String(ids)).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("vercel-cdn-cache-control")).toBeNull();
      expect(response.headers.get("vercel-cache-tag")).toBeNull();
    }
  });

  it("identifiants mal formés ignorés, valides conservés (jamais un tag arbitraire)", async () => {
    fetchMock.mockResolvedValue(image(`${VEHICLE_A},evil,tag`));
    const response = await media("?w=640");
    expect(response.headers.get("vercel-cache-tag")).toBe(`cms:autologgia:media,cms:autologgia:vehicle-media:${VEHICLE_A}`);
  });

  it.each([
    ["", 1920],
    ["?w=160", 160],
    ["?w=320", 320],
    ["?w=640", 640],
    ["?w=1280", 1280],
    ["?w=1920", 1920],
  ])("URL canonique %j -> variante %i de Synergy", async (query, width) => {
    fetchMock.mockResolvedValue(image());
    expect((await media(query)).status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/api/public/cms/media/${MEDIA_ID}?w=${width}`);
  });

  it.each(["?w=1080", "?w=0640", "?w=640.0", "?w=abc", "?w=", "?w=640&w=1280", "?w=640&v=clio-3", "?v=clio-3", "?x=1"])(
    "URL non canonique %j -> 404 sans appel amont (une seule entrée de cache par image et par largeur)",
    async (query) => {
      expect((await media(query)).status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("image retirée ou devenue privée (404 amont) -> 404, jamais mise en cache", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Not found", { status: 404 }));
    const notFound = await media("?w=640");
    expect(notFound.status).toBe(404);
    expect(notFound.headers.get("vercel-cdn-cache-control")).toBeNull();
    expect(notFound.headers.get("vercel-cache-tag")).toBeNull();
    expect(notFound.headers.get("cache-control") ?? "").not.toContain("max-age");
  });

  it("CMS_SOURCE=sanity -> 404 sans aucun appel Synergy (rollback : la route se désactive)", async () => {
    process.env.CMS_SOURCE = "sanity";
    const response = await media("");
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

  it("réponse amont qui n'est pas une image -> 502 (jamais relayée)", async () => {
    fetchMock.mockResolvedValue(new Response("<html>oops</html>", { status: 200, headers: { "content-type": "text/html" } }));
    expect((await media("")).status).toBe(502);
  });

  it("erreur réseau amont -> 502 sans détail", async () => {
    fetchMock.mockRejectedValue(new Error(`connect ECONNREFUSED ${BASE_URL} ${TOKEN}`));
    const response = await media("");
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

  it("signature altérée (octet significatif inversé) -> 401", async () => {
    // Le dernier caractère base64url d'une signature de 32 octets ne porte que 4 bits utiles :
    // le remplacer peut décoder vers les MÊMES octets (signature toujours valide). On inverse donc
    // un octet décodé, ce qui change à coup sûr la signature quelle que soit la valeur du jeton.
    const [payload, signature] = createHistoryAccessToken("clio-3").token.split(".");
    const bytes = Buffer.from(signature, "base64url");
    bytes[0] ^= 0xff;
    cookieValue.value = `${payload}.${bytes.toString("base64url")}`;
    const response = await getHistory(new Request("https://site.test/x"), slugContext("clio-3"));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("payload altéré avec la signature d'origine -> 401", async () => {
    const [payload, signature] = createHistoryAccessToken("clio-3").token.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { expiresAt: number };
    const forged = Buffer.from(JSON.stringify({ ...claims, expiresAt: claims.expiresAt + 86_400 }), "utf8").toString("base64url");
    cookieValue.value = `${forged}.${signature}`;
    const response = await getHistory(new Request("https://site.test/x"), slugContext("clio-3"));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("purge la liste seule (sans slug) : immédiate, expire=0, + Full Route Cache", async () => {
    const response = await post({ siteKey: "autologgia", resource: "vehicles" });
    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("cms:autologgia:vehicles", { expire: 0 });
    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual(["/", "/catalogue", "/sitemap.xml"]);
  });

  it("purge la liste ET la fiche modifiée, y compris la page véhicule", async () => {
    const response = await post({ siteKey: "autologgia", resource: "vehicles", slug: "citroen-c1", reason: "vehicle.updated" });
    expect(response.status).toBe(200);
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(["cms:autologgia:vehicles", "cms:autologgia:vehicle:citroen-c1"]);
    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      "/",
      "/catalogue",
      "/sitemap.xml",
      "/vehicules/citroen-c1",
    ]);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(await response.json())).not.toContain(REVALIDATE_SECRET);
  });
  it("vehicleId : SUPPRIME du CDN les images du véhicule (jamais une invalidation qui resservirait l’ancienne image), même si le slug a changé", async () => {
    const VEHICLE = "22222222-2222-4222-8222-222222222222";
    const response = await post({ siteKey: "autologgia", resource: "vehicles", vehicleId: VEHICLE, slug: "nouveau-slug", reason: "vehicle.update" });
    expect(response.status).toBe(200);
    expect(dangerouslyDeleteByTag).toHaveBeenCalledTimes(1);
    expect(dangerouslyDeleteByTag).toHaveBeenCalledWith(`cms:autologgia:vehicle-media:${VEHICLE}`, { revalidationDeadlineSeconds: 0 });
  });

  it("le tag supprimé est exactement celui que /api/cms-media pose sur les images de ce véhicule", async () => {
    const VEHICLE = "22222222-2222-4222-8222-222222222222";
    fetchMock.mockResolvedValue(new Response("WEBP", { status: 200, headers: { "content-type": "image/webp", "x-cms-vehicle-ids": VEHICLE } }));
    const image = await getMedia(new Request(`https://site.test/api/cms-media/${MEDIA_ID}?w=640`), mediaContext(MEDIA_ID));
    await post({ siteKey: "autologgia", resource: "vehicles", vehicleId: VEHICLE, reason: "vehicle.archive" });
    const [deletedTag] = dangerouslyDeleteByTag.mock.calls[0] as [string];
    expect(image.headers.get("vercel-cache-tag")!.split(",")).toContain(deletedTag);
  });

  it("vehicleId mal formé -> 422 sans aucune purge ; purge des images en échec -> 503 (Synergy retente), pages non purgées", async () => {
    expect((await post({ siteKey: "autologgia", resource: "vehicles", vehicleId: "a,b" })).status).toBe(422);
    expect(dangerouslyDeleteByTag).not.toHaveBeenCalled();
    dangerouslyDeleteByTag.mockRejectedValueOnce(new Error("purge down"));
    expect((await post({ siteKey: "autologgia", resource: "vehicles", vehicleId: "22222222-2222-4222-8222-222222222222" })).status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("ancienne notification sans vehicleId (Synergy pas encore à jour) : pages purgées comme avant, aucune purge d’images", async () => {
    expect((await post({ siteKey: "autologgia", resource: "vehicles", slug: "clio-3" })).status).toBe(200);
    expect(dangerouslyDeleteByTag).not.toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalled();
  });
});

