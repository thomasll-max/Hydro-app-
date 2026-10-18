# État du build — app Hydro

> Document de passage de relais entre sessions. **Source de vérité : ce fichier dans le dépôt (`docs/etat-du-build.md`).** Toute session qui termine un lot le met à jour dans le même commit que le code. La suivante le lit en premier.

## Références
- Cahier des charges : `docs/cahier-des-charges.md`
- Fiche Athena (Pro Line, Blended, add-ons) : `docs/athena-fiche.md`
- Maquette validée : `docs/maquette-aujourdhui.html`
- **Artefact Hydro (à republier, toujours le même)** : https://claude.ai/artifact/CPfncsJe9Yi21RMwHSLqYC (version 13 = lot 4a ; 14 = lot 4b ; 15 = lot 5a ; 16 = lot 5b ; 17 = lot 6a ; 18 = lot 6b, avec la capacité `sample` ajoutée sur accord de Thomas ; 19 = lot 9a ; 20 = lot 9 ; 21 = menu langue / thème)
- **Dépôt GitHub (privé)** : `thomasll-max/Hydro-app-` (ancien nom `hydro-app-`, qui redirige), branche `main`
  - Lots 1 à 6b et 9 poussés le 18/10/2026. Dernier commit de lot : « Lot 9 : tâche du matin, réglages par espace, finition ».
  - `release/hydro.html` = copie de `dist/hydro.html` du dernier lot (à publier depuis une conversation du projet si la session n'a pas l'outil Artifact).
  - Le lot 7 ne garde que l'élargissement multi-marques de la Nutrition (GitHub est déjà en place).

## Lots
- [x] Lot 1 : squelette, navigation, design system, thèmes, i18n, assets 3D, couche de stockage
- [x] Lot 2a : données + équipement (artefact v10)
- [x] Lot 2b : journal + Aujourd'hui (artefact v11, 102 tests)
- [x] Lot 3 : calendrier (artefact v12, 117 tests)
- [x] Lot 4a : nutrition à catalogue (141 tests)
- [x] Lot 4b : arrosage depuis l'équipement, arrosage manuel par gamme (151 tests)
- [x] Lot 5a : pH / Balance, IPW (161 tests)
- [x] Lot 5b : lumière, climat (171 tests)
- [x] Lot 6a : graphiques (179 tests)
- [x] Lot 6b : export / import JSON, « Demander à Claude » (186 tests)
- [x] Lot 9 : tâche du matin + passe de finition (189 tests) — **en attente de la validation de Thomas**
- [ ] Lot 7 : nutrition multi-marques (après validation)
- [ ] Lot 8 : version locale (Netlify relié au dépôt, après validation)

## Règles de relais
1. **Une seule session à la fois** sur le code. Si deux tournent quand même : avant chaque commit **et** chaque republication, `git fetch`, se remettre sur `main`, relancer tous les tests et publier un build qui contient le travail de l'autre.
2. Début de session : vérifier que tous les lots précédant ceux demandés sont cochés ici, sinon s'arrêter et prévenir Thomas. Puis `npm ci` et **tous les tests**, qui doivent passer avant toute modification.
3. Fin de lot : tests verts, captures, republication sur **le même artefact**, commit + push sur `main` (un commit par lot ou sous-lot, avec le CHANGELOG **et ce fichier** à jour).
4. Si GitHub est inaccessible : livrer un zip du code source et le signaler.

## Décisions de Thomas sur les add-ons (18/10/2026), à respecter au lot 4
- **Fade, Cleanse, Balance** : activés par défaut (Balance = pH up, eau douce de Bergen).
- **IPW** : pas encore acheté. Outil au lot 5, **désactivé par défaut**.
- **Pas de CaMg ni de PK** (Pro Line).
- **Proper** (Athena, terpene booster, humiques/fulviques) : absent du Handbook V8, aucune dose publiée. C'est un **produit perso dans le bidon** (`customProducts/proper`, `application: "tank"`). Dose et semaines **saisies depuis l'étiquette**, vides tant que Thomas ne les a pas saisies ; source affichée « étiquette ». Rien d'inventé.
- **Great White** (mycorhizes) : **une seule application au rempotage ou au transfert, saupoudrée sur les racines, jamais dans le bidon** (`customProducts/great-white`, `application: "roots"`, `onEvent: "transfer"`). Rappel automatique à la date « Transfert prévu » (lot 3).

## Lot 2a — notes

### Écarts ou décisions
- L'ancien découpage avait déjà livré : cycle unique, journal, saisie, outils Arrosage (P0–P3, manuel, mode capteur) et Nutrition Pro Line (concentrés 113/226/282 g/L, p. 37). Ce travail a été migré vers le modèle à plat (commit « Lot 1 »).
- **Blended reporté au lot 8** (version des amis), sur décision de Thomas. Les Repères n'affichent que la Pro Line, avec une note.
- **Concentrés en mL** : les poudres sont déjà dissoutes en bidons (sac entier + eau). Dosage par défaut 226 g/L, réglable au niveau du grow ou par espace.
- **Libellés** : « Arrosage automatique » / « Manuel », jamais « RAIN » dans l'interface. Athena n'apparaît que dans la liste des produits et dans les sources.
- **Colonne** : modèle Végé + module Propagation. Cycle 1 dans la Colonne, sans dates (rien inventé).
- **Matériel pré-rempli** : uniquement ce que dit le cahier des charges. EVO4 à 2,8 µmol/J marqué « hypothèse » ; le débit de la pompe, le débit du Cloudline S6 et la capacité du HYDRONE 5 sont laissés vides (« donnée manquante »).
- **Base** : 17 règles d'accès, toutes « propriétaire uniquement » (vérifié).
- Onglet **Repères** dans Outils ; l'onglet du bas est **Calendrier**.
- Build **non minifié** (≈ 2,7 Mo) pour lire les erreurs. À minifier une fois stable.

### Pièges
- L'hôte de l'artefact injecte `body{background:#fff;color:#000}` hors couche : le fond et la couleur de `html, body` doivent rester hors `@layer`.
- Dans l'app Claude, `window.scrollTo` renvoie une valeur : un `useEffect(() => scrollTo(...))` sans accolades plante. Toujours mettre des accolades aux effets.
- Lecture refusée par la base → les abonnements doivent rendre un état vide.
- Liens profonds d'outil (`#equipment`…) : ne pas réécrire le hash pendant la transition (`TOOL_HASHES` dans `App.tsx`).
- Icônes 3D dans le stockage d'assets de l'artefact (`scripts/emoji-urls.json`, `scripts/gen-emoji.mjs`).
- Vite 8 (Vite 6 entre en conflit avec `@vitejs/plugin-react` 6).

## Lot 2b — notes
- **Saisie** (`src/screens/entry-sheet.tsx`) rattachée à un espace : id `entries/{date}_{espace}[_{plante}]`, n'affiche que les modules actifs.
- **Saisie rapide** (`src/screens/quick-sheet.tsx`).
- **Journal** filtrable ; **Aujourd'hui** (`src/screens/today-spaces.tsx`) : vue « Tous » et vues par type d'espace, carte réservoir.
- **Autonomie du réservoir** (`src/calc/reservoir.ts`).
- **Carte Bonjour** (`src/calc/digest.ts`, `buildDailyDigest`, fonction pure), écrite dans `digest/latest`.
- Pièges : `NumberTicker` part de 0 (attendre avant une capture) ; les scripts Playwright ont besoin de `PYTHONPATH=scripts`.

## Lot 3 — notes
- `src/calendar/` :
  - `rrule.ts` : sous-ensemble RRULE, heure locale stable au changement d'heure ;
  - `deadlines.ts` : `flip`, `fade`, `flush`, `harvest`, `tank`, `propagationEnd`, `greatWhite`, `dryingEnd`, `flowCheck`, chacun avec sa source ;
  - `agenda.ts` ;
  - `ics.ts` : RFC 5545, VTIMEZONE, UID stables ;
  - `labels.ts`.
- Modèle : `Reminder` v2, `Grow.timeZone` (Europe/Oslo), `Cycle.plannedTransferDate`, `Cycle.plannedDryingDays`.
- Écrans : `calendar.tsx`, `reminder-sheet.tsx`, `calendar-parts.tsx`. Bonjour v2 (`DIGEST_SCHEMA = 2`).
- **Export .ics dans l'artefact = `hydro.zip` contenant `hydro.ics`** : la capacité `downloads` refuse l'extension .ics. Un bouton « Copier » est proposé en plus. L'artefact déclare `assets`, `downloads`, `user`, `db`.
- Concentré presque vide (lot 4) et IPW (lot 5) ne sont pas encore des échéances.
- **Piège de publication** : une session qui n'a pas publié elle-même la version en ligne est bloquée (l'outil demande de relire 2,7 Mo). Solution : vérifier que la version en ligne correspond au build du dernier commit (en comparant hors `<style>`), demander l'accord explicite de Thomas, puis publier avec `force: true`. **Ne jamais redéclarer les capacités** (les omettre pour les conserver).

### Commandes
```bash
npm ci
npm test                          # tests (Vitest), 189 au lot 9
npx tsc --noEmit -p .
npm run build                     # dist/hydro.html (à publier sur l'artefact)
VITE_TARGET=local npm run build   # version locale
npm run preview:build             # dist-preview/ pour les captures
PYTHONPATH=scripts python3 scripts/shots.py dist-preview/index.html <dossier> docs/maquette-aujourdhui.html calendar today journal tools
PYTHONPATH=scripts python3 scripts/e2e-3.py dist-preview/index.html <dossier>
```

### Prochain lot
Voir « Lot 4a — notes » ci-dessous.

## Lot 4a — notes
- Lot 4 coupé en deux (demande de Thomas) : **4a** nutrition, **4b** arrosage.
- `src/data/nutrients/` : `types.ts`, `athena-pro.ts`, `athena-blended.ts`, `addons.ts`, `index.ts` (`CATALOGS`, `getCatalog`, `visibleCatalogs(TARGET)`). `data/reference.ts` réexporte les tableaux Pro (`ATHENA_DOSING`, `ATHENA_CONC_ML`) pour les Repères.
- `src/calc/nutrients.ts` : `positionOf(stage)` → `phaseAt(catalog, position)` → `mixRecipe(lineId, input)`. `src/calc/concentrate.ts` : `bagLitres`, `stockStatus`, `LOW_TANKS = 2`.
- Modèle : `Mix` v4 (`phase`, `phBefore`, `balanceAddedMl`, `ph` = pH après, `items[].concentrate`), `ConcentrateStock` v2 (`finishedOn`), `CustomProduct` v2 (`labelDose`, `use`, `inactive`). `AddonId` gagne `camg` et `pk` (Blended uniquement).
- Plages publiées (Cleanse 5–13, CaMg 8–13) : aucune dose par défaut, la plage s'affiche ; la dose choisie est reprise du dernier bidon.
- EC par défaut : celle du programme ; Pro au cycle 1 : 2,2 (cahier des charges §9, 2,0–2,4), comme avant.
- Écrans : `screens/tools/nutrition.tsx` (recette, bidon), `nutrition-parts.tsx` (concentrés, produits perso), `nutrition-settings.tsx` (gammes visibles, add-ons de la gamme).

### Pièges
- Python Playwright : installer `playwright==1.56.0` (Chromium 1194 de `/opt/pw-browsers`) ; une version plus récente réclame `playwright install`.
- Publication : refusée comme au lot 3. Vérification faite : version en ligne = build de `main` au lot 3, hors `<style>`, hors squelette de l'hôte et hors chemins `//#region` (qui changent selon l'emplacement de `node_modules`).

### Commandes (lot 4a)
```bash
PYTHONPATH=scripts python3 scripts/shots.py dist-preview/index.html <dossier> docs/maquette-aujourdhui.html nutrition today calendar journal tools
PYTHONPATH=scripts python3 scripts/e2e-4a.py dist-preview/index.html <dossier>
```

## Lot 4b — notes
- `spaceIrrigation(spaceId, date, equipment, assignments)` : pots (volume, nombre), pompe (débit, date de mesure), en `Calc` (« donnée manquante »). `withPots` met à jour ou crée le contenant de l'espace.
- Le volume et le nombre de pots se modifient dans l'outil Arrosage (demande de Thomas) ; le débit reste saisi dans l'équipement (avec sa date de mesure, rappel à 60 jours).
- « Utiliser ces réglages pour le cycle » recopie volume / nombre de pots / débit de l'équipement dans le cycle (lu par Aujourd'hui).
- `targets.ts` : `manualRow(catalog, stage, week)`, option `line` de `dayTargets` ; `targetsFor` (grow-context) passe la gamme de l'espace du cycle.
- Publication : la version 13 venait de cette session, la 14 est passée sans forcer.
- Reste à voir (existant, pas une régression) : en anglais, les libellés du sélecteur de phase du mode capteur se chevauchent à 390 px.

### Commandes (lot 4b)
```bash
PYTHONPATH=scripts python3 scripts/e2e-4b.py dist-preview/index.html <dossier>
```

### Prochain lot
Voir « Lot 5a — notes ».

## Lot 5a — notes
- Lot 5 coupé en deux : **5a** pH / Balance et IPW, **5b** Lumière et Climat.
- `calc/balance.ts` : `balanceTotalMl`, `balanceHistory`, `predictBalance` (≥ 2 bidons, `START_FRACTION = 0.8`, par point de pH si pH avant/après connus, sinon par 10 L ; jamais de dose négative), `titrationTotal`, `phStatus`.
- `calc/ipw.ts` : `ipwDoseMl`, `ipwAllowed` (végé, floraison ≤ S3), `ipwLastDay` (fin de S3), `ipwSchedule` (prévention +0/+3 par semaine, pression +0/+2/+4, restauration 2 + 1 sur 9 jours : l'espacement des jours est un choix de l'app, signalé dans la source), `nextIpw`, `IPW_CHECKLIST`.
- Modèle : `Spray` v2 (`protocolStart`, `checked`, `cycleId`, `note`). `sprays` lu par le contexte et le calendrier.
- Le compteur de titrage n'utilise pas `NumberTicker` (le ressort montrait 22 au lieu de 24 mL pendant 1,5 s) : valeur exacte, petite animation d'entrée.

### Commandes (lot 5a)
```bash
PYTHONPATH=scripts python3 scripts/e2e-5a.py dist-preview/index.html <dossier>
```

### Prochain lot
Voir « Lot 5b — notes ».

## Lot 5b — notes
- `calc/light.ts` : `dliOf`, `ppfdFor`, `dimmerFor` (linéaire, estimation), `spaceLightAt` (gradation tapée, et à 100 %), `spaceFreeHeight`, `spaceSchema` (côté le plus long = 300 unités, grille 3 × 3, lampes réparties sur la longueur : position schématique, taille à l'échelle), `mapStats`, `cellLevel`.
- `calc/climate.ts` : `leafVpd`, `rhForVpd`, `rhRangeForVpd`, `vpdStatus`, `spaceAir` (repère courant `AIR_REF_SECONDS` 60–180 s).
- Modèle : `Space.lightMap` (9 cases, de l'arrière gauche, ligne par ligne), `ContainerSpec.heightCm` ; champs `lamp.dimensionsCm` exposés dans la fiche équipement.
- Données manquantes chez Thomas : dimensions et distance minimale des lampes, hauteur des pots, débit du Cloudline S6, débit de la pompe. Rien n'est supposé : l'app affiche « donnée manquante ».
- Cibles PPFD / DLI / VPD : toujours les repères courants de `targets.ts` (source « repère courant ») ; à remplacer si Thomas fournit des valeurs sourcées.

### Commandes (lot 5b)
```bash
PYTHONPATH=scripts python3 scripts/shots.py dist-preview/index.html <dossier> docs/maquette-aujourdhui.html light climate ph ipw tools today
PYTHONPATH=scripts python3 scripts/e2e-5b.py dist-preview/index.html <dossier>
```

### Prochain lot
Voir « Lot 6a — notes ».

## Lot 6a — notes
- Lot 6 coupé en deux : **6a** graphiques, **6b** export / import JSON et « Demander à Claude ».
- `calc/series.ts` : `CURVE_DEFS` (valeur, unité, cible du snapshot), `periodRange`, `indexEntries`, `buildSeries` (saisies de l'espace sans les saisies par plante ; Balance depuis les bidons), `downsample` (`MAX_POINTS = 120`), `chartRows`, `normalize`, `eventsIn`.
- Préférences des graphiques : `localStorage["hydro.charts"]` (courbes, vue, période), lecture/écriture protégées.
- Décision Thomas (NOTES-lots) appliquée : choix des courbes + vue séparée en plus de la vue superposée.

### Commandes (lot 6a)
```bash
PYTHONPATH=scripts python3 scripts/e2e-6a.py dist-preview/index.html <dossier>
```

### Prochain lot
Voir « Lot 6b — notes ».

## Lot 6b — notes
- `lib/backup.ts` : `exportBackup`, `parseBackup`, `importBackup` (merge / replace, `grow/main` écrit en dernier), `entriesCsv`. Format `{ format: "hydro-backup", version: 1, exportedAt, source, collections }`.
- `downloads` accepte `.json` et `.csv` (pas `.ics`, d'où le zip du lot 3).
- « Demander à Claude » utilise la capacité **`sample`**, ajoutée en version 18 avec l'accord de Thomas (vérifié après publication : 17 règles conservées, un lecteur « view » ne lit rien). L'ajouter oblige à republier la déclaration complète (une déclaration non vide remplace tout) : elle est dans `docs/artifact-capabilities.json` (assets, db avec les 17 règles propriétaire, downloads, user, + sample). Sans `sample`, l'outil reste caché (rien ne casse).
- Chaque appel est sans mémoire : le prompt porte les règles, le contexte de l'espace et les derniers échanges (`MAX_TURNS = 6`). `cache: false`. Le premier appel demande l'accord du lecteur ; un refus cache la fonction pour la visite.

### Commandes (lot 6b)
```bash
PYTHONPATH=scripts python3 scripts/e2e-6b.py dist-preview/index.html <dossier>
```

### Prochain lot
Voir « Lot 9 — notes ».

## Lot 9 — notes
- **Tâche programmée** « Hydro — résumé du matin » (id `trig_011XAxjtkHi6uRbgxZSKmjNC`) : `CRON_TZ=Europe/Oslo 51 6 * * *`, nouvelle session à chaque fois, notification push. Elle lit `digest/{date du jour}` (sinon `digest/latest` du jour) via ArtifactData, en lecture seule, et recopie `texts.fr`. Changer l'heure dans l'app ne déplace pas la tâche : le faire avec `update_trigger`.
- `Digest` v3 : `computedOn`, `texts: { fr, en }`. `usePersistDigest` écrit la semaine quand le texte change (version Claude seulement).
- **Réglages par espace** : `SpaceSheet` (`screens/tools/space-sheet.tsx`) avec sections `general | nutrition | irrigation | light | air` ; ouverte depuis n'importe où par `useEditors().openSpace(spaceId, section)` (une seule section affichée, bouton « Tous les réglages de l'espace »). Réglages d'arrosage = cycle en cours ; pots = contenant de l'espace (`withPots`) ; photopériode = `space.light.photoperiodH` (vide = selon le stade) ; gradation et vitesse = équipement. Composant `SettingsLink` (résumé + bouton) dans les outils.
- Langue et thème : pastille à roue crantée dans la barre du haut (`DisplayMenu` dans `components/hydro/top-bar.tsx`, popover), décision de Thomas ; aussi dans Réglages. Version 21.
- Build minifié (`vite.config.ts`) ; `HYDRO_DEBUG=1 npm run build` pour un build lisible.

### Commandes (lot 9)
```bash
PYTHONPATH=scripts python3 scripts/e2e-2b.py dist-preview/index.html <dossier>   # corrigé (bouton « Enregistrer » exact)
```

### Prochain lot
**Validation par Thomas.** Ensuite : lot 7 (nutrition multi-marques), puis lot 8 (version locale, Netlify).
