# État du build — app Hydro

> Document de passage de relais entre sessions. **Source de vérité : ce fichier dans le dépôt (`docs/etat-du-build.md`).** Toute session qui termine un lot le met à jour dans le même commit que le code. La suivante le lit en premier.

## Références
- Cahier des charges : `docs/cahier-des-charges.md`
- Fiche Athena (Pro Line, Blended, add-ons) : `docs/athena-fiche.md`
- Maquette validée : `docs/maquette-aujourdhui.html`
- **Artefact Hydro (à republier, toujours le même)** : https://claude.ai/artifact/CPfncsJe9Yi21RMwHSLqYC (version 13 = lot 4a ; 14 = lot 4b ; 15 = lot 5a ; 16 = lot 5b ; 17 = lot 6a ; 18 = lot 6b, avec la capacité `sample` ajoutée sur accord de Thomas ; 19 = lot 9a ; 20 = lot 9 ; 21 = menu langue / thème ; 22 = lot 8a ; 23 = lot 8b ; 24 = lot 8c ; 25 = lot 8d ; 26 et 27 = lot 8e, la 27 après intégration du commit README d'une autre session ; 28 = lot 10a ; 29 = lot 10b1 ; 30 = lot 10b2 ; 31 = lot 10c ; 32 = lot 10d1)
- **Dépôt GitHub (privé)** : `thomasll-max/Hydro-app-` (ancien nom `hydro-app-`, qui redirige), branche `main`
  - Lots 1 à 6b, 9 et 8a à 8e poussés le 18/10/2026. Dernier commit de lot : « Lot 8e : numéro de version et bannière de mise à jour ».
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
- [x] Lot 8a : version locale installable et hors ligne, Netlify, réinitialiser, transfert entre apps (193 tests)
- [x] Lot 8b : assistant de premier lancement, guides (205 tests)
- [x] Lot 8c : guide de démarrage « Premiers pas » (211 tests)
- [x] Lot 8d : méthode de mesure du dryback par espace, correctif runoff (216 tests)
- [x] Lot 8e : numéro de version, bannière « Nouvelle version disponible » (221 tests)
- [x] Lot 10a : sécurité des données (236 tests, artefact v28)
- [x] Lot 10b : cycles et stades (création de cycle minimale, étapes en un geste)
  - [x] Lot 10b1 : points 24–30 (245 tests, artefact v29)
  - [x] Lot 10b2 : points 31–39, simulation d'un an (254 tests, artefact v30)
- [x] Lot 10c : calculs Athena (266 tests, artefact v31)
- [ ] Lot 10d : navigation, saisie, graphiques
  - [x] Lot 10d1 : points 54–57, 61, 62, 65–68, 70 (272 tests, artefact v32)
  - [ ] Lot 10d2 : points 58–60, 63, 64, 69
- [ ] Lot 10e : accessibilité, textes, assistant, option « Autre marque »

## Lot 10 : passe de corrections (19/10/2026)
- Source : `docs/audit-2026-10-19.md`, avec 84 points tirés de la simulation d'un an, de 4 audits et des retours des testeurs. Les points faits y sont cochés ✅.
- Prompt de la session : `docs/prompt-passe-10.md`. Décisions de Thomas : voir ce prompt.
- Scripts de simulation : `scripts/sim/`.
- Point de reprise : premier point non coché de l'audit.
- **Branche** (décision de la session du 19/10, Thomas absent) : la session est configurée sur `claude/hydro-passe-10a-10e-pcm10n`. Le prompt demande « push sur main » et `CLAUDE.md` autorise le push direct : chaque lot est poussé **sur cette branche et sur `main`** (mêmes commits), donc pas de PR à ouvrir.
- Simulation d'un an : résultats notés dans « Lot 10b2 — notes » et « Lot 10e — notes » (intermédiaire dans « Lot 10b1 — notes »).

## Lot 10a — notes
- Stockage (`store/`) : `list()` lève l'erreur ; `watchDoc` / `watchCollection` prennent un `onError` et ne rendent plus jamais un état vide sur erreur ; `batch(ops)` (une transaction IndexedDB, une notification par collection) et `writeAll` (par paquets de 200, avec progression). `MemoryStore` enregistre (`persist`) **avant** de changer la mémoire. `LocalStore` : ouverture d'IndexedDB limitée à 6 s, sinon `volatile` (mémoire seule, bandeau rouge) ; `BroadcastChannel("hydro-docs")` rejoue les écritures dans les autres onglets.
- `getStores()` : runtime Claude présent mais `use("db")` nul → `StoreUnavailable` (écran « Base de données indisponible », Réessayer), jamais de repli local. `owner` = `user.isOwner()` (sans déclaration) : `false` → écran « App réservée à son propriétaire », aucune écriture. Les règles « owner » font qu'un autre lecteur lit des documents absents (pas d'erreur) : c'est pour ça qu'on demande `isOwner()`.
- `grow-context` : `problem` (`"store" | "read"`) et `retry` ; la graine n'est écrite qu'après `get("grow/main")`, `list("spaces")` et `list("cycles")` réussis et vides (et `grow/main` seul, en dernier). Documents vérifiés par `model/validate.ts` (`readable`, `validDoc`) une fois par instantané de collection ; les mal formés sont **mis de côté sans être effacés** (`skipped`, affiché dans Sauvegarde). `grow/main` abîmé : nom gardé, le reste par défaut.
- Import (`lib/backup.ts`) : mêmes vérifications, `Object.hasOwn`, ids interdits (`__proto__`…), 20 Mo max (`MAX_BACKUP_BYTES`), écritures puis suppressions. **Décision** : en « Remplacer », la copie de secours est un téléchargement (`hydro-AAAA-MM-JJ-avant-import.json`) ; si elle est refusée ou impossible, **rien n'est remplacé** (Fusionner reste possible).
- `entryHasContent` (`model/entry.ts`) : mesures, observations, actions, photos, note ; les réglages recopiés (CARRIED) ne comptent que s'ils diffèrent de la veille. `isBadNum` / `badNums` (`calc/formulas.ts`) : `NumField` passe en rouge (`aria-invalid`, « Nombre invalide ») et chaque formulaire refuse d'enregistrer.
- Photos : `deletePhotos(ids)` dans le contexte ; `resetData` lit tout d'abord (une lecture ratée = rien d'effacé), supprime les photos de l'artefact une par une (ids du journal, `photoIds`).
- `saveFile` : nouveau résultat `"started"` (lien de téléchargement sur iPhone, rien ne confirme) ; sur iPhone la feuille de partage passe d'abord. Le rappel de sauvegarde ne se remet à zéro que sur `"saved"` ; « Copier » ne compte plus.
- Netlify : `src/lib/csp.ts` + `writeBundle` du plugin local écrivent `dist-local/_headers` (CSP avec le hash sha256 de chaque script en ligne, `frame-ancestors 'none'`) ; les autres en-têtes sont dans `netlify.toml`. Vérifié dans Chromium : aucune violation, l'assistant s'affiche.
- `navigator.storage.persist()` n'est plus appelé au démarrage : une fois le grow présent (`lib/persist.ts`, effet dans `App.tsx`) ; état et bouton dans Sauvegarde, avertissement iPhone non installé.
- Assistant interrompu : si des espaces existent sans `grow/main` **et** qu'un brouillon est sur le téléphone, pas de « Mon grow » de réparation : l'assistant se rouvre ; à la fin il efface les restes (`spaces`, `equipment`, `equipmentAssignments`, `cycles`) et écrit tout en un seul `batch`. Sans brouillon : réparation comme avant.
- Scripts adaptés : `e2e-6b.py` (la confirmation et la copie de secours ; le faux runtime a maintenant une petite base en mémoire, sinon l'app s'arrête sur l'écran d'erreur ; vérification de l'écran sans base) et `e2e-8a.py` (« Copier » ne fait plus disparaître le rappel, un export oui).
- Python Playwright : `pip install playwright==1.56.0` (déjà noté au lot 4a).

### Commandes (lot 10a)
```bash
npm run preview:build && npm run build:local
PYTHONPATH=scripts python3 scripts/e2e-10a.py dist-preview/index.html dist-local <dossier>
```

## Lot 10b1 — notes
- Lot 10b coupé en **10b1** (24–30) et **10b2** (31–39) : trop gros pour un seul commit.
- Modèle : `Cycle.vegDate` (« Passer en végé »), `SCHEMA.cycle = 4`, `potVolumeL` / `potCount` **facultatifs** (absents = « donnée manquante » : programme d'arrosage sans volume, pas de prévision de bidon). `EVENT_TYPES` gagne `veg`. `stageOn` : végé à partir de `vegDate`, sinon (anciens cycles) de `transferDate`.
- `calc/steps.ts` (pur, testé) : `nextStep`, `applyStep`, `undoStep`, `expectedHarvest`, `autoEventOps` (création, déplacement, suppression des événements `{cycle}_auto-{type}`), `equipmentPrefill`. `screens/cycle-sheet.tsx` remplace l'ancien `CycleSheet` ; `screens/cycle-steps.tsx` : `StepCard` (Aujourd'hui) et `LastHarvest`.
- `defaultCycle()` ne garde que des valeurs sourcées (9 semaines Athena, 3 % / 15–30 min / 1–2 h Athena, 5 doses = valeur de départ déjà signalée, −2 °C et 06:00 du cahier des charges). Plus de Cherry Limeade, 15 L × 4 ni lampes de Thomas.
- **Décisions prises seul** : « Récolter » ne déplace pas le cycle vers un espace de séchage (à faire avec Transférer si besoin) ; le bouton « Récolter » est proposé pendant toute la floraison mais reste discret (contour) jusqu'à 7 jours de la récolte prévue ; un cycle récolté n'est plus affiché comme « en cours » sur Aujourd'hui ; ouvrir un cycle dans Réglages ne le rend plus actif ; le rappel Great White suit un transfert de moins de 14 jours (`GREAT_WHITE_DAYS`), une seule application par déplacement ; Fade / rinçage comptent un bac ou un événement à partir de 3 jours avant la date prévue (`EARLY_DAYS`).
- Simulateur (`scripts/sim/`) adapté au nouveau parcours : « Passer en végé » au jour 15 en Colonne, plus de `plannedTransferDate` ni de `transferDate` (le transfert est un déplacement). Le cas particulier « végé dans la Colonne » (PPFD 430–520, HR 62–68 % jugés avec les cibles de semis) est retiré : ces jours sont maintenant de la végé et tirés dans les cibles de végé comme les autres jours (sinon 47 alertes VPD « fausses » venaient du simulateur, pas de l'app). Hauteur en végé continue avec le semis.

### Commandes (lot 10b)
```bash
npm run preview:build
PYTHONPATH=scripts python3 scripts/e2e-10b.py dist-preview/index.html <dossier>
npx -y tsx scripts/sim/build.ts <dossier> && npx -y tsx scripts/sim/validate.ts <dossier>
```

## Lot 10b2 — notes
- `cycleOfSpace(cycles, spaceId, preferId)` (`model/grow-ops.ts`) : la seule fonction « cycle d'un espace » (le cycle actif s'il tourne là, sinon le plus récent en cours, jamais un récolté). `spaceContext(space, data, date, preferId?)` et `cycleIn` l'utilisent ; la sélection d'un espace garde en repli le dernier cycle de l'espace pour le journal.
- `cycleNumber(c, cycles)` : rang par `createdAt` (puis id). Les scripts de simulation passent `cycles`.
- `buildDailyDigest(data, date, locale, today = date)` : `digestWeek` passe le vrai aujourd'hui (échéances au bon jour, autonomie décomptée). `morningText` se replie sur le résumé daté le plus récent (`digest.oldNote`). `stageShort` (`app/labels.ts`) pour la ligne de stade.
- Concentré : `StockStatus.neededBy` = dernier bac + écart médian entre ses bacs × (bacs restants + 1). **Décision** : l'échéance « concentré presque vide » n'est jamais « en retard » ; passé ce jour estimé, elle reste « à faire aujourd'hui » jusqu'au nouveau bidon (le prochain bac qui en a besoin peut venir plus tard, ex. Bloom pendant la végé).
- Bidon sans bac : clé `tank_{espace}_level-{date du dernier niveau}`. Consommation : `READING_DAYS = 14`.
- Premiers pas : pots demandés seulement si l'arrosage de l'espace est automatique (cycle en automatique, sinon pompe dans l'espace) ; lampe cochée avec ses watts (`StartItem.canStart` pour « Démarrer aujourd'hui »).
- Carte Bonjour : un cycle « automatique » dans un espace sans pompe (quand le grow liste ses pompes) est traité comme arrosé à la main. Pas de dose ni de programme inventés pour le rinçage (eau osmosée, EC < 0,1 : fiche Athena).
- **Simulation d'un an (fin de 10b, 19/10)** : 479 saisies vérifiées, 28/28 anomalies signalées, **0 jour de végé jugée comme un semis** (96 avant), 0 fausse alerte, 0 plantage, 364 matins rejoués ; **4 échéances traînent** (12 avant) : toutes « mesurer le débit » (11 matins chacune), car le simulateur ne remesure la pompe qu'aux transferts (71 jours) alors que la règle du cahier des charges est 60 jours. Je n'ai pas changé ce comportement du simulateur : le rappel est juste. Passage navigateur (`browse.py`, 9 dates × 13 écrans) : aucune erreur console, aucun débordement (le seul « Infinity » relevé est la marque AC Infinity).

## Lot 10d1 — notes
- Lot 10d coupé en **10d1** (navigation, feuilles, saisie, service worker) et **10d2** (journal, graphiques, rappels, nutrition, performance).
- `app/nav.ts` : routes dans le hash (`""` = Aujourd'hui, `#journal`, `#tools`, `#tools/irrigation`…), `parseHash` (les anciens liens `#irrigation`, `#guide` marchent encore), `routeHash`, `planNav` (pur, testé), `navigate`, `useRoute`, `addLayer` (feuilles). Chaque entrée d'historique porte `{ hydro: { depth, prev } }` ; une seule entrée `hydroSheet` représente toutes les feuilles ouvertes, posée et retirée après le rendu (`setTimeout 0`, pour qu'un passage saisie rapide → saisie complète ne bouge rien).
- **Décision prise seule** : l'historique ne dépasse jamais Aujourd'hui → onglet → outil (→ feuille). Passer d'un onglet à l'autre remplace l'étape : le retour ramène à Aujourd'hui, puis quitte l'app, comme la barre du bas d'Android. Quitter un outil pour un autre onglet revient d'abord à la liste des outils.
- `Sheet` (`components/hydro/form.tsx`) : bouton ✕ ; une feuille « touchée » (frappe, choix, interrupteur depuis l'ouverture, ou `dirty` passé par la feuille) demande « Abandonner la saisie ? » avant de se fermer par ✕, glissement, tape à côté, Échap ou retour ; la glisser vers le bas est bloqué tant qu'elle est modifiée (`dismissible`). Les enregistrements ferment sans rien demander.
- Saisie : `EntryInit.values` (valeurs de la saisie rapide), `typed` (ce qui a été tapé depuis l'ouverture) gardé quand la date, la plante ou l'espace change ; « Reprendre hier » (`resumeFrom`, pur) ne remplit que les champs vides affichés en gris. Une saisie réenregistrée garde son heure (ou aucune) ; une nouvelle saisie d'un autre jour n'a pas d'heure.
- **Décision prise seule** : la saisie rapide n'emmène dans la saisie complète que les valeurs de l'espace choisi ; celles tapées pour les autres espaces ne sont pas enregistrées.
- Langue : les formulaires ne se réinitialisent plus (les champs gardent le texte tapé, `parseNum` lit « 2,4 » comme « 2.4 »). `formatInput` (i18n/core) et `show` dans le contexte remplacent les 7 copies du formateur.
- `useSaver().run(fn)` : `fn` peut renvoyer son propre message, un seul toast par enregistrement (transfert, duplication, archivage).
- Service worker (version locale) : réseau d'abord, cache au bout de 3 s ; la réponse du réseau met le cache à jour ensuite.
- Pièges : aucun effet de bord dans un `setState(updater)` (réglages, préférences des graphiques) ; effets toujours entre accolades (corrigé dans l'assistant).
- **À vérifier sur le téléphone** : le geste retour dans l'app Claude (l'artefact est dans un cadre ; si l'hôte bloque l'historique, l'app marche comme avant, sans étapes de retour). Dans le navigateur et la version locale, vérifié par `scripts/e2e-10d.py`.

## Lot 10c — notes
- `calc/nutrients.ts` : `interpEc` renvoie `exact` ; `gramsPer10L` / `concMlPer10L` renvoient `clamped` (EC hors tableau) ; `MixResult.ecClamped`, `MixResult.invalidVolume` ; `phFor(cat, phase, substrate, addons?)` (Fade désactivé dans une phase où il remplace le Core → pH du substrat) ; `chosenPer10L` ; `Mix.items[].per10L` (dose choisie dans une plage, telle que tapée).
- `calc/targets.ts` : `phTarget(stage, substrate, { line, flowerWeek, addons })` lit le catalogue (même pH que la recette) ; `dayTargets` reçoit `addons` (le contexte passe ceux de l'espace) et n'applique les cibles de précision que si `isPrecision` (coco + automatique). `Src` gagne `app` (« repère de l'app »), affiché dans les sources d'Aujourd'hui.
- `calc/advice.ts` : `status(v, t, metric?)`, `PH_MARGIN = 0.2` pour les pH.
- `calc/stage.ts` : `setGrowZone(tz)` (appelé à la lecture de `grow/main`) et `todayIso(now, tz)` au fuseau du grow.
- **Décisions prises seul** : au-delà de 4,0 les doses restent celles de la ligne 4,0 avec un avertissement (rien d'extrapolé) ; Balance à 0 dès que le pH avant atteint le bas de la cible (il n'en faut pas) ; le coefficient des doses d'installation (≈ 13 mL par litre de pot, 100–300 mL) et les espacements P2 restent ceux de l'app, étiquetés comme tels (aucune source pour les remplacer).

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
npm test                          # tests (Vitest), 221 au lot 8e, 236 au lot 10a, 245 au lot 10b1, 254 au lot 10b2, 266 au lot 10c, 272 au lot 10d1
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
Voir « Lot 8a — notes ».

## Lot 8a — notes
- Lot 8 commencé à la demande de Thomas (avant sa validation du lot 9), coupé en **8a** (version locale, réinitialiser, transfert) et **8b** (assistant de premier lancement, guide).
- Build local : `VITE_TARGET=local` active le plugin `hydro-local-target` de `vite.config.ts` (retire Google Fonts, ajoute `src/fonts-local.css`, manifeste, icônes, métas iOS ; ordre `pre`) et `publicDir: "pwa"` (manifest, `sw.js`, icônes PNG). Le service worker est enregistré dans `main.tsx` seulement en version locale et en HTTP(S).
- **Netlify** : à relier par Thomas (Netlify → Add new site → Import from GitHub → `thomasll-max/Hydro-app-`, branche `main`) ; `netlify.toml` donne la commande et le dossier. Je n'ai pas accès à Netlify depuis la session.
- Réinitialiser : `lib/reset.ts` (le grow en dernier, sinon l'app réensemence au milieu). Transfert : `navigator.share` (fichier) si disponible, presse-papiers sinon.
- Le rappel de sauvegarde garde la date dans `localStorage["hydro.lastBackup"]` (confort par appareil).

### Commandes (lot 8a)
```bash
npm run build:local                                      # dist-local/ (Netlify)
PYTHONPATH=scripts python3 scripts/e2e-8a.py dist-local <dossier>
```

### Prochain lot
Voir « Lot 8b — notes ».

## Lot 8b — notes
- `lib/onboarding.ts` (pur, testé) : `Draft` (nom, espaces avec `gear`, nutrition, cycle facultatif, heure du résumé), `stepIssues`, `duplicateDraftSpace`, `startCycle`, `draftDocs` (espaces → équipement → placements → `cycles/cycle-1` → `grow/main` en dernier). Brouillon dans `localStorage["hydro.onboarding"]` (effacé par la réinitialisation).
- `grow-context` : `needsSetup` (version locale, pas de `grow/main`) affiche `screens/onboarding.tsx` à la place de l'app ; `withSetup` bloque la « réparation » (grow recréé si des espaces existent sans grow) pendant que l'assistant ou l'import écrivent.
- Décisions sans source, signalées : aucun add-on coché au départ pour les amis ; concentré 226 g/L par défaut (recommandé Athena p. 37) ; programme d'arrosage du premier cycle = celui du formulaire de cycle (3 %, 15–30 min → 20 min, P0 1–2 h → 90 min : repères Athena ; 5 doses P1 : valeur de départ de l'app, à ajuster jusqu'au runoff) ; 9 semaines de floraison (programme Athena) ; pots obligatoires pour créer le cycle (jamais 15 L par défaut).
- Dans la version locale, l'heure du résumé est seulement gardée (pas de tâche du matin) : le texte le dit.
- **Netlify** : toujours à relier par Thomas, voir `docs/guide-netlify.md`. Guide des amis : `docs/guide-amis.md`.

### Commandes (lot 8b)
```bash
npm run build:local
PYTHONPATH=scripts python3 scripts/e2e-8b.py dist-local <dossier>
PYTHONPATH=scripts python3 scripts/e2e-8a.py dist-local <dossier>
```

### Prochain lot
Voir « Lot 8c — notes ».

## Lot 8c — notes
- Demande de Thomas : un guide de démarrage qui dit quoi rentrer, puis le fonctionnement. Outil `start` (`#start`), en tête des Outils, dans les deux versions ; carte sur Aujourd'hui (`StartCard`) tant qu'une ligne reste à faire, masquable (`localStorage["hydro.startHidden"]`, confort par appareil).
- `startChecklist` (pur, testé) : la ligne de la lampe utilise `ppf()` de `equipment/calc.ts` (PPF publié, sinon W × µmol/J). Chez Thomas il reste : les pots de la Colonne, les dates du cycle 1, le débit de la pompe (tous déjà « donnée manquante »).
- Le formulaire de cycle de la version locale ne pré-remplit plus le cycle de Thomas ; les pots sont exigés (comme dans l'assistant).

### Commandes (lot 8c)
```bash
npm run build:local && npm run preview:build
PYTHONPATH=scripts python3 scripts/e2e-8c.py dist-local dist-preview/index.html <dossier>
```

### Prochain lot
Voir « Lot 8d — notes ».

## Lot 8d — notes
- Demande de Thomas (avant toute autre chose) : correctif runoff + méthode de mesure du dryback.
- Modèle : `DrybackMethod` (`weight`, `acinfinity`, `sensor`, `none`) dans `model/types.ts` ; `Space.irrigation = { drybackMethod, sensorName }` (absent = pesée, rien n'est écrit pour la pesée) ; `Entry.sensorPeakPct`, `sensorMorningPct`, `drybackSensor`, `drybackMethod`, `sensorName`. `drybackMethodOf(space)` dans `model/entry.ts`.
- **Règle** : `Entry.dryback` = pesée uniquement, seul comparé aux cibles Athena (pastilles, correction du jour, zone cible). `drybackSensor` n'a jamais de cible (courbe `drybackSensor` sans `target`, jauge `tone="neutral"`).
- Les entrées déjà enregistrées avec un `runoffPct` recopié depuis `sensorPct` (avant le correctif) gardent cette valeur jusqu'à leur prochaine modification ; chez Thomas, aucun capteur n'était encore saisi.
- Changer de méthode en cours de cycle : les valeurs de l'autre méthode déjà saisies restent dans leur entrée ; chaque entrée garde sa méthode.

### Commandes (lot 8d)
```bash
npm run preview:build
PYTHONPATH=scripts python3 scripts/e2e-8d.py dist-preview/index.html <dossier>
```

### Prochain lot
Voir « Lot 8e — notes ».

## Lot 8e — notes
- `lib/version.ts` : `CURRENT_BUILD` (`{ commit, builtAt, dirty? }`, défini au build), `parseBuildInfo`, `isNewerBuild` (seulement si `builtAt` en ligne > le sien), `formatVersion`. `app/update.tsx` : `useNewBuild` (fetch `version.json?t=…`, `cache: "no-store"`, au chargement, à chaque `visibilitychange` visible, toutes les 30 min, rien hors ligne) et `UpdateBanner` (dans `Shell`, pas dans l'assistant).
- « Saisie en cours » = un formulaire ouvert par `EditorsProvider` (`editing`) : saisie, cycle, plante, événement, bidon, rappel, réglages d'un espace. Les fiches ouvertes directement depuis Réglages (espace, room, transfert) ne sont pas suivies ; de toute façon rien ne recharge sans un appui sur « Mettre à jour ».
- **Version affichée et commit** : le build publié sur l'artefact est fait avant son commit, il montre donc le commit précédent suivi de « + » (et la date du build). Sur Netlify, le build part du commit poussé : la version affichée est exactement ce commit.
- `version.json` n'existe que dans la version locale ; la version Claude affiche son numéro mais ne vérifie rien (l'artefact est republié par la session).

### Commandes (lot 8e)
```bash
npm run build:local && npm run preview:build
PYTHONPATH=scripts python3 scripts/e2e-8e.py dist-local dist-preview/index.html <dossier>
```

### Prochain lot
Passe 10 : premier point non coché de `docs/audit-2026-10-19.md` (lot 10b au 19/10). Puis **Lot 7 — Nutrition multi-marques**, après la validation de Thomas (lots 9 et 8).
