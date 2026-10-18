# Hydro

Application de suivi de culture en intérieur : journal, espaces modulables, équipement, crop steering, nutrition (Athena Pro Line / Blended), calendrier et graphiques.

- **Version Claude** : artefact publié sur claude.ai.
- **Version locale** : PWA hors ligne pour les amis (lot 8).

## État
Lots 1 et 2a livrés (voir `CHANGELOG.md`). Le cahier des charges et la fiche Athena sont dans le projet claude.ai « Hydro » (`claude/prompt-app-hydro.md`, `claude/athena-pro-line-fiche.md`).

- `docs/maquette-aujourdhui.html` : maquette validée de l'onglet Aujourd'hui (référence visuelle).

## Technique

Application de pilotage de culture, pensée pour le téléphone. Un seul code, deux cibles :
- **Claude** (`VITE_TARGET=claude`, par défaut) : un fichier HTML unique publié comme artefact (base `db`, photos `assets`).
- **Locale** (`VITE_TARGET=local`) : données sur l'appareil (IndexedDB). Le portage Netlify/PWA est prévu au lot 8.

### Installation
```bash
npm ci
```

### Tests
```bash
npm test            # Vitest : calculs, i18n (clés FR/EN identiques), stockage, nutrition
```

### Build
```bash
npm run build           # dist/hydro.html (format artefact, images 3D depuis le stockage d'assets)
npm run preview:build   # dist-preview/ (images intégrées, pour un aperçu local)
VITE_TARGET=local npm run build   # version locale, sans runtime Claude
```

### Structure
- `src/calc/` : calculs purs testés (formules, stade, cibles, programme d'arrosage, conseils, rappels, nutrition, repères)
- `src/equipment/calc.ts` : calculs tirés de l'équipement (PPF, PPFD, W/m², air, doses, autonomie, g/W)
- `src/model/` : types et documents (`schemaVersion` sur chacun) ; `grow.ts` = grow, espaces, modules, équipement ; `grow-ops.ts` = opérations pures
- `src/data/thomas-grow.ts` : grow pré-rempli de la version Claude
- `src/store/` : couche de stockage (artefact, local IndexedDB, mémoire pour les tests)
- `src/i18n/` : `fr.ts` / `en.ts` + formats `Intl`
- `src/data/reference.ts` : valeurs vérifiées (Athena Handbook FR V8), chacune avec sa source
- `src/screens/`, `src/components/` : écrans ; composants shadcn/ui et Magic UI copiés depuis leurs dépôts GitHub
- `scripts/` : génération des images 3D, conversion au format artefact, captures et parcours de test (Playwright)

### Ajouter une gamme d'engrais
Créer un objet `NutrientLine` (produits, tableau de dosage selon l'EC, tableaux de concentrés, règles par stade, source) dans `src/calc/nutrition.ts`, puis l'ajouter à `NUTRIENT_LINES`. Le sélecteur de gamme apparaît dès qu'il y en a deux.

### Ajouter un module
Ajouter son id à `MODULES` (`src/model/grow.ts`), l'inclure dans les `TEMPLATE_MODULES` voulus, déclarer ses champs de saisie dans `MODULE_FIELDS` (`src/model/grow-ops.ts`) et ses libellés `module.<id>` dans `fr.ts` / `en.ts` (le test i18n vérifie la parité).

## Règles de travail
- Un commit par lot (ou sous-lot), avec un CHANGELOG à jour.
- Une seule conversation à la fois sur le code.
- Tous les tests doivent passer avant chaque push.
