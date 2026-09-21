#!/usr/bin/env node
// Rapport de parité Sanity <-> Synergy (LECTURE SEULE, ne corrige rien).
//
//   node scripts/cms-parity.mjs            # lit .env.local
//   SYNERGY_CMS_API_URL=... SYNERGY_CMS_DELIVERY_TOKEN=... node scripts/cms-parity.mjs --images
//
// Sanity : API publique (perspective "published"). Synergy : contrat de livraison
// existant (jeton serveur-à-serveur). Aucun secret n'est affiché. Code de sortie 1
// s'il existe au moins un écart bloquant (véhicule manquant/en trop, champ ou image
// différent) : à lancer juste avant toute bascule de CMS_SOURCE.
//
//   --images : vérifie aussi que chaque image livrée répond (télécharge les médias).

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@sanity/client";

const checkImages = process.argv.includes("--images");

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}
loadEnvFile(".env.local");

const baseUrl = process.env.SYNERGY_CMS_API_URL?.trim().replace(/\/$/, "");
const token = process.env.SYNERGY_CMS_DELIVERY_TOKEN?.trim();
if (!baseUrl || !token) {
  console.error("SYNERGY_CMS_API_URL et SYNERGY_CMS_DELIVERY_TOKEN sont requis.");
  process.exit(2);
}

const STATUS = { available: "disponible", preparing: "en_preparation", reserved: "reserve", sold: "vendu" };
const TRANSMISSION = { manual: "Manuelle", semi_automatic: "Semi-automatique", automatic: "Automatique" };
const FUEL = { petrol: "Essence", diesel: "Diesel", hybrid: "Hybride", electric: "Électrique" };
// Même règle que la migration d'origine (synergy scripts/migrate-sanity-vehicles.mjs, integerFromSanity) :
// Sanity stocke parfois ces valeurs en texte avec une unité (« 85000km », « 68 ch ») ; seuls les chiffres comptent.
const integerFromSanity = (value) => (typeof value === "number" ? value : Number.parseInt(String(value ?? "").replace(/\D/g, ""), 10));
const critAir = (value) => (value == null ? null : value === "not_applicable" ? "Non concerné" : `Crit'air ${value}`);

function signature(blocks) {
  return (blocks ?? []).map((block) => {
    const spans = [];
    for (const child of block.children ?? []) {
      const marks = [...(child.marks ?? [])].sort().join(",");
      const last = spans.at(-1);
      if (last && last[1] === marks) last[0] += child.text;
      else spans.push([child.text, marks]);
    }
    return JSON.stringify([block.style ?? "normal", block.listItem ?? "", spans]);
  });
}

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "9pij4ihx",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-01-01",
  useCdn: false,
  perspective: "published",
});
const cars = await sanity.fetch(`*[_type == "car"] | order(_createdAt desc) {
  _createdAt, _updatedAt, name, "slug": slug.current, price, numericPrice, year, mileage, transmission, fuel, power,
  status, brand, model, location, critAir, options, description, historyText,
  "images": images[defined(asset)]{ "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height },
  "hasHistoryFile": defined(historyFile.asset)
}`);

const response = await fetch(`${baseUrl}/api/public/cms/vehicles`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
if (!response.ok) {
  console.error(`Synergy a répondu HTTP ${response.status}.`);
  process.exit(2);
}
const vehicles = (await response.json()).vehicles;

const bySlug = new Map(vehicles.map((vehicle) => [vehicle.slug, vehicle]));
const sanitySlugs = new Set(cars.map((car) => car.slug));
const blocking = [];
const info = [];

console.log(`Sanity : ${cars.length} véhicules | Synergy (publiés) : ${vehicles.length} véhicules`);
for (const car of cars) if (!bySlug.has(car.slug)) blocking.push(`MANQUANT dans Synergy : ${car.slug} (statut Sanity : ${car.status})`);
for (const vehicle of vehicles) if (!sanitySlugs.has(vehicle.slug)) blocking.push(`EN TROP dans Synergy : ${vehicle.slug}`);

for (const car of cars) {
  const vehicle = bySlug.get(car.slug);
  if (!vehicle) continue;
  const compare = (field, left, right) => { if (JSON.stringify(left) !== JSON.stringify(right)) blocking.push(`${car.slug} | ${field} | Sanity=${JSON.stringify(left)} | Synergy=${JSON.stringify(right)}`); };
  compare("nom", car.name?.trim(), vehicle.name?.trim());
  compare("marque", car.brand?.trim(), vehicle.brand?.trim());
  compare("modèle", car.model?.trim(), vehicle.model?.trim());
  compare("prix (€)", Number(car.numericPrice ?? car.price), vehicle.priceCents / 100);
  compare("année", integerFromSanity(car.year), vehicle.year);
  compare("kilométrage", integerFromSanity(car.mileage), vehicle.mileageKm);
  compare("puissance", integerFromSanity(car.power), vehicle.powerHp);
  compare("boîte", car.transmission, TRANSMISSION[vehicle.transmission]);
  compare("énergie", car.fuel, FUEL[vehicle.fuel]);
  compare("statut", car.status, STATUS[vehicle.commercialStatus]);
  compare("crit'air", car.critAir ?? null, critAir(vehicle.critAir));
  compare("localisation", car.location?.trim() || null, vehicle.location?.trim() || null);
  const cleanOptions = (list) => (list ?? []).map((option) => option.trim()).filter(Boolean);
  compare("options", cleanOptions(car.options), cleanOptions(vehicle.options));
  compare("description", signature(car.description), signature(vehicle.description?.blocks));
  compare("historique (texte)", signature(car.historyText), signature(vehicle.historyText?.blocks));
  compare("images (dimensions, ordre)", (car.images ?? []).map((image) => `${image.w}x${image.h}`), vehicle.images.map((image) => `${image.width}x${image.height}`));
  compare("PDF d'historique", !!car.hasHistoryFile, !!vehicle.hasHistoryPdf);
  if ((car.options ?? []).some((option) => option !== option.trim() || option === "")) info.push(`${car.slug} | options : espaces/valeurs vides nettoyés côté Synergy (sans impact visuel)`);
  if (new Date(car._updatedAt) > new Date(vehicle.updatedAt)) info.push(`${car.slug} | Sanity modifié APRÈS Synergy (${car._updatedAt} > ${vehicle.updatedAt}) : vérifier que rien n'a été perdu`);
}

const commonOrder = (list, other) => list.filter((slug) => other.has(slug));
const sameOrder = JSON.stringify(commonOrder(cars.map((car) => car.slug), bySlug)) === JSON.stringify(commonOrder(vehicles.map((vehicle) => vehicle.slug), sanitySlugs));
if (!sameOrder) blocking.push("ORDRE d'affichage différent entre Sanity (création décroissante) et Synergy (listed_at décroissant)");

if (checkImages) {
  let ok = 0;
  let total = 0;
  for (const vehicle of vehicles) {
    for (const image of vehicle.images) {
      total++;
      const media = await fetch(`${baseUrl}/api/public/cms/media/${image.mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (media.ok && (media.headers.get("content-type") ?? "").startsWith("image/")) ok++;
      else blocking.push(`IMAGE en échec : ${vehicle.slug} ${image.mediaId} (HTTP ${media.status})`);
      await media.arrayBuffer().catch(() => undefined);
    }
  }
  console.log(`Images livrées : ${ok}/${total}`);
}

console.log(`Ordre identique : ${sameOrder ? "oui" : "NON"}`);
console.log(`\nÉcarts bloquants (${blocking.length}) :`);
for (const line of blocking) console.log(`  - ${line}`);
console.log(`\nInformations (${info.length}) :`);
for (const line of info) console.log(`  - ${line}`);
process.exit(blocking.length === 0 ? 0 : 1);
