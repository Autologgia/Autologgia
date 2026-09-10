import "server-only";

/**
 * Espace de nommage des tags de cache CMS.
 *
 * Chaque tag est préfixé par le `site_key` du site pour rester multi-client :
 * un futur site sur mesure aura son propre préfixe, sans collision possible
 * avec les entrées de cache d'Autologgia. Aucune dépendance à `template_key`.
 */

export function cmsSiteKey(): string {
  return process.env.CMS_SITE_KEY?.trim() || "autologgia";
}

/** Tag couvrant la liste des véhicules (catalogue, accueil, sitemap). */
export function vehiclesTag(siteKey: string = cmsSiteKey()): string {
  return `cms:${siteKey}:vehicles`;
}

/** Tag couvrant une fiche véhicule précise. */
export function vehicleTag(slug: string, siteKey: string = cmsSiteKey()): string {
  return `cms:${siteKey}:vehicle:${slug}`;
}
