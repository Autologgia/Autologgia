# Checklist de préparation à la production

Cette checklist prépare la mise en ligne sans effectuer de merge, push ou
déploiement.

## 1. Configuration

- Définir `CMS_SOURCE=supabase` pour activer la livraison CMS Synergy.
- Définir `SYNERGY_CMS_API_URL` avec une URL HTTPS de production joignable au
  moment du build et à l'exécution.
- Définir des secrets distincts pour `SYNERGY_CMS_DELIVERY_TOKEN`,
  `SYNERGY_LEAD_INGESTION_TOKEN`, `CMS_REVALIDATE_SECRET` et
  `HISTORY_ACCESS_SECRET`.
- Utiliser au moins 32 caractères aléatoires pour `HISTORY_ACCESS_SECRET`.
- Configurer `CMS_REVALIDATE_SECRET` avec la même valeur que
  `CMS_CONSUMER_SECRET_AUTOLOGGIA` dans Synergy.
- Configurer `RESEND_API_KEY`, `RESEND_FROM_EMAIL` avec un domaine vérifié et
  `RESEND_TO_EMAIL` avec la boîte qui doit recevoir les demandes.
- Conserver tous les tokens sans préfixe `NEXT_PUBLIC_`.
- Ne conserver `SANITY_WRITE_TOKEN` que si la copie historique des estimations
  dans Sanity est encore voulue pendant la transition.

## 2. Contrôles automatisés

Depuis `mon-site-auto` :

```bash
npm test
npm run lint
npm run build
```

Le build avec `CMS_SOURCE=supabase` nécessite une API Synergy accessible. Il est
préférable qu'il échoue si cette dépendance ou ses identifiants sont invalides,
plutôt que de publier silencieusement un catalogue vide.

Avant bascule du CMS, exécuter aussi :

```bash
node scripts/cms-parity.mjs
```

Le script doit terminer sans écart bloquant.

## 3. Contrôles manuels en environnement de prévisualisation

- Vérifier l'accueil, le catalogue, une fiche véhicule et le sitemap.
- Vérifier une image Synergy et le téléchargement protégé d'un historique PDF.
- Soumettre les quatre parcours : contact accueil, contact général, intérêt
  véhicule et historique véhicule.
- Soumettre une estimation avec et sans photos.
- Vérifier la réception Resend et la création/déduplication du lead dans
  Synergy avec le même identifiant de soumission lors d'une nouvelle tentative.
- Refuser le suivi : aucune clé `synergy_attribution_v1` ne doit subsister dans
  `localStorage` et aucun événement GA4 ne doit partir.
- Accepter le suivi : l'attribution peut être stockée, puis doit être jointe au
  prochain formulaire. Retirer ensuite le consentement et vérifier sa
  suppression.
- Vérifier les réponses 400, 413, 429 et 502 des formulaires sans exposer de
  secret ou de détail interne.

## 4. Sécurité et exploitation

- Activer une limitation de débit distribuée au niveau de l'hébergeur pour
  `/api/contact` et `/api/estimation`. La limitation en mémoire du processus
  n'est qu'un filet local et n'est pas globale entre instances serverless.
- Configurer des alertes sur les journaux `[synergy-leads]`, `[api/contact]`,
  `[api/estimation]`, `[cms-media]` et `[vehicle-history]`.
- Ne jamais journaliser les tokens, les contenus de message, les emails ou les
  numéros de téléphone.
- Prévoir la rotation indépendante de chaque secret et documenter son
  propriétaire.

## 5. Bascule et retour arrière

- Conserver la version de production et les valeurs de configuration
  précédentes avant toute bascule.
- Déployer d'abord en prévisualisation et exécuter les contrôles manuels.
- Basculer `CMS_SOURCE` seulement après validation de la parité et de la santé
  de Synergy.
- En cas d'incident CMS, revenir à `CMS_SOURCE=sanity` puis redéployer la version
  validée précédente.
- En cas d'incident d'ingestion de leads, retirer temporairement
  `SYNERGY_LEAD_INGESTION_TOKEN` : l'envoi Resend reste opérationnel et sert de
  filet métier, mais une reprise manuelle des demandes sera nécessaire.
