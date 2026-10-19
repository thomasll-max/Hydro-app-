# État du build — app Hydro

> Document de passage de relais entre sessions. **Source de vérité : ce fichier dans le dépôt (`docs/etat-du-build.md`).** Toute session qui termine un lot le met à jour dans le même commit que le code. La suivante le lit en premier.

## Références
- Cahier des charges : `docs/cahier-des-charges.md`
- Fiche Athena (Pro Line, Blended, add-ons) : `docs/athena-fiche.md`
- Maquette validée : `docs/maquette-aujourdhui.html`
- **Artefact Hydro (à republier, toujours le même)** : https://claude.ai/artifact/CPfncsJe9Yi21RMwHSLqYC (version 13 = lot 4a ; 14 = lot 4b ; 15 = lot 5a ; 16 = lot 5b ; 17 = lot 6a ; 18 = lot 6b, avec la capacité `sample` ajoutée sur accord de Thomas ; 19 = lot 9a ; 20 = lot 9 ; 21 = menu langue / thème ; 22 = lot 8a ; 23 = lot 8b ; 24 = lot 8c ; 25 = lot 8d ; 26 et 27 = lot 8e, la 27 après intégration du commit README d'une autre session ; 28 = lot 10a ; 29 = lot 10b1 ; 30 = lot 10b2 ; 31 = lot 10c ; 32 = lot 10d1 ; 33 = lot 10d2 ; 34 = lot 10e1 ; 35 = lot 10e2 ; 36 = lot 10e3 ; 37 = lot 10f1 ; 38 = lot 10f2 ; 39 = lot 10g ; 40 = lot 10h1 ; 41 = lot 10h2)
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
- [x] Lot 9 : tâche du matin + passe de finition (189 tests) — **validé par Thomas le 19/10/2026**
- [ ] Lot 7 : nutrition multi-marques (le lot 9 est validé : peut démarrer à la demande de Thomas)
- [ ] Lot 11 : saisie vocale, dicter le journal à Claude (après 10h, 10i et 7 ; prompt `docs/prompt-lot-11.md`)
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
- [x] Lot 10d : navigation, saisie, graphiques
  - [x] Lot 10d1 : points 54–57, 61, 62, 65–68, 70 (272 tests, artefact v32)
  - [x] Lot 10d2 : points 58–60, 63, 64, 69 (281 tests, artefact v33)
- [x] Lot 10e : accessibilité, textes, assistant, option « Autre marque »
  - [x] Lot 10e1 : points 71–75, accessibilité visuelle (281 tests, artefact v34)
  - [x] Lot 10e2 : points 76–84, textes, assistant, ARIA (286 tests, artefact v35)
  - [x] Lot 10e3 : option « Autre marque / je dose moi-même », simulation finale (288 tests, artefact v36)
- [x] Lot 10f : identité hydro.
  - [x] Lot 10f1 : police Fraunces, logo « hydro. », icône d'app (291 tests, artefact v37)
  - [x] Lot 10f2 : direction visuelle (294 tests, artefact v38)
- [x] Lot 10g : motif goutte et écran de démarrage (298 tests, artefact v39)
- [ ] Lot 10h : interface « instrument », palette harmonisée (`docs/prompt-lots-10h-10i.md`)
  - [x] Lot 10h1 : palette, couleurs d'espace, logo, boutons, champs « instrument », contrôle segmenté, cases à cocher, focus (305 tests, artefact v40)
  - [x] Lot 10h2 : écrans (relevés avec barre de cible, sections sans cartes, carte du matin en phrases, journal en lignes, onglets d'espace soulignés, bouton d'étape de cycle) (310 tests, artefact v41)
  - [ ] Lot 10h3 : barre d'onglets ancrée avec « + » central, bande de la semaine, accès au calendrier, raccourci « Tous les réglages » du menu d'affichage, mouvements, README
- [ ] Lot 10i : allemand

## Lot 10 : passe de corrections (19/10/2026)
- Source : `docs/audit-2026-10-19.md`, avec 84 points tirés de la simulation d'un an, de 4 audits et des retours des testeurs. Les points faits y sont cochés ✅.
- Prompt de la session : `docs/prompt-passe-10.md`. Décisions de Thomas : voir ce prompt.
- Scripts de simulation : `scripts/sim/`.
- Point de reprise : premier point non coché de l'audit. **Passe terminée le 19/10/2026 : les 84 points sont cochés** (et l'option « Autre marque » de la section « Hors passe »).
- **Après la passe** : lots 10f et 10g (identité « hydro. », `docs/prompt-lots-10f-10g.md`) **faits le 19/10 par une session planifiée** ; ensuite le lot 7 (multi-marques de la Nutrition). Netlify ne met plus en ligne à chaque push (voir `CLAUDE.md`) : aucun commit de la passe ne porte `[deploy]`. Hors passe, non faits : photos dans la sauvegarde (.zip), poids du premier chargement. À vérifier sur le téléphone de Thomas : le geste retour dans l'app Claude (lot 10d1).
- **Branche** (décision de la session du 19/10, Thomas absent) : la session est configurée sur `claude/hydro-passe-10a-10e-pcm10n`. Le prompt demande « push sur main » et `CLAUDE.md` autorise le push direct : chaque lot est poussé **sur cette branche et sur `main`** (mêmes commits), donc pas de PR à ouvrir.
- Simulation d'un an : résultats notés dans « Lot 10b2 — notes » et « Lot 10e3 — notes » (intermédiaire dans « Lot 10b1 — notes »).

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

## Lot 10h2 — notes
- **Lectures** (`components/hydro/reading.tsx`, `Reading`) : libellé 12 px, valeur JetBrains Mono 30 px (unité 12 px), barre 6 px (`--track`), zone cible en eau à 35 % (`data-zone`), trait 2 × 12 px à la valeur (`data-tick`, couleur du texte, « à surveiller » ou « alerte » hors cible, comme le chiffre), cible en mono discret (« cible 3–4 »). Échelle (`readingScale`) : la cible avec autant de place de chaque côté, élargie à la valeur du jour ; sans cible, rien n'est inventé : pas de zone (barre de 0 à un maximum fixe pour le dryback capteur et l'EC, sinon pas de barre). Les cibles sont celles de la saisie (`targets`) ou du jour (`dayTargets` via `targetsFor`). Aujourd'hui : une section « Relevés » (heure de la dernière saisie à droite, en mono) avec 8 lectures en 2 colonnes, la courbe de dryback dessous ; `GaugeCard` et `Metric` retirés. Cartes d'espace de « Tous » et tuiles (propagation, séchage, réservoir) : valeur en mono, sans boîte.
- **Sections** : `Card` n'a plus de cadre (trait fin en haut, `pt-4`) ; `framed` pour le guide « Premiers pas » seulement. `Label` = titre `h2` Fraunces 20 px en casse normale (l'icône n'est plus dessinée) ; `Group` (feuilles) = Fraunces 17 px ; `.eyebrow` sans capitales. Les blocs encadrés à l'intérieur des sections et des feuilles (résultats de calcul, listes d'interrupteurs, résumé d'import…) deviennent des traits fins. Conseil du jour : un petit repère carré au lieu de la bordure orange.
- **Carte du matin** : `buildDailyDigest(…, { prose: true })` ajoute à chaque ligne un fragment de phrase (`prose.*`, mêmes variables que `digest.*`) ; `BonjourCard` les regroupe en 2 ou 3 phrases par espace (état : stade, climat, dernière saisie ; eau : arrosage, réservoir ; à faire : rappels, échéances), séparés par « ; », une ligne à surveiller garde un petit repère orange. `digestWeek` (documents de la tâche du matin) n'appelle jamais `prose` : `text` et `texts` sont identiques (test). Titre « Bonjour Thomas. » en Fraunces 500, droit (Google Fonts charge maintenant 500–700). **Décision prise seule** : le prénom n'existait nulle part ; champ facultatif « Ton prénom » dans Réglages → Grow (`grow.ownerName`, accepté par `validate.ts`), sinon lu dans le nom du grow (« Grow de Thomas », « Grow d'Anaïs », « Sam's grow », parenthèses ignorées, deux mots au plus), sinon « Bonjour. ». La date du jour n'est plus dans le titre (elle passe dans la barre du haut au lot 10h3).
- **À faire** (`today.upcoming` : « À faire » / « To do ») : `ItemRow` = case 22 px, titre 15 px, espace et source dessous, échéance en mono 12 px à droite (« à surveiller » si en retard ou heure passée), « Reporter » en icône ; l'icône de type n'est plus dessinée.
- **Journal** : `dayGroups` regroupe les saisies par jour et par espace ; `DayRow` = une ligne (date mono 13 px, résumé 15 px tronqué avec le stade et les mesures nommées, valeur clé en mono à droite : dryback, sinon EC runoff, sinon température, sinon réservoir), puis observations / actions / note / photos en petit, puis les plantes du jour en sous-lignes (« P1 Hauteur 88 cm », chacune ouvre sa saisie). Filtres : pilules de 36 px (zone de 44 px), l'active pleine. « Saisie rapide » devient un bouton secondaire (le bouton plein reste « Saisie du jour »).
- **Onglets d'espaces** (`SpacePill`) : texte 15 px, 22 px d'écart, actif en 600 avec un souligné eau de 2 px, trait fin sous la rangée.
- **Étape du cycle** : bouton large à contour (56 px, fond surface), la conséquence en mono à droite en « plante » (`step.vegNext` « J1 végé → », `flipNext` « J1 floraison → », `harvestNext` « récolté → » ; en gris quand la récolte est encore loin).
- Avertissements en phrase entière (débit, EC plafonnée, recette réduite, lampes, dimensions, extracteur, import ignoré, iPhone, IPW non permis, Balance absent, erreur « Demander à Claude ») : `Notice`.
- Artefact v40 (lot 10h1) : refusé une première fois parce qu'une autre session avait republié à 14:00 UTC le build du commit du lot 10g ; vérifié identique à un build propre de ce commit (hors `<style>` et tampon de version), puis republié sans `force`.
- Scripts : `e2e-10b.py` lit la carte du matin par `#bonjour` ; `e2e-10h.py` vérifie aussi, avec un cycle et des saisies posés dans la base : « Bonjour Thomas. » (Fraunces 500 droit, phrases, aucune liste), onglets soulignés, lectures (zone, trait hors cible en orange ou rouge), aucune section encadrée hors « Premiers pas », bouton d'étape, journal (date mono, valeur clé, plantes dessous). 310 tests (5 nouveaux).

## Lot 10h1 — notes
- Lot 10h coupé en **10h1** (points 1 à 4 du prompt : palette, logo, boutons, champs), **10h2** (point 5 : lectures, sections, carte du matin, journal, onglets d'espaces) et **10h3** (points 6 et 7 : barre d'onglets, bande de la semaine, mouvement), plus la fin de lot (README, captures complètes) en 10h3.
- **Palette** (`src/index.css`, un bloc clair `:root`, le même bloc sombre pour « système » et « sombre », plus `.theme-dark`) : valeurs du prompt pour fond, surface, trait, texte, discret, eau, plante, à surveiller, alerte. Tokens dérivés en OKLCH (même teinte que le fond) : `--surface-2` #eaf0ed / #1d2622, `--fg-2` #36403b / #c1cac5, `--track` #e0e6e3 / #1d2621 (planche), `--info` #1f689d / #70b6e7 et `--phase-3` #714ca6 / #ba9cef (rappels et phase P3, même clarté que la famille). `--primary` = eau, `--ring` = eau. Rayons : `--r-md` 10 px, `--r-lg` et `--r-xl` 14 px.
  - **Décision prise seule — trait renforcé** (`--line-strong` : contour des boutons secondaires, trait des champs, cases à cocher) : la planche dessine #3a4640, qui ne fait que 1,9:1 sur le fond sombre ; le prompt demande ≥ 3:1 pour les graphismes, donc #676f6b (sombre) et #838a87 (clair), ≥ 3:1 sur fond, surface et surface 2.
  - **Décision prise seule — texte du bouton principal en clair** : « texte foncé » sur l'eau claire #007653 ne ferait que 3:1 ; le texte est blanc en clair (5,6:1), foncé en sombre (9,9:1). Token `--on-primary`.
  - Test `calc/lot10h.test.ts` : lit les deux blocs de `index.css` et vérifie les valeurs du prompt, les contrastes (texte ≥ 4,5:1 sur fond / surface / surface 2, graphismes ≥ 3:1, texte du bouton principal, coche sur « plante »), aucune couleur en dur dans les `.tsx` (hors `components/ui`), plus de « fond vert pâle + texte vert ».
- **Couleurs d'espace** : **mêmes identifiants, même ordre** dans `SPACE_COLORS` (aucune migration) : emerald = brique, sky = cuivre, violet = ocre, amber = lagune, rose = ardoise, teal = lavande, orange = prune, slate = rose (tableau en commentaire dans `model/grow.ts` et `index.css`). Les noms affichés viennent de `space.colorNames` (sélecteur de couleur de l'espace, qui disait « emerald »). Aucune teinte à moins de 40° de l'eau ou de la plante (test). `SpaceDot` : carré de 10 px, rayon 3 (aussi dans l'assistant et l'infobulle des graphiques).
- **Logo** : point final en `currentColor`. `Splash` utilise `.theme-dark` (tokens sombres) au lieu de couleurs en dur ; fond #0d1310 dans le manifeste et `theme-color` (l'icône garde #3ecf8e sur #101613).
- **Boutons** (`components/ui/button.tsx`) : `default` = principal (eau, 48 px, 600, `inset 0 -2px 0 rgba(0,0,0,.25)`, à l'appui 1 px plus bas avec l'ombre en haut) ; `outline` / `secondary` = contour 1 px trait renforcé, sans fond ; `link` = tertiaire (souligné eau 1,5 px, décalage 4 px) ; `destructive` = texte souligné « alerte » (dialogues de suppression, de remplacement à l'import, de réinitialisation). Classes partagées pour les contrôles faits à la main : `components/hydro/styles.ts` (`joined`, `segment`, `segmentItem`, `toggle`, `secondary`, `tertiary`, `iconButton`). Toutes les pilules et les boutons vert pâle des écrans sont passés dessus ; la pilule reste pour les filtres du Journal (active = pleine).
- **Cases à cocher** : `CheckBox` (`form.tsx`, rôle `checkbox`, 22 px, rayon 6, « plante » cochée, zone de 44 px). « Fait » des rappels (`ItemRow`) : une case à gauche, un second appui annule (plus de bouton « Annuler ») ; ligne de 48 px. `instant` : cocher ne compte pas comme une modification non enregistrée de la feuille autour (sinon le jour du calendrier demandait « Abandonner ? »). Coches de l'IPW et de « Premiers pas » au même dessin.
- **Champs** (`NumField`, `TextField`, `AreaField`) : libellé 13 px discret au-dessus ; pas de boîte, un trait bas 1,5 px (ombre intérieure, pas de saut de mise en page) qui passe à 2 px eau au focus et 2 px « à surveiller » sur une faute de frappe, message dessous en « à surveiller » ; valeur JetBrains Mono 26 px. **Unité dans le champ** : prise en fin de libellé quand elle est entre parenthèses et connue (`splitUnit`, liste fermée : °C, %, kg, g, mL, L, cm, mm, W, h, min, mS/cm…), ou passée par `unit` (EC de la saisie : mS/cm). « hier 25,3 » en mono (`hintMono`) ; « Reprendre hier » s'appelle « Copier les valeurs d'hier » (bouton tertiaire, plus de cadre).
- **Choix exclusifs** : `Seg` (et les rangées de boutons faites à la main : type d'événement, phase de la Nutrition, stade de l'Arrosage, modèle d'espace, méthode de dryback, type d'équipement, jours de la semaine, langue et thème) en cases jointes : contour commun, traits intérieurs, actif inversé (texte / fond). Choix multiples (add-ons, espaces des graphiques, plantes…) : cases à contour, pleines quand elles sont choisies.
- **À surveiller / alerte** : `Notice` (`primitives.tsx`) = texte normal + petit repère carré ; remplace les phrases entières en orange ou rouge sur fond teinté (stockage local, base volatile, débit inconnu, VPD, pH / Balance, sauvegarde ignorée…). `Chip` : petite étiquette à contour, sans fond teinté. Les points d'état deviennent de petits carrés.
- **Focus** : règle `:focus-visible` hors couche (2 px eau, décalé de 2 px) ; les anneaux de focus des composants shadcn sont retirés ; les champs texte montrent le focus par leur trait.
- Calendrier : aujourd'hui souligné en eau (plus de fond teinté) ; repères en petits carrés, les saisies en gris (pas en vert). L'export passe à la ligne à 200 % (le bouton « copier » débordait).
- Scripts adaptés : `e2e-3.py` (case « Fait », jour du jour par `aria-current`), `e2e-10d.py` (« Copier les valeurs d'hier »), `e2e-10d2.py` (case « Fait »), `e2e-10g.py` (fond #0d1310). Nouveau `scripts/e2e-10h.py` (tokens, point du logo, repère d'espace, case qui coche et décoche, focus, champ instrument et faute de frappe, contrôle segmenté, boutons principal et secondaire, captures FR/EN clair/sombre à 390 et 360 px, zoom 200 % sur la saisie). 305 tests (7 nouveaux).
- Reste pour 10h2 : tuiles de valeurs → lectures avec barre de cible, sections sans cartes, titres Fraunces, carte du matin en phrases, journal en lignes, onglets d'espaces soulignés, bouton d'étape du cycle. Pour 10h3 : barre d'onglets ancrée avec « + » central, bande de la semaine, date cliquable, Calendrier depuis Outils, README.

### Commandes (lot 10h)
```bash
npm run preview:build
PYTHONPATH=scripts python3 scripts/e2e-10h.py dist-preview/index.html <dossier>
PYTHONPATH=scripts python3 scripts/e2e-10e.py dist-preview/index.html <dossier> <axe.min.js>   # contrastes
```

## Lot 10g — notes
- La goutte comme motif, trois usages seulement (`components/hydro/wordmark.tsx`) :
  - **Chargement** : `Loading` (goutte qui se remplit de bas en haut, masque SVG, `@keyframes drop-fill`) à la place du texte « Chargement… » d'Aujourd'hui, du Journal et du Calendrier. Animations réduites : la règle globale arrête l'animation, la goutte reste pleine et fixe et « Chargement… » s'affiche (`motion-reduce:not-sr-only`) ; le texte est lu par les lecteurs d'écran dans tous les cas.
  - **Marque d'arrosage** : petite goutte vert eau au pied de chaque graphique aux dates des bidons (`mixDatesIn`, `withDates` dans `calc/series.ts`, `TankMark` dans `charts.tsx`), avec la légende « Goutte verte : jour d'un bidon. ». Il n'y avait pas de marqueur de bidon avant. Un jour de bidon sans mesure ajoute une ligne vide sur l'axe (sinon le repère n'a pas de place sur l'axe par catégories).
  - **Jauge du réservoir** (carte Réservoir d'un espace) : `Drop` avec `fill` = litres restants / litres utiles, sans la feuille (elle cachait le niveau) ; le pourcentage en JetBrains Mono à côté, les jours et les litres restent affichés. Remplace le petit rectangle bleu.
- **Écran de démarrage** (version locale seulement, `Splash`) : fond #0f1512, goutte avec sa feuille (96 px), « hydro. » dessous, sans animation ; affiché tant que les données ne sont pas lues (`!ready`), jamais pendant l'assistant ni sur un écran d'erreur ; aucun délai ajouté. Manifeste `background_color` / `theme_color` et balise `theme-color` à #0f1512 (l'icône garde son fond #101613, comme la planche).
- **iOS** : pas d'`apple-touch-startup-image` (une image par taille d'écran et d'orientation, plus d'une douzaine de fichiers) ; iOS affiche un écran uni le temps du lancement, puis l'écran de démarrage de l'app.
- `scripts/e2e-10g.py` (version locale servie en HTTP + données de la simulation d'un an : écran de démarrage puis disparition, manifeste, texte de chargement en mouvement réduit, jauge, marques d'arrosage) ; 298 tests (4 nouveaux, `calc/lot10g.test.ts`). Simulation d'un an repassée dans le navigateur (`browse.py`) au 19/10/2026 : aucune erreur, aucun débordement.

## Lot 10f2 — notes
- **Fonds teintés** : sombre #0f1512 (page), #18201c (surfaces), #1e2823 (surface 2), bordures #26302b / #33403a, textes #eef2ef / #c2cdc7 / #a7b3ad ; clair #f4f6f4 (page), #fcfdfc, #eff2f0, bordures #e3e8e4 / #d3dad5, textes #141a17 / #4a524e / #5c6560. 0 défaut de contraste (axe-core, `scripts/e2e-10e.py`) sur les cinq onglets et la saisie, en clair et en sombre.
- **Deux verts** : `--water` / `--leaf` (graphismes, ≥ 3:1 ; clair #1a9462 au lieu de #1f9e68, qui faisait 2,97:1 sur la surface 2) et `--water-ink` / `--leaf-ink` (texte, ≥ 4,5:1). Utilitaires Tailwind `text-water`, `bg-leaf/10`… Pastilles `Chip tone="water" | "leaf"` (stade en vert feuille, mode d'arrosage en vert eau sur Aujourd'hui). Icônes : `toneOf` dans `line-icon.tsx`. Graphiques : `curveTone(curve)` (`calc/series.ts`) colore la bande cible, et la courbe quand un seul espace est affiché. **Décision prise seule** : avec plusieurs espaces, chaque courbe garde la couleur de son espace, et la vue « toutes les courbes d'un espace » garde une couleur par courbe (sinon on ne les distingue plus).
- **Icônes au trait** : `LineIcon` (Lucide, trait 1,5) remplace les emojis 3D dans l'interface courante (listes du calendrier, outils, Repères, équipement, carte Bonjour, conseil du jour, rappel de sauvegarde). Règle CSS : toute icône Lucide laissée à son trait par défaut est dessinée à 1,5. Les emojis 3D restent dans l'assistant, « Premiers pas », les écrans vides (`ComingSoon`, calendrier vide, équipement vide). `ScreenHero` n'a plus d'illustration (prop `emoji` gardée par les appels, ignorée).
- **Retiré** : halo radial (`--glow`, App et assistant), halo orange de la carte Bonjour, barre d'onglets et barre du haut translucides (opaques), ombres colorées (bouton « Saisie du jour », bandeau de mise à jour), `BorderBeam` (bordure animée du conseil : bordure orange ou rouge fixe), apparition en fondu de chaque carte (`Reveal` est un simple `div`), flottement des emojis, compteurs qui défilent depuis 0 (`NumberTicker` affiche la valeur tout de suite). Restent : la transition entre onglets, la pastille d'onglet qui glisse, l'appui du bouton, le changement de mois.
- Textes : plus de point d'exclamation (« {name} est prêt. ») ; « Tout est dans la cible. ».
- Captures du README refaites (`docs/screenshots/`).
- Publication de l'artefact (v37) : refusée une première fois parce que cette session n'avait pas vu la version en ligne ; vérifié qu'elle était le build du lot 10e3 (hors `<style>` et hors numéro de version), puis republiée **sans** `force` (accepté une fois la version en ligne lue).
- `scripts/e2e-8c.py` : une erreur « ERR_TUNNEL_CONNECTION_FAILED » s'affiche parce que son contexte « version Claude » ne sert pas les polices localement (Google Fonts injoignable dans le bac à sable) ; ce n'est pas une erreur de l'app, toutes ses vérifications passent.
- 294 tests (3 nouveaux).

## Lot 10f1 — notes
- Session planifiée du 19/10 (Thomas absent). Lot 10f coupé en **10f1** (points 1 à 4 : police, logo, icône) et **10f2** (point 5 : direction visuelle), comme le permet le prompt.
- **Fraunces** : token `--font-display` et utilitaire `.display` (`font-variation-settings: "SOFT" 100`, opsz automatique, graisse 650). Utilisé pour les titres d'écran (`ScreenHero`, donc aussi le nom du stade « Floraison S6 »), les titres des feuilles (`Sheet`), le « Bonjour » de la carte du matin, les noms d'espaces des cartes d'Aujourd'hui, les titres de l'assistant et des écrans d'erreur, `ComingSoon`.
  - Artefact : Fraunces ajoutée au lien Google Fonts (`opsz,wght,SOFT@9..144,600..700,100`). Version locale : `@fontsource-variable/fraunces`, fichier `latin-full` (seul sous-ensemble qui a opsz **et** SOFT, 121 Ko). `scripts/fonts.py` sert aussi Fraunces aux captures.
  - Valeurs principales des cartes d'Aujourd'hui un cran plus grosses (JetBrains Mono 500, 1,25 rem ; 1,125 rem dans les pastilles des cartes d'espace).
- **Logo** : `components/hydro/wordmark.tsx` (`Wordmark`, `Drop`, chemins `DROP_PATH` / `LEAF_PATH` / `VEIN_PATH`). **Décision prise seule** : le prompt dit « hauteur de l'œil d'un o », la planche « identité finale » dessine une goutte de 0,633 em ; j'ai suivi la planche (référence visuelle), posée sur la ligne de base, 1 px de chaque côté. La feuille prend `--background` (prop `bg` si le logo est posé sur une autre surface). Tokens `--water` (goutte : #3ecf8e sombre, #1f9e68 clair, 3,1:1 sur le fond) et `--leaf` (point : #8bd450 / #4f9a2a). Barre du haut (à la place de l'emoji) et écran de bienvenue de l'assistant.
- **Icône** : `pwa/icon.svg` → `scripts/gen-icons.py` (Playwright) → `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (goutte à 58 %), `icon-maskable-512.png` (48 %, déclarée `maskable`), `favicon.svg`, `favicon-32.png`. Le service worker met aussi ces fichiers en cache (nom du cache inchangé, `hydro-v2`).
- Corrigé en passant : à 200 % en anglais, le bouton « Rappel » du Calendrier débordait (la ligne passe à la ligne).
- `scripts/e2e-10f.py` (Fraunces + SOFT sur les titres, logo, tokens, aucun débordement à 360 px et à 200 %, FR/EN, clair/sombre) ; 291 tests (3 nouveaux, `calc/lot10f.test.ts`).

## Lot 10e3 — notes
- **« Autre marque / je dose moi-même »** (décision de Thomas, en attendant le lot 7) : `OWN_LINE = "own"` et `isOwnLine` dans `data/nutrients/index.ts`. Ce n'est **jamais** un catalogue : `getCatalog("own")` retombe sur la Pro Line, donc chaque usage teste `isOwnLine` d'abord.
  - Réglages (grow et espace) et assistant : l'option s'ajoute à la liste des gammes, dans l'artefact comme dans la version locale ; choisie, elle vide les add-ons et cache le dosage, avec une note ; revenir à une gamme Athena remet ses add-ons par défaut.
  - Nutrition : « Mon bidon » (volume, EC visée facultative, produits et doses en texte libre, EC et pH mesurés), enregistré avec `line: "own"` et `items: []` ; « Dernier bidon » affiché. Aucune recette, aucune dose, aucun concentré.
  - pH / Balance : une note (le Balance est un produit Athena). Feuille « Bidon » du Journal : un seul pH (« pH du bidon »), pas de champs Balance.
  - **Décisions prises seules** : cibles du jour sans EC ni pH (aucune source pour une autre marque) ; les repères d'arrosage restent (dryback et runoff de la méthode de précision en coco automatique, runoff 10–25 % « repère de l'app » en manuel ; pas le tableau manuel de la gamme, qui est Athena) ; pas d'échéance Fade ni rinçage (programme Athena) ; la carte Bonjour dit « Rinçage : suis les consignes de ta marque » la semaine de rinçage ; jauges sans cible en couleur neutre (plus en vert).
  - « Demander à Claude » reçoit « autre marque, dosée par le cultivateur… ne pas proposer de doses Athena ».
- Version locale : `<link rel="icon">` (icône 192 px) — supprime la seule erreur de la simulation dans le navigateur (`/favicon.ico` en 404).
- `scripts/e2e-10e3.py` ; 288 tests (2 nouveaux).

### Simulation d'un an, fin de passe (19/10/2026)
- `npx -y tsx scripts/sim/build.ts <dossier>` puis `validate.ts` puis `browse.py dist-local <dossier>`.
- **0 jour de « végé jugée comme un semis »** (96 avant la passe), **0 fausse alerte**, **28/28 anomalies signalées**, 364 matins rejoués, 0 plantage.
- Graphique « Cycle » de Floraison : du 31/07/2026 au 19/10/2026, le cycle en cours (avant : depuis le 20/10/2025).
- **Échéances qui traînent : 4** (12 avant la passe), toutes « Mesurer le débit de la pompe » (`flowCheck`), en retard de 11 matins : le simulateur ne remesure la pompe qu'aux transferts, tous les 71 jours, alors que le rappel tombe à 60 jours. L'app a raison de le rappeler ; l'objectif « 0 » n'est donc pas atteint à cause du rythme du simulateur, pas d'un défaut de l'app. **Non corrigé exprès** (changer le simulateur pour qu'il obéisse au rappel masquerait le constat).
- Navigateur, 9 dates : aucune erreur après le correctif de l'icône (une seule avant : `/favicon.ico` en 404 à la première date), aucun débordement, aucun « NaN » / « undefined » (le seul mot signalé, « Infinity », est la marque AC Infinity dans Équipement).

## Lot 10e2 — notes
- Mots : « EC runoff », « pH runoff » (plus « RO », lu « eau osmosée ») ; « EC entrée » ; « pièce » au lieu de « room » ; plus de « version Claude », « lot 8 », « Version 0.3 » (« l'app dans Claude », « l'app installée sur le téléphone ») ; « heure du grow (Oslo) » au lieu de « Europe/Oslo ».
- **Pluriels** : `interpolate` comprend `{n|singulier|pluriel}` (français : 0 et 1 au singulier ; anglais : 1). Plus aucun « (s) » dans les dictionnaires. `placeholders` lit aussi cette forme (test des clés FR/EN).
- **Glossaire** (`components/hydro/info.tsx`) : `InfoTip` (bulle (i), zone de 44 px `.hit-sq`) sur VPD, DLI, dryback, dryback capteur, runoff, EC (Aujourd'hui, saisie) et P0–P3 (Arrosage) ; section « Glossaire » dans Repères (9 termes). Les définitions reprennent la fiche Athena (P0–P3, dryback = (pic − creux) ÷ pic, runoff 8–16 % / 1–7 %) ; VPD, PPFD, DLI sont des définitions physiques (DLI = PPFD × heures × 0,0036), aucune valeur de culture ajoutée.
- **Assistant** : à l'étape Équipement, « Copier vers les autres espaces » (`copyGearToOthers`) remplace « Dupliquer », qui créait un espace ; ce qui manque ne s'affiche qu'après un appui sur « Suivant » (le bouton n'est plus grisé) ; « Passer » devient « Quitter l'assistant » ; l'aide sous le dosage suit le mode (poudre ou concentré).
- **Anglais** : pas de « : » à la française (`common.colon`) ; le nom « Pots 15 L » suit le séparateur décimal de la langue quand le volume change. **Décision prise seule** : le grow de Thomas (préréglé dans l'artefact) garde ses noms en français, ce sont ses données.
- **Sauvegarde** : « éléments » au lieu de « documents », « emplacements du matériel » au lieu d'« affectations », dates avec l'année (`formatDate`, `dmy` dans le contexte).
- **ARIA** : onglets avec `aria-current="page"` (et `aria-controls` vers `main#main-panel`) ; gravité des observations lue (« gravité 2 sur 3 ») dans la saisie et le Journal ; jours du calendrier décrits (« lundi 19 octobre · 1 échéance · 2 rappels · en retard · journal rempli »), aujourd'hui en `aria-current="date"` ; bouton d'affichage nommé « FR · Affichage : langue et thème ».
- **Couleur d'un espace** : `freeColor` choisit à la création la première couleur libre, gardée ensuite (assistant compris) ; supprimer ou réordonner un espace ne change plus la couleur des autres.
- **Calendrier** : libellés des compteurs entiers (coupés avec un trait d'union si besoin). **Feuille Rappel** : un seul « Note », « Fin de la répétition » titré.
- `scripts/e2e-8b.py` adapté (le message n'apparaît qu'après « Suivant »), `scripts/e2e-10e2.py` ajouté.

## Lot 10e1 — notes
- Lot 10e coupé en **10e1** (71–75, accessibilité visuelle), **10e2** (76–84, textes, assistant, ARIA) et **10e3** (option « Autre marque », décision de Thomas, et simulation finale).
- **Couleurs (décision prise seule)** : thème clair, `--primary` passe de `#1fa971` (2,7–3:1) à `#0c7049` (5,1:1 sur sa teinte à 12 %, 6,1:1 en blanc dessus) et `--on-primary` devient blanc ; `--fg-3` `#666666` ; `--warn` `#8a5700` ; `--bad` `#b8281f` ; `--info` `#1f6fc2`. Thème sombre : `--fg-3` `#9a9a9a` (5,6:1 sur `surface-2`), `--on-primary` reste foncé (déclaré dans les deux blocs sombres). Le vert clair de la maquette est donc plus foncé dans l'app : c'est voulu (contraste AA).
- **Textes** : toutes les tailles `text-[Npx]` sont en `rem` (486 remplacements), minimum 0,75 rem = 12 px ; `.eyebrow` et les axes des graphiques à 12 px. Les champs gardent le texte en gris des valeurs de la veille en pleine couleur `fg-3` (plus `/70`).
- **Cibles tactiles** : boutons, puces et liens à 44 px (`h-11`, `size-11`, `min-h-11`) ; les pilules compactes des barres segmentées (sélecteur d'espace, langue/thème, périodes) gardent leur hauteur et reçoivent `.hit` (zone de toucher de 44 px en hauteur, `::after`).
- **Zoom 200 % / écran court** : variante Tailwind `short` (`@media (max-height: 35rem)`) : barre d'onglets à 52 px sans libellés (lus par les lecteurs d'écran), bouton « Saisie du jour » réduit à son icône, en-tête non collant, marge du bas réduite. `Grid` devient `.fold-2` / `.fold-3` (colonnes d'au moins 8 / 6 rem, qui se replient en une) ; titre d'écran sans illustration sous 20 rem ; boutons du Journal qui passent à la ligne ; pied des feuilles qui se replie.
- **Bouton flottant** : se cache quand on fait défiler vers le bas, revient en remontant ou en bas de page ; barre d'onglets plus opaque (`--glass` à 0,92).
- **Décision prise seule** : barre d'onglets un peu resserrée (marges 8 px) pour que « Aujourd'hui » et « Graphiques » tiennent en 12 px à 360 px.
- `scripts/e2e-8c.py` remis à jour : il n'avait pas été relancé après 10b2 (pas de ligne « pots » pour un espace arrosé à la main, lampe cochée dès ses watts connus, section « Les étapes du cycle »). Tous les scripts e2e (2b à 10d2) repassent.
- Vérification : `scripts/e2e-10e.py` (axe-core « color-contrast » sur les 5 onglets et la saisie, en clair et en sombre : 0 défaut ; aucun texte visible sous 12 px ; aucune cible sous 44 px ; zoom 200 % : rien ne déborde, barres à 27 % de la hauteur). axe-core est téléchargé hors du dépôt (`npm pack axe-core@4.10.2`), pas ajouté aux dépendances.

## Lot 10d2 — notes
- Journal : `liveFilter` (un filtre sur une valeur absente revient à « Tout ») et remise à zéro des filtres quand le sélecteur du haut change ; `journalOrder` (dans une journée, la saisie de l'espace avant P1, P2…) ; rangées de filtres avec leur libellé visible ; hauteur affichée dans la ligne ; message vide distinct (« pas encore de saisie » / « aucune saisie avec ces filtres » + « Effacer les filtres »).
- Graphiques (`calc/series.ts`) : `chartCycle` (cycle en cours de l'espace, sinon son plus récent), `periodRange(period, today, cycles, firstDate)` avec la période `all` ; « Cycle » suit les cycles en cours, sinon les derniers jusqu'à leur récolte ; `defaultCurves(méthodes)` (« Dryback capteur » par défaut pour un espace sur capteur, tant que l'utilisateur n'a pas choisi ses courbes) ; `splitGaps` / `pieceKeys` / `chartRows(series, key)` : une ligne par morceau, coupée après plus de `GAP_DAYS = 7` jours sans valeur ; `seriesStats` pour le nom lu par les lecteurs d'écran (`role="img"` + `aria-label` sur chaque graphique).
- **Décisions prises seules** : le seuil de coupure des courbes est de 7 jours (valeur de l'app, aucune source) ; le mode « Superposées » ne montre plus qu'un espace à la fois (choix sous le titre), une couleur pleine par courbe, au lieu de tous les espaces en pointillés ; choisir un espace en haut remplace les espaces cochés dans Graphiques.
- Rappels : `upcoming(…, now)` ne garde qu'une occurrence par rappel récurrent (la prochaine à partir d'aujourd'hui, sinon la dernière en retard) et marque `late` celle d'aujourd'hui dont l'heure est passée (« heure passée »). Le calendrier, lui, montre toujours toutes les occurrences.
- Nutrition : « Dernier bidon » sous le bouton d'enregistrement (« enregistré à l'instant » juste après, « Voir » ouvre la fiche) ; « pH avant / après {produit} » quand le pH up est actif, sinon un seul champ « pH du bidon » ; année sur les dates des bidons de concentré.
- Performance : la carte Bonjour écrit la semaine de résumés 4 s après la dernière modification (ou quand on quitte Aujourd'hui / l'app), seulement les documents qui ont changé (`changedDigestDocs`, `digestKey`), en un lot, et ne nettoie les vieux résumés qu'une fois par jour ; « À venir » ne recalcule plus les échéances à chaque rendu (mémo sur la liste d'ids, pas sur le `Set`).

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
npm test                          # tests (Vitest), 221 au lot 8e, 236 au lot 10a, 245 au lot 10b1, 254 au lot 10b2, 266 au lot 10c, 272 au lot 10d1, 281 au lot 10d2, 286 au lot 10e2, 288 au lot 10e3, 291 au lot 10f1, 294 au lot 10f2, 298 au lot 10g
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
- **Validé par Thomas le 19/10/2026.** Vérifié ce jour-là : la tâche programmée est active (prochain envoi le 20/10 à 06:51, heure d'Oslo) ; celle du 19/10 a réussi et a envoyé le résumé calculé le 18/10 avec la mention « Calculé le 18/10… » (l'app n'avait pas encore été ouverte ce matin-là) ; le résumé du 20/10 est déjà écrit dans la base (`digest/2026-10-20`, `texts.fr` présent, calculé le 19/10 par le code de la passe 10).
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
