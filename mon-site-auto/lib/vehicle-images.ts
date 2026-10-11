import { cmsMediaLoader, isCmsMediaUrl } from "@/lib/cms-media-variants";
import { urlFor } from "@/lib/sanity";
import type { CarImage, DeliveryImage } from "@/lib/types";

function isDeliveryImage(image: CarImage): image is DeliveryImage {
  return "url" in image;
}

export function getVehicleImageUrl(image: CarImage, width: number, height: number) {
  return isDeliveryImage(image) ? image.url : urlFor(image).width(width).height(height).url();
}

export function getVehicleImageAlt(image: CarImage, fallback: string) {
  return isDeliveryImage(image) ? image.altText : fallback;
}

/**
 * Loader `next/image` adapté à la source : les images du CMS Synergy
 * demandent directement leur variante WebP (voir lib/cms-media-variants.ts) ;
 * les autres (Sanity, fichiers de public/) gardent l'optimiseur par défaut.
 */
export function getVehicleImageLoader(src: string) {
  return isCmsMediaUrl(src) ? cmsMediaLoader : undefined;
}
