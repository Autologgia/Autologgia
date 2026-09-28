# Leads Autologgia → Synergy

Envoi serveur-à-serveur des soumissions de formulaires vers l'ingestion
Synergy (`POST /api/public/leads`). Le dépôt Synergy est séparé : ce document
fixe le contrat partagé, et `tests/leads/synergy-contract.test.ts` le vérifie
automatiquement sur le payload réellement émis.

## Principe

L'email Resend reste la voie de notification principale et **inchangée**.
Synergy est alimenté en plus, en best-effort : une panne côté Synergy ne
dégrade jamais la réponse au visiteur.

```
Formulaire (navigateur)
  → POST /api/contact | /api/estimation   (route serveur Autologgia)
      1. validation + honeypot + rate limit
      2. email Resend            ← bloquant : un échec renvoie une erreur
      3. forwardLeadToSynergy()  ← best-effort : un échec est seulement journalisé
```

## Formulaires couverts

| `formKey` | Origine | Contexte produit |
|---|---|---|
| `general_contact` | `components/ContactForm.tsx` (page contact) | `label` = véhicule si `?vehicule=` |
| `homepage_contact` | `components/HomepageContactForm.tsx` | — |
| `vehicle_history` | `components/HistoryGate.tsx` | `slug` + `label` du véhicule |
| `vehicle_estimation` | `components/EstimateForm.tsx` | bloc `estimation` structuré |

## Payload émis

```jsonc
{
  "name": "Jean Dupont",           // obligatoire ; synthétisé pour l'estimation
  "email": "jean@example.fr",      // au moins un des deux
  "phone": "+33612345678",
  "message": "…",
  "subject": "Achat d'un véhicule", // champ « sujet » du formulaire d'accueil
  "source": "autologgia",          // constante, alimente prospects.source
  "formKey": "homepage_contact",
  "product": {
    "type": "vehicle",             // ou "vehicle_estimation"
    "slug": "porsche-boxster-s-987",
    "label": "Porsche Boxster S 987",
    "estimation": {                // estimation uniquement
      "brand": "Porsche", "model": "911", "year": 2020, "mileage": 42000,
      "power": 450, "fuel": "essence", "transmission": "automatique",
      "version": "Carrera", "condition": "bon", "location": "Le Cannet"
    }
  },
  "attribution": {
    "firstLandingPage": "/", "conversionPage": "/contact",
    "referrer": "https://www.google.com/",
    "utmSource": "google", "utmMedium": "cpc", "utmCampaign": "…",
    "utmContent": null, "utmTerm": null,
    "gclid": "…", "fbclid": null, "msclkid": null
  },
  "idempotencyKey": "ce45bf8f-af4c-46e4-8476-64bbc3d8fef3"  // UUID v4 obligatoire
}
```

Le payload **ne porte jamais** `site_id`, `company_id`, `role` ni `tenant` :
Synergy résout le site par le seul token d'ingestion.

### Bornes (miroir de `src/lib/leads/validation.ts` côté Synergy)

`name` 200 · `email` 320 · `phone` 30 · `message` 5000 · `subject` 300 ·
`source` 120 · `formKey` 100 · `idempotencyKey` 200 (UUID v4) ·
`product.type` 60 · `product.externalId` 200 · `product.slug` 200 ·
`product.label` 300 · champs d'estimation 120 · URLs d'attribution 500 ·
UTM et identifiants de clic 200 · **corps total 16 Ko**.

Les limites d'Autologgia sont plus strictes sur plusieurs champs (message 3000,
email 120, nom 100) : c'est volontaire, et le test de contrat vérifie que la
troncature côté Autologgia précède toujours celle de Synergy.

## Déduplication

Le navigateur génère un `submissionId` (UUID v4) **une fois par saisie**, qu'il
conserve tant que l'envoi n'a pas abouti et ne renouvelle qu'après un succès.
Il sert simultanément de :

- clé d'idempotence Resend (`autologgia-contact-<id>` / `autologgia-estimation-<id>`) ;
- `idempotencyKey` Synergy.

Un réessai après erreur réseau ne crée donc ni second email ni second prospect.
Une clé absente ou mal formée est remplacée côté serveur par un UUID v4 valide :
le lead part quand même, seule la déduplication de ce rejeu précis est perdue.

## Attribution et consentement

`lib/attribution.ts` conserve l'attribution first-touch en `localStorage`
(30 jours, jamais écrasée avant expiration). L'écriture et la lecture sont
conditionnées au consentement mesure d'audience, et le stock est effacé si le
consentement est retiré (`components/AttributionCapture.tsx`).

`conversionPage` fait exception : c'est la page où le visiteur soumet lui-même
le formulaire, elle ne sort d'aucun stockage et le serveur la connaîtrait via
l'en-tête `Referer`. Elle est donc toujours jointe, pour qu'un lead issu d'un
visiteur ayant refusé les cookies garde un contexte de page exploitable.

Le référent est réduit à `origine + chemin` : sa query string peut transporter
des données personnelles d'un site tiers, jamais transmises à Synergy.

## Configuration

| Variable | Rôle |
|---|---|
| `SYNERGY_CMS_API_URL` | Base d'URL Synergy, **partagée** avec la livraison CMS |
| `SYNERGY_LEAD_INGESTION_TOKEN` | Token d'ingestion **dédié**, serveur uniquement |

Le token se génère côté Synergy (`npm run leads:ingestion:token`) et n'est
jamais exposé via `NEXT_PUBLIC_*` — `tests/cms/no-client-secrets.test.ts` le
vérifie statiquement.

Sans token configuré, les formulaires fonctionnent normalement (email inchangé)
et l'absence d'ingestion est journalisée :
`[synergy-leads] ingestion not configured`.

## Journalisation

| Message | Signification |
|---|---|
| `[synergy-leads] ingestion not configured` | URL ou token manquant |
| `[synergy-leads] payload too large` | > 16 Ko, non envoyé (Synergy répondrait 413) |
| `[synergy-leads] ingestion rejected` | Synergy a répondu un statut d'erreur |
| `[synergy-leads] forward failed` | Réseau indisponible ou timeout (5 s) |

Chaque ligne porte le `submissionId`, qui permet de relier un lead manquant à
l'email correspondant.
