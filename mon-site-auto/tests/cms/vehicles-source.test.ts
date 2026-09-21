import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contrat testé : `CMS_SOURCE` choisit UNE source de catalogue.
//   sanity (défaut, valeur inconnue/absente) -> comportement historique, Synergy jamais appelé ;
//   supabase                                 -> contrat de livraison Synergy, Sanity jamais appelé.
// Le rollback se résume donc à changer la variable d'environnement.

const sanityFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/sanity", () => ({ sanityFetch }));

import { getCmsSource, getSynergyDeliveryConfig } from "@/lib/cms/config";
import {
  getAllVehicles,
  getRecentVehicles,
  getSitemapVehicles,
  getVehicleBySlug,
  getVehicleMetadataBySlug,
} from "@/lib/cms/vehicles";

const BASE_URL = "https://synergy.example";
const TOKEN = "t".repeat(43);
const MEDIA_A = "11111111-1111-4111-8111-111111111111";
const MEDIA_B = "22222222-2222-4222-8222-222222222222";

function richText(text: string, marks: string[] = []) {
  return { version: 1, blocks: [{ type: "paragraph", style: "normal", children: [{ text, marks }] }] };
}

function deliveryVehicle(overrides: Record<string, unknown> = {}) {
  return {
    slug: "citroen-c1",
    name: "Citroën C1 1.0",
    brand: "Citroën",
    model: "C1",
    commercialStatus: "available",
    priceCents: 350000,
    year: 2006,
    mileageKm: 98000,
    transmission: "manual",
    fuel: "petrol",
    powerHp: 68,
    location: "06110, le Cannet",
    critAir: "2",
    description: richText("Petite citadine", ["em"]),
    options: ["Vitres électriques"],
    historyText: richText(""),
    listedAt: "2026-09-04T15:44:06+00:00",
    updatedAt: "2026-09-07T09:58:24+00:00",
    hasHistoryPdf: false,
    images: [
      { mediaId: MEDIA_A, position: 0, altText: "Face avant", width: 1206, height: 896 },
      { mediaId: MEDIA_B, position: 1, altText: "Profil", width: 1206, height: 917 },
    ],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const fetchMock = vi.fn();
const savedEnv = { ...process.env };

beforeEach(() => {
  fetchMock.mockReset();
  sanityFetch.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.SYNERGY_CMS_API_URL = `${BASE_URL}/`;
  process.env.SYNERGY_CMS_DELIVERY_TOKEN = TOKEN;
  delete process.env.CMS_SOURCE;
  delete process.env.CMS_SITE_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...savedEnv };
});

describe("CMS_SOURCE : sélection de la source", () => {
  it.each([undefined, "", "sanity", "SANITY", "n'importe quoi", "supabase-preview", "true"])(
    "%j -> sanity (repli sûr)",
    (value) => {
      if (value === undefined) delete process.env.CMS_SOURCE;
      else process.env.CMS_SOURCE = value;
      expect(getCmsSource()).toBe("sanity");
    },
  );

  it.each(["supabase", "SUPABASE", "  Supabase \n"])("%j -> supabase", (value) => {
    process.env.CMS_SOURCE = value;
    expect(getCmsSource()).toBe("supabase");
  });

  it("la configuration Synergy exige URL et jeton, sans jamais afficher leurs valeurs", () => {
    delete process.env.SYNERGY_CMS_DELIVERY_TOKEN;
    expect(() => getSynergyDeliveryConfig()).toThrowError(/SYNERGY_CMS_API_URL et SYNERGY_CMS_DELIVERY_TOKEN/);
    try {
      getSynergyDeliveryConfig();
    } catch (error) {
      expect(String(error)).not.toContain(BASE_URL);
    }
  });

  it("supprime le « / » final de l'URL de base", () => {
    expect(getSynergyDeliveryConfig().baseUrl).toBe(BASE_URL);
  });
});

describe("CMS_SOURCE=sanity : l'ancienne source fonctionne toujours", () => {
  it("catalogue : requête GROQ triée par création décroissante, Synergy jamais appelé", async () => {
    process.env.CMS_SOURCE = "sanity";
    sanityFetch.mockResolvedValue([{ name: "Sanity car", slug: "sanity-car" }]);

    const cars = await getAllVehicles();

    expect(cars).toEqual([{ name: "Sanity car", slug: "sanity-car" }]);
    expect(sanityFetch).toHaveBeenCalledTimes(1);
    expect(sanityFetch.mock.calls[0][0]).toContain('_type == "car"');
    expect(sanityFetch.mock.calls[0][0]).toContain("order(_createdAt desc)");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("véhicules récents : 3 derniers via GROQ", async () => {
    process.env.CMS_SOURCE = "sanity";
    sanityFetch.mockResolvedValue([]);
    await getRecentVehicles();
    expect(sanityFetch.mock.calls[0][0]).toContain("[0..2]");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fiche, metadata et sitemap : paramètre slug transmis, Synergy jamais appelé", async () => {
    process.env.CMS_SOURCE = "sanity";
    sanityFetch.mockResolvedValue(null);

    expect(await getVehicleBySlug("mon-slug")).toBeNull();
    expect(sanityFetch.mock.calls[0][1]).toEqual({ slug: "mon-slug" });
    await getVehicleMetadataBySlug("mon-slug");
    expect(sanityFetch.mock.calls[1][1]).toEqual({ slug: "mon-slug" });
    await getSitemapVehicles();
    expect(sanityFetch.mock.calls[2][0]).toContain('"updatedAt": _updatedAt');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fonctionne même sans aucune variable Synergy (rollback pur)", async () => {
    delete process.env.SYNERGY_CMS_API_URL;
    delete process.env.SYNERGY_CMS_DELIVERY_TOKEN;
    sanityFetch.mockResolvedValue([]);
    await expect(getAllVehicles()).resolves.toEqual([]);
  });
});

describe("CMS_SOURCE=supabase : le catalogue vient de Synergy", () => {
  beforeEach(() => {
    process.env.CMS_SOURCE = "supabase";
  });

  it("liste : appelle le contrat de livraison en serveur-à-serveur, Sanity jamais appelé", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle()] }));

    const cars = await getAllVehicles();

    expect(cars).toHaveLength(1);
    expect(sanityFetch).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/public/cms/vehicles`);
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    // Cache : filet de 300 s + tag d'invalidation à la demande (voir lib/cms/tags.ts).
    expect(init.next.revalidate).toBe(300);
    expect(init.next.tags).toEqual(["cms:autologgia:vehicles"]);
  });

  it("mappe exactement les champs du rendu actuel (prix, statut, boîte, énergie, Crit'Air, images)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle()] }));

    const [car] = await getAllVehicles();

    expect(car).toMatchObject({
      name: "Citroën C1 1.0",
      slug: "citroen-c1",
      price: 3500,
      numericPrice: 3500,
      year: 2006,
      mileage: 98000,
      transmission: "Manuelle",
      fuel: "Essence",
      power: 68,
      status: "disponible",
      location: "06110, le Cannet",
      critAir: "Crit'air 2",
      options: ["Vitres électriques"],
      brand: "Citroën",
      model: "C1",
      hasHistoryFile: false,
      updatedAt: "2026-09-07T09:58:24+00:00",
    });
    expect(car.description).toEqual([
      expect.objectContaining({ _type: "block", style: "normal", children: [expect.objectContaining({ text: "Petite citadine", marks: ["em"] })] }),
    ]);
  });

  it.each([
    ["available", "disponible"],
    ["preparing", "en_preparation"],
    ["reserved", "reserve"],
    ["sold", "vendu"],
  ])("statut commercial %s -> %s", async (commercialStatus, expected) => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle({ commercialStatus })] }));
    expect((await getAllVehicles())[0].status).toBe(expected);
  });

  it.each([
    ["manual", "Manuelle"],
    ["semi_automatic", "Semi-automatique"],
    ["automatic", "Automatique"],
  ])("boîte %s -> %s", async (transmission, expected) => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle({ transmission })] }));
    expect((await getAllVehicles())[0].transmission).toBe(expected);
  });

  it.each([
    ["petrol", "Essence"],
    ["diesel", "Diesel"],
    ["hybrid", "Hybride"],
    ["electric", "Électrique"],
  ])("énergie %s -> %s", async (fuel, expected) => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle({ fuel })] }));
    expect((await getAllVehicles())[0].fuel).toBe(expected);
  });

  it.each([
    ["0", "Crit'air 0"],
    ["5", "Crit'air 5"],
    ["not_applicable", "Non concerné"],
    [null, undefined],
  ])("Crit'Air %s -> %s", async (critAir, expected) => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle({ critAir })] }));
    expect((await getAllVehicles())[0].critAir).toBe(expected);
  });

  it("images : URLs relatives /api/cms-media/<id> (aucun secret, aucune URL Supabase), ordre conservé, alt fourni", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle()] }));

    const [car] = await getAllVehicles();

    expect(car.images).toEqual([
      { _key: MEDIA_A, url: `/api/cms-media/${MEDIA_A}`, altText: "Face avant", width: 1206, height: 896 },
      { _key: MEDIA_B, url: `/api/cms-media/${MEDIA_B}`, altText: "Profil", width: 1206, height: 917 },
    ]);
    const serialized = JSON.stringify(car);
    expect(serialized).not.toContain(TOKEN);
    expect(serialized).not.toContain("supabase");
  });

  it("véhicule sans champ optionnel : aucune valeur inventée, aucune erreur", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        vehicles: [deliveryVehicle({ location: null, critAir: null, options: [], description: { version: 1, blocks: [] }, historyText: { version: 1, blocks: [] }, images: [], hasHistoryPdf: false })],
      }),
    );

    const [car] = await getAllVehicles();

    expect(car.location).toBeUndefined();
    expect(car.critAir).toBeUndefined();
    expect(car.options).toEqual([]);
    // Absence = undefined (comme le `null` de Sanity) : `[]` serait truthy et ferait afficher une
    // section « Description » vide et l'invite « Accédez à l'historique » sans historique.
    expect(car.description).toBeUndefined();
    expect(car.historyText).toBeUndefined();
    expect(car.images).toEqual([]);
  });

  it("texte enrichi vide ou blanc (paragraphe vide, espaces) -> traité comme absent", async () => {
    const blank = { version: 1, blocks: [{ type: "paragraph", style: "normal", children: [{ text: "   ", marks: [] }] }, { type: "paragraph", style: "normal", children: [] }] };
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle({ description: blank, historyText: blank })] }));
    const [car] = await getAllVehicles();
    expect(car.description).toBeUndefined();
    expect(car.historyText).toBeUndefined();
  });

  it("texte enrichi renseigné : conservé (historique présent -> l'invite d'accès reste affichée)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle({ historyText: richText("Entretien complet chez le concessionnaire") })] }));
    const [car] = await getAllVehicles();
    expect(car.historyText).toHaveLength(1);
    expect(car.description).toHaveLength(1);
  });

  it("le PDF d'historique n'expose jamais d'URL dans la fiche : seulement un indicateur", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [deliveryVehicle({ hasHistoryPdf: true })] }));
    const [car] = await getAllVehicles();
    expect(car.hasHistoryFile).toBe(true);
    expect(car.historyFile).toBeUndefined();
  });

  it("ordre : celui de Synergy (listed_at décroissant) est conservé tel quel", async () => {
    const slugs = ["c", "a", "b", "d"];
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: slugs.map((slug) => deliveryVehicle({ slug })) }));
    expect((await getAllVehicles()).map((car) => car.slug)).toEqual(slugs);
  });

  it("catalogue vide : liste vide (l'état vide de la page prend le relais)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [] }));
    await expect(getAllVehicles()).resolves.toEqual([]);
  });

  it("véhicules récents : les 3 premiers", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: ["a", "b", "c", "d", "e"].map((slug) => deliveryVehicle({ slug })) }));
    expect((await getRecentVehicles()).map((car) => car.slug)).toEqual(["a", "b", "c"]);
  });
});

describe("CMS_SOURCE=supabase : fiche véhicule", () => {
  beforeEach(() => {
    process.env.CMS_SOURCE = "supabase";
  });

  it("slug valide : requête ciblée avec tags catalogue + fiche", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicle: deliveryVehicle() }));

    const car = await getVehicleBySlug("citroen-c1");

    expect(car?.name).toBe("Citroën C1 1.0");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/public/cms/vehicles/citroen-c1`);
    expect(init.next.tags).toEqual(["cms:autologgia:vehicles", "cms:autologgia:vehicle:citroen-c1"]);
    expect(sanityFetch).not.toHaveBeenCalled();
  });

  it("slug inconnu (404 Synergy) -> null : la page affiche son état « Véhicule introuvable » actuel", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Véhicule introuvable." }, 404));
    await expect(getVehicleBySlug("inconnu")).resolves.toBeNull();
    await expect(getVehicleMetadataBySlug("inconnu")).resolves.toBeNull();
  });

  it("le slug est encodé (aucune injection de chemin ou de requête)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));
    await getVehicleBySlug("../../admin?x=1#y");
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/api/public/cms/vehicles/${encodeURIComponent("../../admin?x=1#y")}`);
    expect(fetchMock.mock.calls[0][0]).not.toContain("/admin?");
  });

  it("metadata : nom, prix et description seulement", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ vehicle: deliveryVehicle() }));
    const metadata = await getVehicleMetadataBySlug("citroen-c1");
    expect(metadata).toEqual({ name: "Citroën C1 1.0", price: 3500, numericPrice: 3500, description: expect.any(Array) });
  });
});

describe("CMS_SOURCE=supabase : sitemap", () => {
  it("slugs triés, date de mise à jour de Synergy, repli sur epoch si absente", async () => {
    process.env.CMS_SOURCE = "supabase";
    fetchMock.mockResolvedValue(
      jsonResponse({
        vehicles: [
          deliveryVehicle({ slug: "zeta", updatedAt: "2026-09-10T00:00:00+00:00" }),
          deliveryVehicle({ slug: "alpha", updatedAt: undefined }),
        ],
      }),
    );

    const entries = await getSitemapVehicles();

    expect(entries).toEqual([
      { slug: "alpha", updatedAt: new Date(0).toISOString() },
      { slug: "zeta", updatedAt: "2026-09-10T00:00:00+00:00" },
    ]);
    expect(sanityFetch).not.toHaveBeenCalled();
  });
});

describe("CMS_SOURCE=supabase : erreurs de l'API consumer", () => {
  beforeEach(() => {
    process.env.CMS_SOURCE = "supabase";
  });

  it.each([401, 403, 429, 500, 503])("HTTP %s sur la liste -> erreur explicite sans fuite du jeton", async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "boom" }, status));
    const error = (await getAllVehicles().catch((reason: unknown) => reason)) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(String(status));
    expect(error.message).not.toContain(TOKEN);
    expect(error.message).not.toContain(BASE_URL);
  });

  it("HTTP 500 sur une fiche -> erreur (jamais confondu avec « introuvable »)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "boom" }, 500));
    await expect(getVehicleBySlug("citroen-c1")).rejects.toThrow(/500/);
  });

  it("réseau coupé -> l'erreur remonte (ISR conserve la dernière page valide)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(getAllVehicles()).rejects.toThrow(/fetch failed/);
  });

  it("configuration Synergy absente -> erreur de configuration, aucun appel réseau", async () => {
    delete process.env.SYNERGY_CMS_API_URL;
    await expect(getAllVehicles()).rejects.toThrow(/SYNERGY_CMS_API_URL/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CMS_SITE_KEY personnalise le préfixe des tags de cache", async () => {
    process.env.CMS_SITE_KEY = "autre-site";
    fetchMock.mockResolvedValue(jsonResponse({ vehicles: [] }));
    await getAllVehicles();
    expect(fetchMock.mock.calls[0][1].next.tags).toEqual(["cms:autre-site:vehicles"]);
  });
});
