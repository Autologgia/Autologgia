// Images du CMS Synergy servies par /api/cms-media/<id> : jeu FERMÉ de largeurs
// WebP, miroir de CMS_IMAGE_VARIANT_WIDTHS côté Synergy
// (synergy-app/src/lib/cms/image-variants.ts). Synergy ramène de toute façon
// chaque `?w=` sur l'une d'elles ; les arrondir ici aussi garde UNE seule URL
// (donc une seule entrée de cache CDN) par image et par largeur.
//
// Pourquoi pas l'optimiseur `next/image` de Vercel : pour chaque largeur et
// chaque format demandés, dans chaque région, il retéléchargeait l'ORIGINAL
// (1,3 Mo en moyenne) à travers la fonction de ce site puis celle de Synergy.
// C'est ce qui a épuisé le quota Fast Origin Transfer le 2026-10-10. Les
// variantes sont déjà produites et stockées par Synergy, au même WebP q75.
//
// Module sans secret, importable par les composants client : d'où sa place hors
// de lib/cms/, dont tous les modules sont réservés au serveur.

export const CMS_MEDIA_WIDTHS = [160, 320, 640, 1280, 1920] as const;

export type CmsMediaWidth = (typeof CMS_MEDIA_WIDTHS)[number];

/** Largeur servie quand aucune n'est demandée (anciennes URL sans `?w=`). */
export const CMS_MEDIA_DEFAULT_WIDTH: CmsMediaWidth = 1920;

export const CMS_MEDIA_PATH_PREFIX = "/api/cms-media/";

/** Plus petite variante couvrant `requested` (la plus grande au-delà). */
export function snapCmsMediaWidth(requested: number): CmsMediaWidth {
  for (const width of CMS_MEDIA_WIDTHS) {
    if (width >= requested) return width;
  }
  return CMS_MEDIA_WIDTHS[CMS_MEDIA_WIDTHS.length - 1];
}

export function isCmsMediaWidth(value: number): value is CmsMediaWidth {
  return (CMS_MEDIA_WIDTHS as readonly number[]).includes(value);
}

/** URL publique d'une image de véhicule (une seule par image : la largeur vient du loader). */
export function cmsMediaUrl(mediaId: string): string {
  return `${CMS_MEDIA_PATH_PREFIX}${mediaId}`;
}

export function isCmsMediaUrl(src: string): boolean {
  return src.startsWith(CMS_MEDIA_PATH_PREFIX);
}

/** Loader `next/image` : demande directement la variante, sans passer par /_next/image. */
export function cmsMediaLoader({ src, width }: { src: string; width: number }): string {
  return `${src}?w=${snapCmsMediaWidth(width)}`;
}
