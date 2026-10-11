import { describe, expect, it } from "vitest";

import { CMS_MEDIA_WIDTHS, cmsMediaLoader, cmsMediaUrl, snapCmsMediaWidth } from "@/lib/cms-media-variants";
import { getVehicleImageLoader } from "@/lib/vehicle-images";

// Largeurs que next/image demande au loader : imageSizes + deviceSizes par défaut de Next 16.
const NEXT_IMAGE_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const MEDIA_ID = "11111111-1111-4111-8111-111111111111";

describe("images CMS : variantes Synergy sans optimiseur Vercel", () => {
  it("jeu fermé identique à CMS_IMAGE_VARIANT_WIDTHS de Synergy", () => {
    expect([...CMS_MEDIA_WIDTHS]).toEqual([160, 320, 640, 1280, 1920]);
  });

  it("toute largeur demandée par next/image retombe sur une variante, jamais plus petite que demandé (sauf au-delà de 1920)", () => {
    for (const width of NEXT_IMAGE_WIDTHS) {
      const snapped = snapCmsMediaWidth(width);
      expect(CMS_MEDIA_WIDTHS).toContain(snapped);
      if (width <= 1920) expect(snapped).toBeGreaterThanOrEqual(width);
    }
    // 16 largeurs next/image -> 5 URL distinctes seulement (5 entrées de cache par image).
    expect(new Set(NEXT_IMAGE_WIDTHS.map(snapCmsMediaWidth)).size).toBe(5);
  });

  it("le loader ajoute ?w= à l'URL de l'image (qui porte déjà ?v=<slug>) et ne passe jamais par /_next/image", () => {
    const src = cmsMediaUrl(MEDIA_ID, "clio-3");
    expect(src).toBe(`/api/cms-media/${MEDIA_ID}?v=clio-3`);
    expect(cmsMediaLoader({ src, width: 828 })).toBe(`/api/cms-media/${MEDIA_ID}?v=clio-3&w=1280`);
    expect(cmsMediaLoader({ src: `/api/cms-media/${MEDIA_ID}`, width: 256 })).toBe(`/api/cms-media/${MEDIA_ID}?w=320`);
  });

  it("slug inattendu : pas de ?v= (jamais une valeur arbitraire dans l'URL)", () => {
    expect(cmsMediaUrl(MEDIA_ID, "../x")).toBe(`/api/cms-media/${MEDIA_ID}`);
  });

  it("seules les images CMS changent de loader ; Sanity et public/ gardent l'optimiseur par défaut", () => {
    expect(getVehicleImageLoader(`/api/cms-media/${MEDIA_ID}?v=clio-3`)).toBe(cmsMediaLoader);
    expect(getVehicleImageLoader("https://cdn.sanity.io/images/p/d/abc-800x600.jpg")).toBeUndefined();
    expect(getVehicleImageLoader("/logo.png")).toBeUndefined();
  });
});
