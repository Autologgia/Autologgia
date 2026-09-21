# Autologgia

Application publique Next.js d'Autologgia. Elle lit le catalogue depuis Sanity
ou depuis l'API CMS Synergy, envoie les formulaires avec Resend et peut transférer
les leads à Synergy côté serveur.

## Démarrage local

Installer les dépendances puis lancer le serveur de développement :

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Copier les variables nécessaires depuis `.env.example` dans `.env.local`. Ne
jamais préfixer les tokens serveur par `NEXT_PUBLIC_`.

## Validation locale

```bash
npm test
npm run lint
npm run build
```

Avec `CMS_SOURCE=supabase`, le build prérend les pages catalogue et exige que
`SYNERGY_CMS_API_URL` soit joignable. Un échec réseau doit être traité comme un
échec de configuration ou de dépendance, et non masqué par un catalogue vide.

## Mise en production

La checklist détaillée se trouve dans
[`docs/production-readiness.md`](docs/production-readiness.md).

## Scripts

- `npm run dev` : développement local
- `npm test` : tests Vitest
- `npm run lint` : contrôle ESLint
- `npm run build` : build Next.js de production
- `npm start` : exécution du build
