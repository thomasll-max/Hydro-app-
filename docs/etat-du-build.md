# État du build — app Hydro

> Document de passage de relais entre sessions. **Source de vérité : ce fichier dans le dépôt (`docs/etat-du-build.md`).** Toute session qui termine un lot le met à jour dans le même commit que le code. La suivante le lit en premier.

## Références
- Cahier des charges : `docs/cahier-des-charges.md`
- Fiche Athena (Pro Line, Blended, add-ons) : `docs/athena-fiche.md`
- Maquette validée : `docs/maquette-aujourdhui.html`
- **Artefact Hydro (à republier, toujours le même)** : https://claude.ai/artifact/CPfncsJe9Yi21RMwHSLqYC (version 13 = lot 4a ; 14 = lot 4b ; 15 = lot 5a ; 16 = lot 5b ; 17 = lot 6a ; 18 = lot 6b, avec la capacité `sample` ajoutée sur accord de Thomas ; 19 = lot 9a ; 20 = lot 9 ; 21 = menu langue / thème ; 22 = lot 8a ; 23 = lot 8b ; 24 = lot 8c ; 25 = lot 8d ; 26 et 27 = lot 8e, la 27 après intégration du commit README d'une autre session ; 28 = lot 10a ; 29 = lot 10b1 ; 30 = lot 10b2 ; 31 = lot 10c ; 32 = lot 10d1 ; 33 = lot 10d2 ; 34 = lot 10e1 ; 35 = lot 10e2 ; 36 = lot 10e3 ; 37 = lot 10f1 ; 38 = lot 10f2 ; 39 = lot 10g ; 40 = lot 10h1 ; 41 = lot 10h2 ; 42 = lot 10h3 ; 43 = lot 10i ; 44 = lot 10j1 ; 45 = lot 10j2 ; 46 = lot 7a ; 47 = lot 7b ; 48 = lot 10k1a ; 49 = lot 10k1b ; 50 = lot 10k2a ; 51 = lot 10k2b ; 52 = lot 10k3a ; 53 = lots 10k3b et 10k3c ; 54 = lot 10k4 ; 55 = lot 10l1 ; 56 = lot 10l2a ; 57 = lot 10l2b ; 58 = lot 11a ; 59 = lot 11b ; 60 = lot 12a)
- **Dépôt GitHub (privé)** : `thomasll-max/Hydro-app-` (ancien nom `hydro-app-`, qui redirige), branche `main`
  - Lots 1 à 6b, 9 et 8a à 8e poussés le 18/10/2026. Dernier commit de lot : « Lot 8e : numéro de version et bannière de mise à jour ».
  - `release/hydro.html` = copie de `dist/hydro.html` du dernier lot (à publier depuis une conversation du projet si la session n'a pas l'outil Artifact).
  - Le lot 7 devient « Athena seule + mes produits saisis à la main » (décision de Thomas du 19/10, voir « Lot 7a — notes »).

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
- [x] Lot 7 : Athena seule + « mes produits » saisis à la main (décision de Thomas du 19/10 : pas de catalogue multi-marques ; prompt `docs/prompt-lot-7.md`)
  - [x] Lot 7a : « Autre marque » devient une vraie recette perso (337 tests, artefact v46)
  - [x] Lot 7b : « à la main » et produits perso dans Athena (340 tests, artefact v47)
- [x] Lot 10k : interface « calme » : Aujourd'hui, Outils, Journal par semaines, Graphiques (prompt `docs/prompt-lot-10k.md`, avant 11 et 12)
  - [x] Lot 10k1a : typographie droite (Geologica pour les titres et les chiffres, plus de JetBrains Mono, Fraunces dans le logo seul) (344 tests, artefact v48)
  - [x] Lot 10k1b : Aujourd'hui calme (bandeau Premiers pas, bloc « Maintenant », À faire, une ligne par espace) (350 tests, artefact v49)
  - [x] Lot 10k2a : Outils en trois groupes (353 tests, artefact v50)
  - [x] Lot 10k2b : Pulvérisation générique (IPW Athena ou mon mélange) (357 tests, artefact v51)
  - [x] Lot 10k3a : menu du « + » (Saisie du jour, Saisie rapide, Nouveau bidon, Événement), plus de gros boutons dans le Journal (359 tests, artefact v52)
  - [x] Lot 10k3b : Journal par semaines (cartes, bande des 7 jours, cycle, loupe, filtres) (artefact v53)
  - [x] Lot 10k3c : page d'une semaine (verdict, valeurs clés, carte par jour) (370 tests, artefact v53, même commit que 10k3b)
  - [x] Lot 10k4 : Graphiques (vues prêtes, segments droits, dernière valeur en grand) (377 tests, artefact v54)
- [x] Lot 10l : page d'un espace et saisie du jour, version calme (prompt `docs/prompt-lot-10l.md`, juste après 10k)
  - [x] Lot 10l1 : page d'un espace (384 tests, artefact v55)
  - [x] Lot 10l2 : saisie du jour (coupé en deux)
    - [x] Lot 10l2a : structure de la feuille (en-tête, bande des résultats, « Reprendre hier », ordre des champs, valeurs fantômes, un seul bouton, menu « ⋯ ») (390 tests, artefact v56)
    - [x] Lot 10l2b : « Ce que tu as vu ou fait » (4 puces les plus utilisées, « +N », note et photo en une ligne) et saisie rapide au même style (393 tests, artefact v57)
- [x] Lot 11 : saisie vocale, dicter le journal à Claude (après 10k et 10l ; prompt `docs/prompt-lot-11.md`, coupé en deux)
  - [x] Lot 11a : dictée, extraction par Claude, enregistrement tout seul ou feuille pré-remplie (406 tests, artefact v58)
  - [x] Lot 11b : version sans IA (Netlify, version locale) : analyseur à règles FR/EN/DE, toujours la feuille pré-remplie (414 tests, artefact v59)
- [ ] Lot 12 : bilans de récolte, galerie, variétés, photo pour Claude, verrou (prompt `docs/prompt-lot-12.md`)
  - [x] Lot 12a : bilan de récolte et comparaison de cycles (431 tests, artefact v60)
  - [ ] Lot 12b : galerie photo et frise
  - [ ] Lot 12c : fiche variété et photo pour Claude
  - [ ] Lot 12d : verrou
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
- [x] Lot 10h : interface « instrument », palette harmonisée (`docs/prompt-lots-10h-10i.md`)
  - [x] Lot 10h1 : palette, couleurs d'espace, logo, boutons, champs « instrument », contrôle segmenté, cases à cocher, focus (305 tests, artefact v40)
  - [x] Lot 10h2 : écrans (relevés avec barre de cible, sections sans cartes, carte du matin en phrases, journal en lignes, onglets d'espace soulignés, bouton d'étape de cycle) (310 tests, artefact v41)
  - [x] Lot 10h3 : barre d'onglets ancrée avec « + » central, bande de la semaine, accès au calendrier, raccourci « Tous les réglages » du menu d'affichage, mouvements, README (313 tests, artefact v42)
- [x] Lot 10i : allemand (318 tests, artefact v43)
- [x] Lot 10j : clarté (petits dessins, cadres par espace, résumé du matin en lignes ; prompt `docs/prompt-lot-10j.md`, avant le lot 7)
  - [x] Lot 10j1 : Aujourd'hui (dessins, un cadre par espace, résumé du matin en lignes, ligne fine Premiers pas + sauvegarde, ordre) (328 tests, artefact v44)
  - [x] Lot 10j2 : autres écrans (filtres du Journal repliés, titres avec dessin du Journal, des Graphiques et des Réglages) (330 tests, artefact v45)

## Lot 10 : passe de corrections (19/10/2026)
- Source : `docs/audit-2026-10-19.md`, avec 84 points tirés de la simulation d'un an, de 4 audits et des retours des testeurs. Les points faits y sont cochés ✅.
- Prompt de la session : `docs/prompt-passe-10.md`. Décisions de Thomas : voir ce prompt.
- Scripts de simulation : `scripts/sim/`.
- Point de reprise : premier point non coché de l'audit. **Passe terminée le 19/10/2026 : les 84 points sont cochés** (et l'option « Autre marque » de la section « Hors passe »).
- **Après la passe** : lots 10f et 10g (identité « hydro. », `docs/prompt-lots-10f-10g.md`) **faits le 19/10 par une session planifiée** ; lots 10h, 10i, 10j et 7 (Athena seule + mes produits) faits le 19/10 ; lots 10k (interface calme) et 10l (page d'un espace, saisie du jour) faits les 19 et 20/10 ; lot 11 (dicter le journal : 11a avec Claude, 11b sans IA) fait le 20/10 ; lot 12a (bilan de récolte) fait le 20/10 ; **prochain lot : le lot 12b** (galerie photo et frise, `docs/prompt-lot-12.md`). **Pour le 12c** : envoyer une photo à Claude demande la capacité `sample: {images: true}`, que l'artefact n'a pas (voir « Lot 12a — notes ») : accord de Thomas nécessaire. **Question ouverte pour Thomas** : le micro dans l'artefact (voir « Lot 11a — notes »). Netlify ne met plus en ligne à chaque push (voir `CLAUDE.md`) : aucun commit de la passe ne porte `[deploy]`. Hors passe, non faits : photos dans la sauvegarde (.zip), poids du premier chargement. À vérifier sur le téléphone de Thomas : le geste retour dans l'app Claude (lot 10d1).
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

## Règles « calme » (lot 10k, décision de Thomas du 19/10/2026, pour toute l'app)
Constat de Thomas après 10j : « toujours un effet plein d'infos éparpillées, ça donne mal à la tête, difficile de savoir où poser le regard » (la même information deux ou trois fois, toutes les sections du même poids, trop de petits dessins). Planches : Aujourd'hui https://claude.ai/artifact/8J98dQ5X7hpyk9FoDbSkyV, les menus https://claude.ai/artifact/T2JmTqXVjvWPVhgSjdwuCC, polices https://claude.ai/artifact/DQTEWL5dWdUnrpEGxaNDcJ. Elles priment sur 10h et 10j.
1. Un point d'entrée par écran : un seul cadre mis en avant, un seul bouton plein.
2. Chaque chiffre une seule fois par écran.
3. Petits dessins 3D seulement sur les espaces (carré teinté), le bloc « Maintenant » et le bandeau Premiers pas ; plus sur les titres de section, les lignes de résumé ni les libellés de relevés. Icônes au trait pour les outils, boutons et onglets.
4. Trois tailles de texte par écran ; ≈ 30–36 px entre les sections ; presque plus de traits.
5. Pas de jargon dans les listes (il reste dans les outils, avec le glossaire).
6. Lignes de graphique honnêtes : segments droits.
7. Typographie droite : Fraunces seulement dans le logo et l'écran de démarrage ; titres en Geologica 700 (−0,02 em) ; texte en Figtree ; tous les chiffres en Geologica à chasse fixe (plus de JetBrains Mono) ; liens de titre de section petits (≈ 13 px, Figtree 600).

## Lot 12a — notes
- **Bilan d'un cycle** (`screens/cycle-review.tsx`, calculs dans `calc/review.ts`, testés) : une page du Journal, `#journal/bilan/{cycleId}` (`Route.review`), avec « Retour ». Elle s'ouvre depuis un cycle récolté : la ligne du cycle en bas du Journal (« Bilan », `#journal-review`), Réglages → cycles (« Bilan » sur chaque cycle récolté, `[data-review]`) et la carte de la dernière récolte dans Aujourd'hui (« Voir le bilan »). **Décision prise seule** : il n'y a pas de liste « cycles archivés » à part ; la liste des cycles des Réglages porte le bouton. Sections avec leur petit dessin (style 10j) :
  - **Résultat** (`#review-result`) : poids sec, poids humide, g par watt, g par plante, g par m². La puissance : celle saisie à la récolte, sinon les lampes de l'espace **au jour du 12/12** (`spaceLight`, l'espace où le cycle a fleuri, même s'il est au séchoir maintenant), sinon donnée manquante. g par plante : poids sec ÷ nombre de pots du cycle ; g par m² : surface de l'espace de floraison. Chaque valeur sans sa donnée affiche « donnée manquante », jamais d'estimation. « Modifier la récolte » ouvre la feuille de récolte.
  - **Calendrier** : germination, végé, 12/12, récolte (dates avec l'année), durées (propagation, végé, floraison en « 9 sem. 0 j » avec « prévue 9 sem. »), séchage (saisi, sinon jusqu'au début du curing, et c'est écrit).
  - **Conduite** : par étape (celle enregistrée avec les cibles de la saisie, sinon celle du cycle ce jour-là), repliée : moyenne, plage, nombre de saisies et **part des jours dans la cible du jour** (`status` sur la cible enregistrée, `TargetsSnapshot`) pour EC entrée et runoff, pH entrée et runoff, dryback à la pesée, **dryback capteur sur sa propre ligne** (jamais mélangé), runoff %, T°, HR, VPD, PPFD, DLI. T°, HR et dryback capteur : « sans cible ». Seules les saisies de tout l'espace comptent (pas celles d'une plante), celles du cycle seulement.
  - **Bidons** : nombre, litres, produits sommés **par gamme, produit et unité** (une ligne Pro et une ligne Blended ne s'additionnent jamais) ; une dose laissée vide est comptée à part (« 1 sans dose »). Les bidons du cycle, ou ceux d'un de ses espaces sans cycle pendant qu'il y était.
  - **Incidents** : par semaine du cycle (« Floraison S3 »), observations (jours, gravité maximale en couleur) et actions.
  - **Dégustation et notes** : `tasting`, `dryingNotes`, et la **note de bilan** (`Harvest.reviewNote`, dans la feuille de récolte).
- **Poids sec par plante** (`Harvest.dryByPlant`, facultatif) : un champ par plante (P1 à P4 selon les pots) dans la feuille de récolte. La somme **ne remplace jamais** `dryG` s'il est saisi : l'écart s'affiche tel quel en orange (« Somme des plantes 493,5 g · écart +6,5 g avec le poids sec saisi ») ; sans `dryG`, la somme sert de poids sec, et c'est écrit (« somme des plantes »). Deux champs facultatifs de la récolte : **pas de changement de `schemaVersion`** (même décision qu'au lot 11a), la validation accepte déjà `harvest` comme objet.
- **Comparer** (« Comparer avec… ») : une feuille avec les autres cycles récoltés, filtrables par **variété** (majuscules et espaces ignorés, ordre alphabétique) et par **espace** (tous ceux traversés). Puis `#journal/bilan/{a}/{b}` : deux colonnes A et B, les mêmes lignes (Résultat, Calendrier, Conduite par étape, Bidons), l'écart B − A en mono, arrondi aux chiffres affichés (« ±0 » plutôt que « +0 ») ; « — » quand une des deux valeurs manque.
- **Export** (`lib/review-export.ts`, testé) : **CSV** (`;`, virgule décimale en français et en allemand, BOM, dates ISO, une cellule vide pour une donnée manquante ; colonnes Section, Étape, Mesure, Valeur, Unité, Min, Max, Saisies, Dans la cible) et **version imprimable** (une page HTML simple, sans script ni ressource extérieure, le texte échappé, styles d'impression). Les deux passent par `saveFile` : la capacité `downloads` de l'artefact accepte `csv` et `html` ; lien de téléchargement dans la version locale.
- **Photo pour Claude (12c), à savoir dès maintenant** : la capacité `sample` de l'artefact n'accepte une image que si elle est déclarée `sample: {images: true}`. L'artefact déclare `sample` sans images : il faudra l'accord de Thomas pour la redéclarer au lot 12c.
- **Piège corrigé, `scripts/to-artifact.mjs`** : la page imprimable met `</head>` et `<body>` dans une chaîne du script ; le découpage s'arrêtait au premier `</head>` (dans le script) et **la feuille de style disparaissait du fichier de l'artefact** (1068 Ko au lieu de 1736). Le vrai `</head>` est maintenant le dernier, le vrai `<body>` le premier après lui, et le script refuse d'écrire un fichier sans sa grande feuille de style, son script et `#root`. Vu avant publication : la v60 est bonne.
- `scripts/sim/generate.ts` : un import inutilisé retiré (le test du lot 12a importe la simulation, et `tsc` la vérifie maintenant).
- Textes : groupe `rv`, `cycleForm.dryPlants`, `cycleForm.dryPlantsD`, `cycleForm.reviewNote`, `jw.m.ppfd` (FR/EN/DE). Tests : `calc/lot12a.test.ts` (17, dont les 4 cycles récoltés de la simulation d'un an). Script : `e2e-12a.py` (nouveau : version locale, simulation au 19 octobre : bilan depuis les Réglages, valeurs du cycle 2 (487 g, 1,62 g/W, 121,8 g par plante, 601 g/m²), calendrier, conduite du stretch, bidons, dégustation, poids par plante et écart, note de bilan, CSV et page imprimable téléchargés, comparaison filtrée par variété, écart, retour, donnée manquante sans poids sec, ouverture depuis le Journal, EN/DE clair/sombre 390/360 sans défilement de côté). 431 tests.

## Lot 11b — notes
- **Sans Claude** (version locale, Netlify, ou l'artefact quand « Demander à Claude » n'est pas accordé) : « Dicter » est là aussi, à côté de « Reprendre hier ». Même panneau, avec une autre phrase (« L'app reconnaît les mesures simples, met le reste dans la note, et tu relis avant d'enregistrer »), **sans** le réglage « Relire » et avec « Remplir la saisie » (`VoicePanel` gagne `ai`). **Jamais d'enregistrement direct** : `fillByRules` passe toujours par `prefillVoice` (test statique).
- **Analyseur** (`calc/voice-rules.ts`, `parseVoice`, testé : 33 phrases FR, 15 EN, 14 DE dont les pièges) : le texte est découpé en mots et nombres (positions gardées), les mots sont comparés sans accents ni majuscules (`fold`), une étiquette (la plus longue d'abord : « EC runoff » avant « EC ») suivie de petits mots permis (« du », « à », « : », « is », « bei »…) puis d'un nombre, puis d'une unité facultative. Les étiquettes reprennent aussi les noms des champs de l'app dans les trois langues (« Pot, matin », « EC Zulauf », « Topf, Höchststand », « Left in the reservoir »…). FR, EN et DE sont reconnus quelle que soit la langue de l'app (seul « 1,200 » change : mille en anglais).
- **Nombres** : chiffres (« 5,9 » ou « 5.9 ») ou en toutes lettres de 0 à 999 dans les trois langues (« vingt-cinq et demi », « soixante et onze », « quatre-vingt-deux », « twenty five », « fünfundzwanzig »), avec « virgule / point / comma / Komma » (« deux virgule huit »). « un / one / ein » ne comptent que devant « virgule » (sinon ce sont des articles : « un peu de jaunissement »). **Deux chiffres seuls à la suite** (« cinq neuf », « 5 9 ») : 5,9 pour un **pH seulement** (la même règle que pour Claude) ; pour tout autre champ, c'est un doute « nombre pas compris » (« EC deux huit » : 2,8 ou 28 ?), rien n'est rempli.
- **Unités** : °C, %, mL / cL / L, kg / g, cm / m, mS/cm / µS/cm, h, µmol, converties dans l'unité du champ (« 4200 grammes » = 4,2 kg, « 0,4 L » = 400 mL). Une unité qui ne va pas (« température 25 % ») est un doute. **Sans unité** : le runoff et le volume par pot sont un doute sous 100 (« runoff 15 » : mL ou % ?) ; au-dessus, des mL.
- **Contexte, jamais en silence** : « runoff », « drain », « Ablauf » avant une EC ou un pH sans précision les mettent au runoff ; « entrée », « solution », « bidon », « Zulauf »… à l'entrée ; un point ou un retour à la ligne efface le contexte. **Décision prise seule** : une EC ou un pH dit **sans rien qui décide** va dans la solution (entrée, comme la règle donnée à Claude), ou au runoff si l'espace n'a pas la nutrition, **rempli et marqué** « sans préciser lequel : vérifie » ; ce qui suit et en dépend est marqué aussi. Même chose pour « poids 4,2 » (matin) et « capteur 45 % » (matin). Les étiquettes « matin » ou « ce matin » seules ne remplissent rien (« ce matin 3 feuilles jaunes » n'est pas un poids) ; « pic » seul oui.
- **Calculés par l'app** : « VPD 1,2 », « DLI 40 », « dryback 30 », « runoff 15 % » ne remplissent rien, restent dans la note et sont listés (« calculé par l'app, laissé dans la note »).
- **Espace et plante** : l'analyseur ne change **jamais** d'espace ; un autre espace nommé est un doute (« un autre espace est nommé : la saisie reste ici ») et le mot reste dans la note. « P2 », « plante 2 », « plant 2 », « Pflanze 2 » : la plante si l'espace la suit (sinon un doute) ; le nom reste dans la note.
- **La note** : tout ce qui n'a pas été pris, avec les mots dits, coupé aux virgules et aux points (pas dans un nombre) ; seuls les petits mots collés à un morceau pris tombent (« et », « de », « the », « und »…). Pas d'observations ni d'actions cochées par les règles (« pas de jaunissement » serait coché à tort) : elles restent dans la note.
- **Doutes** (`VoiceDoubt.code` gagne `unit`, `which`, `computed`, `otherSpace`) : marqués sur le champ comme en 11a, ou listés au-dessus quand ils n'ont pas de champ. `voice.codeNumber` devient « nombre pas compris » (vaut aussi pour Claude).
- Textes : `voice.hintRules`, `voice.fillRules`, `voice.codeUnit`, `voice.codeWhich`, `voice.codeComputed`, `voice.codeOtherSpace` (FR/EN/DE). Tests : `calc/lot11b.test.ts` (8 tests, 62 phrases). Script : `e2e-11b.py` (nouveau : version locale avec la simulation au 8 février : « Dicter » à côté de « Reprendre hier », panneau sans « Relire », micro simulé en fr-FR, feuille remplie sans rien enregistrer puis enregistrée avec la trace, doutes « pH 59 » / « EC 2,8 » / « runoff 15 % » / « VPD 1,2 », marque effacée en retapant, « rien à mettre », sans micro, EN et DE, captures clair/sombre 390/360). 414 tests.

## Lot 11a — notes
- **Découpage** : le lot 11 est coupé en 11a (dictée, extraction par Claude, enregistrement) et 11b (version sans IA, analyseur à règles). Le prompt le prévoyait.
- **Point d'entrée** : « Dicter » (`#e-dictate`, bouton secondaire avec un micro) à côté de « Reprendre hier » en haut de la saisie du jour, **seulement dans la version Claude** (`useSample`, comme « Demander à Claude »). Il ouvre le panneau (`screens/voice-panel.tsx`, `#e-voice`) : un titre, un exemple de phrase, la zone de texte (`#e-voice-text`, marche toujours au clavier ou en collant), le bouton micro (`#e-voice-mic`, « Écouter » / « Arrêter »), le réglage « Relire avant d'enregistrer » (`#e-voice-review`) et « Remplir le journal » (`#e-voice-fill`).
- **Micro** (`lib/speech.ts`, `useSpeech`) : `SpeechRecognition` ou `webkitSpeechRecognition`, langue de l'app (fr-FR, en-US, de-DE), en continu, le texte s'écrit au fur et à mesure (après ce qui était déjà tapé). Absent (Brave, Firefox) ou refusé (`not-allowed`, `service-not-allowed`, `audio-capture`) : le bouton disparaît et une phrase dit d'utiliser le micro du clavier du téléphone (`#e-voice-nomic`).
- **Micro dans l'artefact — question pour Thomas** : la liste des capacités d'artefact disponibles pour ce compte n'a **pas** de capacité « micro » (artifact, assets, comments, db, downloads, files, mcp, room, sample, user). La page n'a donc rien redéclaré. Si le cadre de claude.ai refuse le micro du navigateur, l'app le voit (`not-allowed`) et reste sur la dictée au clavier, qui marche sur le téléphone. **À vérifier par Thomas** : toucher « Écouter » dans l'artefact sur son téléphone. Si le bouton disparaît, c'est le cadre ; rien à faire de plus sans une capacité que l'artefact n'a pas.
- **Extraction** (`calc/voice.ts`, testé) : `voiceKeys(espace)` donne les champs de la saisie de l'espace choisi (climat ; arrosage selon la méthode de dryback, pesée ou capteur ; nutrition ; plantes ; réservoir ; propagation ; lumière). `voicePrompt` envoie : les règles (JSON seulement ; seulement ce qui a été dit ; jamais les champs calculés VPD, DLI, dryback, % runoff, qui restent calculés par l'app ; nombres à la française, « cinq neuf » pour un pH = 5,9 ; espace ou plante seulement s'ils sont nommés, sinon l'espace ouvert, et un doute s'il y a doute ; étiquettes existantes seulement ; le reste dans la note avec les mots dits ; un bidon seulement si c'est clairement un bidon ; les doutes dans la langue de la dictée), la date, l'espace ouvert, les espaces (nom, id), les plantes du cycle, la liste des champs avec leur unité et leur plage, les étiquettes d'observation et d'action, le schéma, puis la dictée. Le test vérifie qu'aucun nombre n'y est inventé (seulement les plages et la date).
- **Lecture de la réponse** (`readVoiceReply`) : l'objet JSON est extrait du texte, sinon « Claude n'a pas répondu en JSON lisible ». Espace inconnu → doute (rien n'est choisi) ; plante inconnue → doute ; champ inconnu ou absent de l'espace → ignoré ; un nombre écrit « 5,9 » est accepté ; autre chose qu'un nombre → doute ; **hors plage → jamais gardé, devient un doute** « entendu : 59 · hors plage (3 à 9) » ; étiquettes inconnues ignorées ; gravité 1, 2 ou 3 ; note coupée à 2000 caractères ; les doutes de Claude gardés (12 au plus).
- **Plages de plausibilité** : celles du prompt (pH 3–9, EC entrée 0–6, T° 5–40, HR 10–100, poids 0–50 kg, hauteur 0–400 cm). **Décisions prises seule** (bornes de vérification, pas des valeurs de culture) : EC runoff 0–15 (les cibles de runoff d'Athena montent à 10 en génératif, 6 aurait rejeté des valeurs réelles), runoff du pot 0–5000 mL, volume par pot 0–20 000 mL, doses 0–50, capteur 0–100 %, réservoir 0–5000 L, lumière 0–100 %, hauteur de lampe 0–300 cm, PPFD 0–2500, photopériode 0–24 h, propagation 0–1000 ; bidon dicté : 1–2000 L, EC 0–6, pH 3–9. Le « runoff 0–100 % » du prompt n'a pas de champ : le % de runoff est calculé par l'app.
- **Enregistrement** : sans doute, réglage « Relire » éteint et rien tapé dans la feuille → la saisie est **enregistrée tout de suite**, fusionnée avec celle du jour (`mergeVoice` : les champs dictés remplacent, les autres restent ; observations fusionnées par étiquette ; actions réunies ; note ajoutée à la suite), la feuille se ferme, toast « Journal rempli : 4 valeurs » avec « Annuler » pendant 10 s : remet **exactement** la saisie d'avant (`restoreEntry`) ou la supprime si elle n'existait pas, et retire le bidon créé. **Décision prise seule** : si quelque chose a déjà été tapé dans la feuille, on passe par la feuille pré-remplie (ne pas enregistrer en silence ce que Thomas tapait). Avec des doutes ou « Relire » allumé : rien n'est enregistré, la feuille se remplit, chaque champ douteux est marqué « à surveiller » (bordure orange, `data-doubt`) avec ce qui a été entendu dessous (`#<champ>-doubt`) ; retaper le champ efface la marque ; les doutes sans champ à l'écran (espace, plante, bidon) s'affichent en liste au-dessus (`#e-doubts`). La section repliée s'ouvre si un champ dicté y est.
- **Trace** : `Entry` gagne `source?: "voice"` et `dictation?: string` (le texte dicté, à part de la note), validés à l'import. **Pas de changement de `schemaVersion`** : deux champs facultatifs, les anciennes saisies restent valides telles quelles, pas de migration à écrire. La dictée est visible dans la carte du jour de la page d'une semaine (« Dicté : « … » », avec un micro) et en haut de la saisie quand on la rouvre (`#e-dictation`).
- **Bidon dicté** : Claude ne remplit `bidon` que si un bidon est clairement nommé, et seulement si l'espace a la nutrition. Il complète le bidon du jour de l'espace (volume, EC, pH dits) ou en crée un (`Mix` avec la gamme de l'espace, `spaceNutrition`) ; un bidon nouveau sans volume devient un doute. Sinon, EC et pH vont dans la solution de la saisie.
- **Réglage** « Relire avant d'enregistrer » : `settings.voiceReview` (désactivé par défaut), dans le panneau ; réglage instantané (ne compte pas comme une modification de la saisie).
- Textes : groupe `voice` (FR/EN/DE). Tests : `calc/lot11.test.ts` (13). Script : `e2e-11a.py` (nouveau : runtime Claude simulé et micro simulé : panneau, micro en fr-FR, enregistrement direct + toast + « Annuler » exact, contenu du prompt, doutes (« pH 59 ») sans enregistrement, marque effacée en retapant, trace gardée, réglage « Relire », réponse illisible, bidon créé puis annulé, sans micro, captures FR/EN/DE clair/sombre 390/360). 406 tests.

## Lot 10l2b — notes
- **« Ce que tu as vu ou fait »** (`#e-sec-seen`, remplace les groupes Observations, Actions, Photos et Note) : une rangée d'observations (`#e-obs`, `role=group`), puis une rangée d'actions (`#e-acts`). Dans chaque rangée, **les 4 les plus utilisées** (`topTags` dans `calc/entry-day.ts`, testé) : chaque puce compte une fois par saisie, sur **toutes** les saisies de l'utilisateur (tous espaces) ; à égalité, et sans historique, l'ordre habituel. Une puce cochée hors des 4 reste affichée. Les autres derrière « +N » (`#e-obs-more`, `#e-acts-more`, bordure en pointillé, `aria-label` « 4 de plus »). La gravité se règle comme avant (1, 2, 3, puis retirée) ; la phrase d'aide ne s'affiche que quand une observation est cochée. **Décision prise seule** : l'historique change avec chaque saisie, donc une puce cochée aujourd'hui peut entrer dans les 4 de demain.
- **Fantôme repris** : la sélection de la valeur reprise attend que React l'ait écrite et ne se fait que si le champ a encore le focus (`select()` reprenait sinon le focus d'un champ touché juste après, et la frappe suivante allait dans le premier : trouvé par `e2e-10l2` sur la saisie rapide).
- **« Une note, une photo… »** (`#e-note-open`, ligne de 46 px avec un appareil photo) ouvre la note et les photos (`#e-note-box`) ; elles restent ouvertes quand la saisie a déjà une note ou une photo.
- **Saisie rapide**, même style : titre 24 px, une ligne « dim. 8 févr. modifier » (`#q-when` ouvre `#q-date`) et la phrase d'explication dessous ; un titre Geologica par espace (`data-quick`) avec « Saisie complète › » ; les valeurs d'hier en fantôme (un toucher en reprend une) et « hier 25,4 » sous le champ. Fonctionnement inchangé (seul ce qui est tapé ou repris est enregistré, une saisie par espace, « Saisie complète » emporte ce qui est tapé).
- Textes `entry.seen`, `entry.notePhoto`, `entry.moreTags` (FR/EN/DE). Scripts : `e2e-10l2.py` complété (puces 4 + « +4 », gravité 2, note et photo, saisie enregistrée, puce gardée visible ; saisie rapide : ligne, fantômes, enregistrement de ce qui est tapé ou repris seulement) ; `e2e-2b` ouvre la note par sa ligne. 393 tests.

## Lot 10l2a — notes
- **Découpage** : 10l2 est coupé en 10l2a (la structure de la feuille) et 10l2b (« Ce que tu as vu ou fait », la saisie rapide).
- **En-tête** (`Sheet` gagne `head`, `actions`, `big`) : « Saisie · Floraison » (Geologica 24 px, peut passer à la ligne au zoom 200 %), puis **une ligne** « dim. 8 févr. · 08:30 modifier · tout l'espace ▾ » (`#e-head`). « modifier » (`#e-when`) ouvre la date et l'heure (`#e-when-panel`, `#e-date`, `#e-time`) ; « tout l'espace ▾ » (`#e-scope`, seulement s'il y a un autre espace ou des plantes) ouvre l'espace et la plante (`#e-scope-panel`). L'espace vient de l'onglet ouvert. « Saisie existante, tu la modifies. » reste sous la ligne. **« ⋯ »** (`#e-menu`, petit menu dans l'en-tête, pas un `Popover` : le tiroir est modal) : « Enregistrer et ajouter un rappel » (`#e-remind`), et « Supprimer cette saisie » (`#e-delete`, confirmation : `ConfirmDelete` accepte maintenant `open` / `onOpenChange`) quand la saisie existe.
- **Bande des résultats** (`#e-band`, `calc/entry-day.ts` : `bandKeys`, `bandCell`, testés) : collée sous l'en-tête (`sticky top-0` dans la zone qui défile), `aria-live="polite"`, une colonne par résultat qui a un sens pour l'espace (dryback ou dryback capteur et runoff si arrosage, VPD si climat, DLI si lumière), calculée pendant la frappe (`derive`), « — » tant qu'une valeur manque, en « plante » dans la cible du jour (`dayTargets`), « à surveiller » / « alerte » hors cible ; le dryback capteur n'a jamais de couleur (son échelle). Chaque libellé garde sa bulle du glossaire (lot 10e2).
- **Valeurs de la veille** : `NumField` gagne `ghost` : la valeur d'hier en fantôme (couleur `fg-3` à 35 %) tant que le champ est vide ; **toucher le champ la reprend seule**, sélectionnée (taper la remplace). « hier 25,4 » reste dessous. La phrase grise d'explication disparaît (`entry.resumeHint` supprimé). **« Reprendre hier »** (`#e-resume`, bouton secondaire pleine largeur ; « Dicter » viendra au lot 11) remplit les champs à l'écran encore vides, et disparaît quand il n'y a plus rien à reprendre. Rien n'est enregistré qui n'a pas été tapé ou repris (règle inchangée, vérifiée dans `e2e-10l2`).
- **Ordre des champs** : Arrosage (`#e-sec-water`, « cible dryback 25–50 % » à droite ; pot matin, pot pic, runoff du pot, ou les champs capteur) → Runoff (`#e-sec-runoff`, « cible pH 5,8–6,2 ») → Climat (`#e-sec-climate`, 3 colonnes) → Propagation (si le module) → **une ligne repliée** « Plante, réservoir, réglages » (`#e-more`, « hauteur · reste du bidon » à droite) avec la hauteur, le reste du réservoir et les réglages repris de la veille (volume, doses, EC et pH entrée, bidon, lumière, écart feuille) → observations, actions, photos, note (refaits en 10l2b). Libellés raccourcis comme la planche : « Pot, matin (kg) », « Pot, pic (kg) », « Runoff du pot (mL) » ; section « Arrosage » (FR).
- **Bas** : un seul bouton plein « Enregistrer » (`#e-save`), pleine largeur. Le bouton « Rappel » et la corbeille du bas passent dans « ⋯ ».
- `Group` : l'en-tête de section passe à la ligne s'il manque de place (allemand au zoom 200 %).
- Scripts : `e2e-10l2.py` (nouveau : FR/EN/DE, clair/sombre, 390/360, simulation au 8 février 08:30 : en-tête et ligne, bande collée et annoncée, calcul en direct, un fantôme repris seul et sélectionné, « Reprendre hier », menu « ⋯ », date et espace derrière leurs liens, rien d'enregistré sans action, suppression, zoom 200 %) ; `scripts/entry_ui.py` (`when(pg)` : ouvre la date derrière « modifier ») utilisé par `e2e`, `e2e-10a`, `10d`, `10e`, `10e2`, `10h`, `10i`, `10k3`, `7`, `8d` ; le repère d'ouverture de la saisie devient `#e-when`. 390 tests.

## Lot 10l1 — notes
- **Fichiers** : `screens/space-page.tsx` (nouveau, `SpacePage`) remplace `CultureToday` (today.tsx) et `SpaceToday` / `PropagationCard` / `ReservoirCard` / `DryingCard` (today-spaces.tsx, qui ne garde que les résumés du matin et `ownerName`). `today.tsx` ne fait plus que choisir : « Tous » ou un room → `CalmToday`, un espace → `SpacePage` (clé = l'espace). Calculs purs dans `calc/space-page.ts` (`stepDue`, `waterDay`, testés dans `lot10l.test.ts`). `cycle-steps.tsx` : `StepCard` devient le crochet `useStepAction` (étape en un geste + « Annuler ») ; `LastHarvest` reste (section sans cadre).
- **Ordre fixe** : en-tête (`#space-head`), état (`#space-status`), propagation, relevés (`#readings`), arrosage (`#water-today`), réservoir (`#reservoir`), à faire ici (`#space-todo`), sources (`#space-sources`). Une section sans objet n'est pas rendue (pas de cycle en cours : pas d'état ni de relevés ; pas de module arrosage ou pas de dose (semis) : pas d'arrosage ; pas de réservoir ; aucune tâche dans les 7 jours : pas d'« À faire ici »). Plus de « Bonjour », ni de `ScreenHero`, ni de `Card` sur la page.
- **En-tête** : `SpaceTile` 48 (rayon 13), nom en Geologica 28 px, « Cycle 2 · Melonade Runtz » (`today.cycle`), pilule du stade (`stageLine`, bordure « plante », texte `text-leaf-ink`), qui passe sous le nom s'il manque de place ; sous 260 px de large (zoom 200 %) le carré est masqué pour laisser le nom entier.
- **Bloc d'état** (le seul cadre, rayon 16) : carré de 32 px (coche « plante », « ! » en « à surveiller » ou « alerte », carnet sans saisie) ; titre = `oneCorrection` sur la dernière saisie avec ses cibles enregistrées (sinon « Tout est dans la cible », sinon « Pas encore de saisie ») ; dessous la correction de l'app, ou « Rien à corriger · saisie du 07/02 ». Puis le bouton d'étape à contour (« Passer en 12/12 » · « dans 2 j › »). **Décision prise seule** (`stepDue`) : une étape est « proche » quand son jour prévu est dans 7 jours au plus (ou passé : « prévu il y a 3 j ») ; 12/12 = `plannedFlipDate`, récolte = 12/12 + semaines prévues ; **sans jour prévu** (la végé, un 12/12 jamais prévu) le bouton reste là, sans délai, pour garder l'étape en un geste du lot 10b. La récolte n'apparaît donc que dans sa dernière semaine ; avant, elle se note dans le cycle (Journal → « Récolte » ou la fiche du cycle). Les textes `step.next`, `vegD`, `flipD`, `harvestD`, `vegNext`, `flipNext`, `harvestNext` sont supprimés.
- **Relevés** : titre avec, à droite en petit, « 07/02 · Graphiques → » (ouvre Graphiques). Quatre `Reading` en 2 × 2 (dryback, ou dryback capteur sans cible selon la méthode ; EC runoff ; runoff ; pH runoff) avec la cible enregistrée dans la saisie (sinon celle du jour). Sans saisie : « — » et la cible du jour. Le reste sur une ligne (`#readings-also`) : VPD, EC entrée, DLI, T°/HR, seulement les valeurs présentes ; la ligne ne se coupe qu'entre deux valeurs. Séchoir : T°, HR, VPD, jour de séchage « J7/10 » (sans pilule : le jour n'est dit qu'une fois).
- **Arrosage du jour** (`waterDay`) : « ✓ P1 · 5/5 doses faites » = la phase de la dernière dose passée et combien de ses doses sont passées ; « 11:20 prochaine dose · P2 1/4 · 450 mL » (+ « option » pour une dose P2 facultative) ; après la dernière dose, « Plus d'arrosage : séchage ». Méthode manuelle : « Passages » ; installation : « Petites doses ». « Programme → » ouvre l'outil Arrosage (le programme complet y est). Le rappel « débit à mesurer » reste dessous en mode automatique sans débit.
- **Réservoir** : barre « eau » (`#res-bar`) remplie à la part de litres restants (la goutte-jauge du lot 10g disparaît, comme sur la planche), « 33 L sur 120 L », « ≈ 2 j · 12,5 L/jour · estimé » (ou « niveau saisi »), en « à surveiller » sous le seuil existant (≤ 1 jour, ou solution de plus de 7 jours).
- **À faire ici** : `Todo` de `today-calm.tsx` réutilisé (`here`) : titre « À faire ici », pas de ligne de sauvegarde, sans l'échéance de l'étape montrée dans le bloc (même `kind`, même cycle) et sans le nom de l'espace dans les titres.
- **Textes** : groupe `sp.*` (le groupe `space` existait déjà pour les réglages d'espace) ; 19 textes `today.*` de l'ancienne page supprimés (FR/EN/DE).
- **Scripts** : `e2e-10l1.py` (nouveau : FR/EN/DE, clair/sombre, 390/360 sur la simulation au 8 février 09:30 : valeurs et lignes de la planche, ordre, un seul cadre, aucun bouton plein, étape en un geste puis « Annuler », liens, saisie hors cible, Séchage, Colonne, zoom 200 %) ; `e2e-10b` (la récolte n'est plus proposée 9 semaines avant : notée dans la fiche du cycle), `e2e-10g` (barre du réservoir), `e2e-10h` (bloc d'état et bouton d'étape sans « → »), `e2e-7` (la cible d'EC entrée tapée se lit sur le graphique « EC entrée » d'une saisie enregistrée, puisque la page d'espace ne l'affiche plus). 384 tests.

## Lot 10k4 — notes
- **Vues toutes prêtes** (`VIEWS` dans `calc/series.ts`, testé) : Arrosage = dryback, dryback capteur, runoff, EC runoff ; Solution = EC entrée, pH entrée, pH runoff, Balance ; Climat = T°, HR, VPD ; Lumière = PPFD, DLI ; Plante = hauteur, levée. Onglets texte soulignés « eau » (`#ch-views`, `data-view`), comme les cycles du Journal. **Une vue est masquée** quand aucune de ses courbes n'a de valeur pour les espaces affichés, **quelle que soit la période** (`curvesWithData`) ; dans une vue, une courbe jamais mesurée n'apparaît pas (le dryback capteur d'un espace pesé). Une vue choisie mais masquée (autre espace) retombe sur la première visible.
- **« Perso »** : « Choisir mes courbes » (lien en bas, `#ch-choose`) ouvre la liste complète (`#ch-curves`, 18 courbes) et « Un graphique par courbe / Superposées ». La liste part de la vue affichée ; un changement en fait « Perso » (onglet en dernier), dans l'ordre de la vue puis des ajouts. Tout décocher supprime « Perso ». « Superposées » (graphique recharts conservé, une couleur par courbe, chaque courbe à sa propre échelle) ne vaut que pour « Perso » ; ses lignes sont maintenant droites aussi. **Migration** des préférences `hydro.charts` : l'ancienne liste `curves` devient « Perso », l'ancien `view: "overlay"` devient « Perso » superposé (même clé, pas de renommage).
- **Période** sur une ligne (`#ch-period`) : 7 j · 30 j · Cycle · Tout (petits boutons, zone de toucher 44 px), **30 j par défaut** pour qui n'a jamais choisi (comme la planche) ; « Comparer… » (`#ch-compare`, s'il y a plusieurs espaces) ouvre une feuille avec les espaces (`#ch-spaces`, jusqu'à 4, fonction existante). L'onglet d'espace du haut remet la comparaison à zéro (lot 10d). La ligne « du … au … » disparaît : les dates sont sur l'axe.
- **Un graphique par courbe** (`line-chart.tsx`, SVG fait main, plus recharts) : nom, « cible 25–50 · % » (la cible enregistrée avec la **dernière** mesure du premier espace ; sans cible, l'unité seule), **la dernière valeur en grand** à droite (Geologica 600 ≈ 20 px ; l'unité à côté seulement quand c'est un signe : %, °), orange si elle sort de sa cible. En comparaison, une ligne « ● Floraison 31 % · ● Colonne 37 % » sous l'en-tête (les espaces sans valeur sur la période n'y sont pas). Trois valeurs sur l'axe vertical, quatre dates en bas.
- **Tracé** (`segments`, testé) : segments droits entre les mesures ; un écart plus grand que l'écart habituel de la série (1 jour en général, la taille du paquet une fois moyennée) est relié **en pointillé** ; plus de 7 jours sans mesure : la ligne s'arrête. **Décision prise seule** : la Balance (une valeur par bidon, qui vaut jusqu'au bidon suivant) n'a jamais de pointillé. Bande de cible **du jour** derrière (un rectangle par mesure, couleur « eau » 15 %), rien pendant un rinçage sans cible enregistrée ; points hors cible en « à surveiller » ; petits points sur chaque mesure jusqu'à 45 points, au-delà seulement les hors cible et la dernière (plus grosse) ; bidons en trait vertical pointillé (`data-tank`) ; courbe à la couleur de l'espace.
- **Toucher un jour** (ajout, utile au téléphone sans infobulle) : le jour le plus proche est choisi sur **tous** les graphiques (trait vertical, ses valeurs et sa date à la place des dernières) ; le toucher encore revient aux dernières. Le lecteur d'écran garde le résumé de chaque graphique (lot 10d).
- **Retirés** : sous-titre, ligne des dates, liste d'événements, légende de la goutte, traits d'événement, phrases du bas (`charts.subtitle`, `range`, `spaces`, `curves`, `tankMark`, `overlayOne`, `gapNote`, `events`, `target`, `foot`). Légende en une ligne (`#ch-legend`) : « ● hors cible · ▬ cible du jour · ┊ nouveau bidon · - - jour sans mesure ». `charts.k.runoffPct` = « Runoff » (FR/EN/DE), comme la planche.
- Scripts : `e2e-10k4.py` (nouveau : FR/EN/DE, clair/sombre, 390/360 sur la simulation au 8 février : vues, 38 % / 11 % / 4,0 comme la planche, pointillé du 02/02, bidons, toucher, 7 j, Séchage = Climat seul, feuilles, « Perso » gardé, anciennes préférences) ; `e2e-6a`, `e2e-8d`, `e2e-10d2`, `e2e-10g` adaptés (feuilles, `data-tank`, axe au lieu de « du … au … »). 377 tests.

## Lot 10k3c — notes
- **Un seul commit avec 10k3b** : la page d'une semaine a été finie pendant la régression de 10k3b ; les deux sont livrés et vérifiés ensemble (artefact v53).
- **Route** : `#journal/<espace>/<lundi>[/<jour>]` (`Route.week`, `Route.day`), ouverte par « Voir la semaine → » (bas d'une semaine ouverte), le résumé d'une semaine ouverte, ou un jour de la bande (la carte de ce jour est amenée à l'écran). « ‹ Journal » et le geste retour reviennent au Journal.
- **En-tête** : retour, espace et cycle à droite ; « Végé S6 » ; « 2–8 févr. · 5 saisies · comparée à Végé S5 » (ou « première semaine »). **Décision prise seule** : la semaine d'avant est celle **du même cycle, où qu'il était** (un transfert garde la comparaison, comme sur la planche) ; la semaine elle-même ne compte que les saisies de l'espace.
- **Valeurs clés** (`metricLines`, testé) : dryback (ou dryback capteur, sans cible), runoff, EC runoff, pH runoff, VPD ; séchoir : T°, HR, VPD ; seulement celles mesurées cette semaine. Une valeur par jour (la saisie de l'espace, la dernière du jour). Ligne : nom et cible (celle enregistrée avec la dernière saisie de la semaine), mini-courbe des 7 jours (segments droits, pointillé au-dessus d'un jour sans valeur, bande de cible, points hors cible « à surveiller »), moyenne de la semaine, flèche et moyenne de la semaine d'avant, jours dans la cible (« 4/5 j »), en « plante » si tout est dans la cible ou s'en rapproche, sinon « à surveiller ».
- **Verdict** (`weekVerdict`, testé), seulement d'après les cibles enregistrées : « Bonne direction. » si chaque valeur avec cible est dans la cible toute la semaine, ou si sa moyenne y est ou s'en rapproche par rapport à la semaine d'avant ; sinon « À surveiller. ». Puis « Tout est dans la cible » ou « Tout est dans la cible sauf : pH runoff le 05/02 », « VPD : de retour dans la cible (1,42 la semaine d'avant) », « … : s'éloigne de la cible (…) », « Première semaine : rien à comparer. ». **Décision prise seule** : tournure « Valeur : de retour dans la cible » (sans article, pour éviter les accords « le VPD / l'EC »). Sans aucune cible (séchoir) : « Pas de cible enregistrée pour ces valeurs : seulement les relevés. », sans verdict.
- **Jour par jour** : trois cartes puis « Voir mer. 4, mar. 3 » ; en tête le jour et l'alerte (« pH runoff hors cible »), sinon l'action ou l'observation, sinon le climat ; quatre valeurs en grille (hors cible en « à surveiller ») ; toucher une carte ouvre la saisie de ce jour.
- Textes `wp.*` (FR/EN/DE). Scripts : `e2e-10k3.py` (page de la semaine en FR/EN/DE, clair/sombre, 390/360 ; jour de la bande → carte ; carte → saisie ; retour). 370 tests.

## Lot 10k3b — notes
- **Semaines** (`calc/weeks.ts`, testé) : semaines du calendrier **du lundi au dimanche** (la bande « L M M J V S D » de la planche validée : « Végé S6 · 2–8 févr. »). **Décision prise seule** : une semaine porte le nom du stade de **son jeudi** (le jour que la majorité de la semaine partage), dans le cycle : « Semis S1 », « Végé S6 », « Floraison S3 » (semaines de floraison comptées depuis le 12/12), « Séchage S1 » (après la récolte), « Avant le départ ». Une semaine où le 12/12 tombe un vendredi garde donc le nom de la végé.
- **Ce que montre le Journal** : dans un onglet d'espace, les saisies **de cet espace et du cycle choisi** (« Cycle 2 · Cycle 1 » en tête, le cycle actif d'abord), ses bidons et ses événements ; en vue « Tous » ou room, une carte **par semaine et par espace** (dans l'ordre des espaces), sans choix de cycle. La semaine en cours est ouverte (et la précédente si la semaine en cours n'a encore rien), les autres repliées ; 8 semaines puis « Semaines précédentes ». La semaine en cours du cycle s'affiche même avant sa première saisie.
- **Bande des 7 jours** : « plante » translucide = saisie dans la cible ; « à surveiller » = au moins une valeur hors cible **d'après les cibles enregistrées dans la saisie** ; pointillé = pas de saisie ; contour « eau » = aujourd'hui ; un point « eau » sous le numéro = bidon, action ou événement ; jours à venir grisés. Toucher un jour ouvre **la page de la semaine sur la carte de ce jour** (10k3c) ; un jour sans saisie ouvre une nouvelle saisie à cette date.
- **Résumé** : replié, quelques mots (« tout dans la cible · 1 bidon », « 1 jour hors cible · 1 incident », un événement) ; ouvert, les plages des valeurs clés (« dryback 32–38 % · EC ro 3,6–4,3 », séchoir : « T° 18–19° · HR 58–61 % ») puis les comptes.
- **Jours qui comptent** (une ligne par jour, icône de 28 px) : alerte (« pH runoff 4,8 », « hors cible 5,8–6,2 · dryback 32 % ») avant bidon (« Nouveau bidon · Rempotage », « 105 L · EC 3,1 · pH 6,0 »), action (« LST »), observation (la note entre guillemets), événement, note ; deux libellés au plus, chacun une fois. Les autres jours : « + N jours sans souci », dépliable. Toucher une ligne ouvre la saisie (sinon le bidon ou l'événement).
- **Ligne du haut** : le cycle, la **loupe** (recherche dans les notes, observations et actions, sans accents ni majuscules ; résultats en lignes par jour) et l'icône des **filtres** (la feuille de 10j2, un point « eau » quand un filtre est actif ; filtres actifs en une ligne avec « Effacer »).
- **Retiré** : la carte du cycle, la grille des plantes et les tiroirs « Événements · Bidons · Récolte » (bidons et événements sont dans les semaines à leur date). **Décision prise seule** : pour ne rien perdre, une ligne discrète en bas d'un onglet d'espace garde « Modifier le cycle », « Récolte » (une fois en floraison) et « Plantes » (la grille des pots dans une feuille). Clés `journal.events/mixes/harvest/editHarvest/eventsEmpty/mixesEmpty/history/entries/entryOne/cycle/subtitle` retirées.
- **Performance** : semaines calculées une fois par changement (`useMemo`) ; 400 saisies < 250 ms en test unitaire ; la simulation d'un an s'ouvre dans « Tous » sans attente (`e2e-10k3.py`).
- Scripts : `e2e-10k3.py` complété (avec `dist-local` et la simulation : FR/EN/DE, clair/sombre, 390/360 ; bande, lignes, jours sans souci, loupe, autre cycle, « Tous ») ; `e2e-10h.py` (Journal par semaines), `e2e-4a.py` (le bidon dans sa semaine), `e2e-10d2.py` (filtres : la journée « Griffes » dans sa semaine).

## Lot 10k3a — notes
- **Découpage** : 10k3 est coupé en 10k3a (le « + »), 10k3b (Journal par semaines) et 10k3c (page d'une semaine).
- **« + »** (`screens/add-sheet.tsx`, `#tab-plus`, libellé « Ajouter ») : une petite feuille sans barre du bas (`Sheet` accepte maintenant `footer` absent) : Saisie du jour (l'espace de l'onglet, sinon celui du cycle actif), Saisie rapide (seulement s'il y a plusieurs espaces), Nouveau bidon, Événement ; icônes au trait « eau » / « plante ». Choisir une ligne ferme la feuille et ouvre l'autre dans le même geste (un seul pas d'historique : retour ferme la nouvelle). Sans espace, le « + » ouvre toujours le cycle d'abord. **Changement de comportement** : en vue « Tous », le « + » n'ouvre plus directement la saisie rapide (elle est dans la feuille).
- **Journal** : les trois gros boutons du haut (Saisie rapide, Événement, Nouveau bidon) sont retirés (clés `journal.addEvent`, `journal.addMix`, `quick.open` supprimées).
- Accessibilité : l'interrupteur des lignes à bascule (`SwitchRow`, ex. dôme de la saisie) est marqué `hit` (sa ligne de 44 px est la zone de toucher), relevé par `e2e-10e.py` maintenant que le « + » ouvre la saisie de l'espace du cycle actif.
- Scripts : `e2e-10k3.py` (nouveau : la feuille en FR/EN/DE clair/sombre, chaque ligne ouvre sa feuille et retour la ferme, plus de gros boutons, un seul espace sans « Saisie rapide ») ; les scripts qui ouvraient la saisie par le « + » passent par `#tab-plus` puis `#add-entry` ou `#add-quick` (2b, 8d, 8e, 10a, 10d, 10e, 10e2, 10h, 10i, e2e.py). 359 tests.

## Lot 10k2b — notes
- **Pulvérisation** (`screens/tools/spray.tsx`, route `#tools/ipw` gardée) : un choix en haut, « IPW Athena » ou « Mon mélange » (retenu sur le téléphone, clé `hydro.sprayKind` ; sans choix : IPW si l'add-on est activé ou s'il n'y a aucun mélange). **IPW Athena** = l'écran du lot 5, inchangé (protocoles, fenêtre, checklist, `product: "ipw"`, rappel `ipw_*`).
- **Mon mélange** : un spray maison ou un stack décrit par l'utilisateur : nom, produits et **dose par litre telle que saisie** (mL ou g, dose facultative : « dose non saisie »), fréquence « tous les N jours » (facultative), **ses propres points de checklist** (un par ligne, aucun point proposé), notes. Marqué « perso, non vérifié ». **Aucune dose proposée** : l'app multiplie seulement les doses saisies par les litres du pulvérisateur (« Dans le pulvérisateur : Silice 1 mL »). « Depuis mes produits » reprend le **nom et l'unité** d'un produit perso, jamais sa dose (elle est pour le bidon ou l'arrosoir).
- **Données** : les mélanges vivent dans le document du grow (`grow/main`, champ `sprayMixes`), pas dans une nouvelle collection : ni le format `hydro-backup`, ni les règles de la base de l'artefact (donc ni les capacités) ne changent. Lecture filtrée (`validMixes`) : un mélange mal formé (sauvegarde éditée) est ignoré sans jamais écarter le grow. Une pulvérisation de mélange est un document `sprays/*` avec `product: "mix"`, `mixId` et **une copie du mélange du jour** (`mix`: nom et doses), sans `mlPerL` (devenu facultatif, réservé à l'IPW). Supprimer ou modifier un mélange ne touche pas aux pulvérisations passées.
- **Rappel** : nouvelle échéance automatique `spray` (« Pulvérisation Spray maison · Floraison », source « tes données ») = dernière pulvérisation du mélange dans l'espace + sa fréquence, tant qu'un cycle y tourne (`nextMixSpray`, testé). Sans fréquence, pas de rappel (« Pas de rappel : donne une fréquence au mélange »).
- Textes `spray.*`, `cal.dl.spray`, `tools.ipw` = « Pulvérisation », `tools.ipwD` = « IPW Athena ou ton propre mélange » (FR/EN/DE). Scripts : `e2e-10k2.py` complété (création, quantités, checklist, pulvérisation enregistrée, rappel sur Aujourd'hui, choix retenu, modification puis suppression ; FR, EN, DE). 357 tests (`lot10k.test.ts` : quantités sans dose inventée, prochaine pulvérisation, formulaire, échéance du calendrier, IPW inchangé).

## Lot 10k2a — notes
- **Découpage** : le lot 10k2 est coupé en 10k2a (la liste d'Outils) et 10k2b (Pulvérisation générique, qui touche aux données et aux rappels).
- **Outils** (`screens/tools.tsx`) : trois groupes au petit titre en capitales (Geologica 12 px, interlettrage 0,12 em) : « Chaque jour » (Nutrition, Arrosage, pH, Calendrier), « Régler la pièce » (Lumière, Climat, Pulvérisation), « Mon installation » (Équipement, Repères Athena, Sauvegarde). Lignes de 54 px sans trait, icônes au trait colorées par sujet (`LineIcon tone` : « eau » Nutrition / Arrosage / pH, « plante » Lumière / Climat / Pulvérisation, neutre le reste ; Climat prend le thermomètre). Mots simples de la planche (`tools.*D`), « Climat et air » → « Climat », « pH / Balance » → « pH », « Repères » → « Repères Athena » (titres repris dans la page de chaque outil).
- **Premiers pas et Réglages** ne sont plus listés ; leurs routes `#tools/start`, `#tools/settings` (et les anciennes `#start`, `#settings`) restent. Une ligne en bas : « Premiers pas et Réglages : dans l'engrenage en haut. » ; le menu de l'engrenage gagne « Premiers pas → » (`#menu-start`) sous « Tous les réglages → ». La phrase « Calculs testés… » (`tools.subtitle`) est retirée.
- **Décision prise seule** : « Demander à Claude » (version Claude seulement, capacité `sample`), absent de la planche, reste en dernière ligne de « Chaque jour ».
- Scripts : `e2e-10k2.py` (nouveau : groupes, ordre, 54 px, couleur des icônes, pas de dessin ni de trait, ligne du bas, calendrier et retour, anciennes routes, « Premiers pas → » du menu ; FR/EN/DE, clair/sombre, 390/360) ; `e2e-10h.py` (Nutrition en premier). 353 tests (`lot10k.test.ts` : groupes, couleurs, textes).

## Lot 10k1b — notes
- **Écran** (`screens/today-calm.tsx`, `CalmToday`, vue « Tous » ou une room) : titre « Bonjour Thomas. » (Geologica 30 px), bloc « Maintenant », À faire, Espaces, 36 px entre les sections (`gap-9`). La vue d'un espace (`SpaceToday`) garde provisoirement son contenu, **sans** le résumé « Bonjour » (refaite au lot 10l).
- **« Maintenant »** (`calc/now.ts`, `chooseNow`, testé) : le seul cadre (rayon 18) et le seul bouton plein de l'écran. Ordre : (1) une alerte d'une saisie d'aujourd'hui ou d'hier d'un cycle en cours, calculée par `oneCorrection` avec les **cibles enregistrées dans la saisie** (« à corriger » avant « à surveiller ») → titre et correction de l'app, bouton « Ouvrir Floraison » ; (2) la saisie du jour pas faite, une fois l'heure d'allumage du cycle passée, dans un espace qui a des mesures (arrosage ou climat) → « Faire la saisie » ; (3) une échéance du calendrier due aujourd'hui ou en retard, la plus ancienne → « C'est fait » ; (4) « Tout est à jour », sans bouton. « Ensuite : » = la prochaine **échéance** (60 jours), sinon le prochain rappel. L'espace est toujours nommé (l'écran n'existe qu'en vue « Tous » ou room).
- **À faire** : rappels et échéances des 7 prochains jours (et en retard), **3 lignes au plus** (la sauvegarde en prend une), sans ce que « Maintenant » montre déjà (l'échéance affichée et « Ensuite »), puis « + N autres · Tout le calendrier → ». Case, titre, date en chiffres à droite, l'espace en sous-ligne s'il y en a plusieurs (et retiré du titre quand il y était : « Refaire le bidon (≈ 105 L) »). Plus de bouton « reporter » ni de source sur Aujourd'hui (ils restent dans le calendrier).
- **Espaces** : une ligne de 64 px par espace (carré teinté 40 px avec le dessin du stade, nom, stade « Végé S6 · J41 » / « Cycle 1 · J7/10 » / « Vide », un état, chevron) ; toucher la ligne ouvre l'onglet de l'espace. **Un seul état** (`lineState`, testé), dans l'ordre : pas commencé ; pas de cycle ; pas de saisie ; valeur hors cible de la dernière saisie récente (« à corriger » / « à surveiller », **décision prise seule** : pas le nom de la mesure, pour rester sans jargon ; « Maintenant » la nomme) ; pas de saisie depuis plus d'un jour (« saisie il y a 8 j ») ; réservoir sous le seuil d'alerte existant (≤ 1 j, ou solution de plus de 7 jours en drain-to-waste : « bidon ≈ 1 j », « bidon vieux de 9 j ») ; un séchoir montre son climat (« 19° · 61 % ») ; sinon « dans la cible ». Point coloré « plante » / « à surveiller » / « alerte », aucun point pour un état neutre.
- **Bandeau Premiers pas** (`guide-line.tsx`) : 🌱, « Premiers pas · 6/7 », « Prochaine étape : … » (deux lignes au plus), barre de progression « plante », bouton secondaire « Y aller » qui ouvre **l'étape** (`useStartAction`, exporté de `tools/start.tsx`), × (même clé `hydro.startHidden`, « Remettre la carte » des Premiers pas le rouvre). La sauvegarde n'est plus dans le bandeau : c'est l'étape quand elle est la suivante, sinon une ligne « Faire une sauvegarde · il y a 9 j » dans À faire (`#backup-reminder`, version locale, 7 jours).
- **Retiré** : la bande de la semaine (`week-strip.tsx`, clés `week.label/prev/next/day`), le résumé en lignes (`BonjourCard`, option `rows` de `buildDailyDigest`, `DigestRow`, clés `row.*` sauf `hello`/`helloNoName`), les cartes d'espace à 4 relevés (`SpaceCard`, `spaceState`), la ligne de sauvegarde (`backupRem.*`, `start.line/go/cardTitle/cardNext`). **Le texte du résumé du matin (`digest/{date}`, `texts.fr`) ne change pas** ; il reste écrit par `DigestKeeper` dès qu'Aujourd'hui est ouvert, quelle que soit la vue.
- **Règle 3 (petits dessins)** appliquée à toute l'app : `Label` (titres de section) n'a plus de dessin (prop `emoji`/`mark` retirée des 22 écrans, `CURVE_EMOJI` des Graphiques retiré) ; `Reading` n'a plus de dessin. Restent : carrés d'espace, « Maintenant », bandeau Premiers pas (et l'assistant, les états vides, inchangés).
- **Chiffres dans les phrases** : `NumText` (`value.tsx`) met les nombres d'une phrase en Geologica 600 (dates et heures en 500 ; `quiet` = tout en 500 pour les sous-lignes de stade).
- **Un seul espace** : les onglets d'espace restent cachés sur « Tous », mais s'affichent quand l'espace est ouvert (sinon pas de retour à « Tous » depuis sa ligne).
- Textes `calm.*` (FR/EN/DE). Scripts : `e2e-10k1.py` (nouveau : ordre, un cadre, un bouton plein, dessins seulement aux trois endroits, 3 tâches, lignes de 64 px, alerte du jour, retard de 8 jours, avant l'allumage, un seul espace, × et « Y aller », FR/EN/DE, clair/sombre, 390/360) ; `e2e-10j.py` réduit au Journal (filtres) et vérifie l'absence de dessins dans les titres ; `e2e-10h.py` (plus de bande de la semaine, « Bonjour » = titre de l'écran) ; `e2e-10b.py` (« Maintenant »). 350 tests (`calc/lot10k.test.ts` : `chooseNow`, `lineState`, textes, structure de l'écran ; `lot10h/10i/10j` mis à jour).

## Lot 10k1a — notes
- **Polices** : `@fontsource/geologica` (500, 600, 700) ; `@fontsource/jetbrains-mono` retiré. Lien Google Fonts : Figtree, Fraunces (`opsz,wght,SOFT@9..144,700,100`, le logo seul), Geologica `wght@500;600;700`. Version locale : `src/fonts-local.css` (Geologica 500/600/700, plus de JetBrains). `scripts/fonts.py` sert Geologica aux captures. **Décision prise seule** : le prompt dit « seulement les graisses utilisées (500 et 700) » mais demande aussi Geologica 600 pour les grandes lectures et les chiffres dans les phrases : 500, 600 et 700 sont chargées (une graisse 400 demandée prend 500).
- **Jetons** (`src/index.css`) : `--font-title` et `--font-number` (Geologica, repli Figtree puis system-ui) ; `--font-display` (Fraunces) ne sert plus qu'à `.logo-font` (le logo `Wordmark`, donc aussi l'écran de démarrage) ; `--font-mono` pointe sur `--font-number` (plus de police code). `.display` = titres : Geologica 700, −0,02 em, sans axe SOFT ; `.font-num` (et `.tabular`) = chiffres : Geologica, `tabular-nums`. Toutes les classes `font-mono` du code sont devenues `font-num`. `Label` (titre de section) passe à 19 px ; « Bonjour Thomas. » en `.display`.
- **Valeur** (`components/hydro/value.tsx`, `Value`) : le composant unique des nombres avec unité : Geologica 600 à chasse fixe, unité plus petite (moitié pour les grandes lectures, 0,85 em dans le texte), graisse 500, couleur discrète, séparée par une espace fine insécable (`NNBSP`, U+202F) : « 38 % ». Tailles `lg` ≈ 30 px, `md` ≈ 22 px, `sm` = taille du texte. `Reading` l'utilise.
- Scripts : `e2e-10f.py` (titres en Geologica sans SOFT, logo en Fraunces), `e2e-10g.py` (jauge en Geologica), `e2e-10h.py` (champ, « Bonjour », bouton d'étape, date du Journal en Geologica). 344 tests (4 nouveaux, `calc/lot10k.test.ts` : jetons, plus de JetBrains ni de `font-mono`, Fraunces dans le logo seul, `Value`).

## Lot 7b — notes
- **Modèle** : `CustomProduct.application` = `"tank" | "hand" | "roots"` (« dans le bidon », « à la main », « sur les racines », une fois au transfert, inchangé). Un produit « à la main » garde sa dose d'étiquette comme un produit du bidon (`labelDose`, `dosePer10L`) et ses semaines (`use`). Rien à migrer : les anciens produits sont « bidon » ou « racines ».
- **Jamais dans le bidon ni dans son EC** : `mixRecipe` (Athena) ne prend que `application === "tank"` (`customApplies`, inchangé) et `ownRecipe` (« Autre marque ») aussi ; tests sur Pro Line, Blended et « Autre marque ».
- **« À la main, si tu veux »** (`handList` dans `calc/own-recipe.ts`, `HandProducts` dans `screens/tools/own-recipe.tsx`) : sous la recette, dans « Autre marque » comme dans Athena (« hors Athena, non vérifié »), les produits « à la main » actifs de la phase (dans leurs semaines ; tous quand la phase n'est pas connue ; « semaines à préciser » sinon), avec leur dose **par litre d'arrosoir** (= dose pour 10 L ÷ 10, « 1–2 mL par litre d'arrosoir »). Pas de fréquence, pas de rappel automatique : un bouton « Ajouter un rappel » ouvre la fiche de rappel avec le titre « À la main : Enzymes D » et l'espace.
- **Formulaires** : la fiche d'un produit perso propose bac / à la main / racines ; « Partir de l'étiquette » propose bac / à la main. Les deux portent l'aide d'une ligne (conseil général, sans chiffre) : « Produits organiques (enzymes, sucres, extraits) : plutôt à la main, ils peuvent boucher les goutteurs et se dégrader dans un bac de plusieurs jours. » « Ma gamme » liste aussi, à part, les produits « à la main » (hors ordre de mélange).
- Scripts : `e2e-7.py` complété (aide dans le formulaire, produit « à la main » absent du bidon et listé dessous, « Ajouter un rappel » avec son nom, retour sur Athena Pro Line : le produit sous la recette Athena, hors de l'ordre de mélange ; captures FR / EN / DE de Nutrition en « Autre marque » avec trois produits dont un à la main). 340 tests (3 nouveaux).
- Fin du lot 7 : régression complète verte (tous les scripts e2e, 10h, 10i, 10j, 7) ; simulation d'un an refaite : aucun plantage, mêmes résultats (les 4 échéances « mesurer le débit » du simulateur).

## Lot 7a — notes
- **Décision de Thomas (19/10/2026)** : on abandonne le catalogue multi-marques. L'app reste **Athena seule** (Pro Line, et Blended dans la version des potes) ; les autres marques s'entrent **à la main**, produit par produit, avec les doses de leur étiquette. La recherche sur Canna, Plagron, Mills, Advanced Nutrients et Terra Aquatica reste dans le projet claude.ai, **pas dans l'app**. Lot coupé en **7a** (« Autre marque » devient une recette perso) et **7b** (« à la main », produits perso dans Athena).
- **Calcul** (`calc/own-recipe.ts`, pur, testé dans `calc/lot7.test.ts`) : `LABEL_VOLUMES` (1 L, 4 L, 10 L, gallon US), `GALLON_L = 3.785`, `per10L(lo, hi, perL)` (dose de l'étiquette → pour 10 L, 2 décimales), `doseFor` (× volume / 10, 1 décimale), `ownPhaseOf` (végé, ou semaine de floraison ; rien pour le semis, le rinçage, la récolte), `usedIn` (végé coché, semaines de floraison de–à ; `null` = semaines non saisies), `inListOrder` / `moveInOrder` / `hasMixOrder` (ordre de mélange), `ownRecipe(produits, phase, volume)` : produits « bidon » actifs, dans l'ordre de la liste ; une dose unique donne une quantité, une fourchette reste min–max ; un produit hors de ses semaines n'apparaît pas ; sans semaines saisies il est listé « semaines à préciser », sans dose « dose à saisir », jamais de quantité inventée.
- **Modèle** : `CustomProduct.mixOrder` (place dans l'ordre de mélange ; absent partout = « ordre non précisé ») et `labelDose.gal` (étiquette en gallon US, `perL = 3.785`). `NutritionSettings.own` (`OwnTargets` : `veg` / `flower`, chacun `ec` (une valeur, lo = hi) et `ph` (min–max)) ; suit `spaceNutrition` comme le reste. `saveCustomProducts(liste)` (une écriture groupée) pour l'ordre.
- **Cibles** : `dayTargets(…, { own })` : avec « Autre marque », `ecIn` / `phIn` seulement si saisis (`src: "user"`, « EC et pH : tes cibles » dans les sources d'Aujourd'hui) — végé pour la végé, floraison pour stretch / masse / finition, rien pour le semis et le rinçage ; sans saisie, aucune cible et la jauge reste sans zone. Les gammes Athena ignorent `own` (test). Réglages → Nutrition, avec « Autre marque » : « Mes cibles (facultatif) » (EC visée, pH min, pH max, en végé et en floraison ; un seul côté du pH saisi = cette valeur), enregistré 0,6 s après la frappe (`ownTargetsFromText`).
- **Écran** (`screens/tools/own-recipe.tsx`, remplace « Mon bidon » du lot 10e) : « Ma recette » (phase Végé / Floraison d'après le cycle, semaine de floraison, volume ; « Le bidon » : l'eau puis les produits dans l'ordre, numérotés seulement quand l'ordre est donné, sinon la note « Ordre de mélange non précisé » ; chaque produit « perso, non vérifié » ; EC visée (indice « ta cible : … » si elle existe), EC et pH mesurés, note facultative, « Enregistrer ce bidon ») ; « Ma gamme » : les produits « bidon » (désactivés compris) avec flèches monter / descendre, chacun ouvre sa fiche complète ; **« Partir de l'étiquette »** : nom, unité, dose (et dose max si fourchette), pour 1 L / 4 L / 10 L / 1 gal US (la formule du gallon affichée), végé, floraison de S à S — rien d'autre (pas de NPK). La fiche complète d'un produit perso (`CustomProductSheet`) prend le même choix de volume (plus « Autre » avec le champ libre d'avant).
- **Bidon enregistré** (`Mix`) : `line: "own"`, `phase` (`veg`, `fl4`…), `kind`, `items` (produits et quantités du jour, fourchettes gardées), `recipe` (texte « Base A 80 mL · Base B 42,3–63,4 mL »), `note`, EC / pH mesurés et visée.
- **Données existantes** : rien à migrer. Un espace déjà en « Autre marque » garde sa note texte (le `recipe` du dernier bidon), affichée au-dessus de la recette tant qu'aucune quantité n'est calculée ; un vieux backup s'ouvre sans perte (test).
- **Décision prise seule** : les produits perso déjà présents (ex. Proper de Thomas, « dans le bidon ») font partie de « Ma gamme » si l'espace passe en « Autre marque » ; leurs semaines non saisies les laissent « à préciser », sans quantité.
- Scripts : `scripts/e2e-7.py` (Réglages : « Mes cibles » vides ; la note texte d'un vieil espace « Autre marque » ; trois produits ajoutés par « Partir de l'étiquette » : 20 mL / 10,57–15,85 mL / 2,50 g pour 10 L ; végé 40 L : eau, 80 mL, 42,3–63,4 mL, pas le produit de floraison ; « ordre non précisé » puis numéros après « Monter » ; floraison S4 : le troisième apparaît, S7 : il disparaît ; bidon enregistré avec ses produits et `fl4` ; Aujourd'hui : pas de zone d'EC entrée, puis « cible 1,8 » une fois saisie ; captures FR / EN / DE de Nutrition en « Autre marque » avec trois produits) ; `e2e-10e3.py` adapté (la note remplace « Produits et doses »). 337 tests (7 nouveaux).

## Lot 10j2 — notes
- **Journal** : les quatre rangées de filtres (Espace, Plante, Stade, Tag) passent dans une feuille (`Sheet`, `dirty={false}` : un filtre s'applique tout de suite, rien à perdre) ouverte par un bouton secondaire « Filtres » (`#journal-filters`) sous le titre Historique ; dans la feuille, chaque filtre a son nom au-dessus et ses choix qui passent à la ligne (plus de défilement horizontal) ; pied : « Effacer » et « Voir 12 saisies » (`journal.filtersShow`). Les filtres actifs s'affichent en une ligne à côté du bouton (« Colonne · Griffes », `#journal-filter-summary`) avec « Effacer » (`journal.clear`). Pas de bouton quand rien n'est filtrable (un espace, pas de plante, un stade, aucun tag).
- **Dessins sur les titres** (`Label … mark`) : Journal (Cycle 🌱, Plantes 🪴, Historique 📖, Événements 📅, Bidons 🧪, Récolte 🫙), chaque graphique (`CURVE_EMOJI` : dryback 💦, EC et pH 🧪, Balance 🫙, volume et runoff 💧, température 🌡️, humidité 🌬️, VPD 💧, PPFD et DLI ☀️, hauteur 🌿, levée 🌱, consommation et réservoir 🪣 ; superposées 📈, événements 📅), groupes des Réglages (Affichage ⚙️, Grow 🪴, Nutrition 🧪, Espaces 🌿, Pièces 🧭, Cycles 🌱). Outils (la liste) ne change pas. Sous 260 px de large (zoom 200 %), le dessin d'un titre s'efface pour laisser la place aux mots (« Événements » ne tenait pas).
- **Cadre** : dans le Journal d'un espace, la carte du cycle (un objet à part) reprend un cadre (`#journal-cycle`), comme les cartes d'espace ; le reste reste en sections.
- Scripts : `e2e-10d2.py` ouvre « Filtres » pour filtrer et vérifie la ligne résumée ; `e2e-10j.py` vérifie aussi, dans les trois langues, clair / sombre, 390 et 360 px : bouton « Filtres » et aucune rangée de filtres sur l'écran, feuille sans défilement horizontal ni libellé coupé, ligne résumée après un choix, titres avec dessin (Journal, graphiques, Réglages), Outils sans dessin ; captures Journal, feuille des filtres, Graphiques et Réglages. 330 tests (2 nouveaux).
- Fin du lot 10j : régression complète verte (tous les scripts e2e, 10h, 10i, 10j) ; simulation d'un an refaite (`scripts/sim/build.ts` + `validate.ts`) : aucun plantage, mêmes résultats qu'au lot 10e3 (les 4 échéances « mesurer le débit » qui traînent viennent du simulateur).

## Lot 10j1 — notes
- **Constat de Thomas après 10h** (décision, prime sur 10h2) : « on a perdu fort en clarté ». Le lot 10h avait retiré **en même temps** les petits dessins (repères pour l'œil) et les cadres (« plus de cartes » au lieu de « pas de cartes dans des cartes ») : tout avait le même poids. On garde le reste du 10h (palette, polices, barre d'onglets, bande de la semaine, Journal en lignes, Outils, boutons). Planche de référence : https://claude.ai/artifact/LL3N2GPDqUm5grTnmvJziR. Lot coupé en **10j1** (Aujourd'hui) et **10j2** (autres écrans).
- **Résumé du matin en lignes** (remplace les phrases de 10h2) : `buildDailyDigest(…, { rows: true })` ajoute à chaque ligne un `row` (`DigestRow` : `icon`, `text`, `note`, `value`, `muted` ; textes `row.*`), la tâche du matin n'en reçoit jamais (`text` et `texts` identiques, test). `BonjourCard` : « Bonjour Thomas. » (Fraunces 500 droit, inchangé), une petite ligne « 3 espaces · dernière saisie hier » (`row.sub`, la saisie la plus récente des espaces montrés : aujourd'hui + heure, hier, sinon la date), puis une ligne par idée, ≥ 44 px, trait fin entre les lignes : dessin 24 px (`alt=""`), texte court (et une note plus discrète), valeur en mono à droite. Ce qui demande l'attention (`warn` de la ligne) : **seule la valeur** passe en « à surveiller » (avec « À surveiller » pour les lecteurs d'écran). Plusieurs espaces : un petit titre par espace avec son carré ; un espace vide = une seule ligne discrète « Colonne : vide, pas de cycle en cours » ; deux espaces pleins d'abord (« Voir tout »), les vides ne comptent pas.
  - Correspondances : stade 🌱/🌿/🌸/✂️ (`stageEmoji`, `app/labels.ts`) « Cycle 2 · Végé S6 » ; climat 🌡️ « 25,4 °C · 59 % » → « VPD 0,96 » ; arrosage 💧 « 5 doses dès 07:30 » → « 2,3 L/pot » (manuel → l'heure, installation → les mL, rinçage → « EC < 0,1 ») ; réservoir 🪣 « Réservoir · ≈ 33 L, estimé » → « ≈ 2 j » (« donnée manquante » si inconnu) ; solution trop vieille 🪣 → « 9 j » ; séchage ✂️ « Cycle 1 · séchage » → « J7/10 » ; rappel 🔔 → l'heure ; échéance du jour ⏰ → « aujourd'hui » ; dernière saisie 📓 : **pas de ligne quand elle est récente** (l'en-tête la donne), une ligne « Dernière saisie → 31/01 » (ou « aucune ») quand elle date de plus d'un jour.
- **Un cadre par espace** (`SpaceCard`) : `Card framed` (surface, trait 1 px, rayon 14), un seul niveau, pas de liseré. En tête `SpaceTile` (`space-pill.tsx`) : carré 42 px, rayon 11, `color-mix(in oklab, couleur de l'espace 22 %, transparent)`, dessin du stade 28 px au centre ; nom en Fraunces 20 ; « Cycle 2 · Végé S6 · J41 » (séchage : « Cycle 1 · séchage J7/10 ») ; à droite la pilule d'état (`StatePill`, `pill.*` : À venir, Semis, Végé, Floraison, Récolté, Séchage, Vide ; plante pour semis / végé, violet pour la floraison, neutre sinon). Relevés en 2 × 2 (`Reading compact` : dessin 15 px devant le libellé, valeur 22 px, barre de cible seulement quand une cible existe, pas de ligne « cible » dessous) : dryback 💦, EC 🧪, T° / HR 🌡️, VPD 💧, germination 🌱. Pied : « Dernière saisie · le 07/02 » et, à droite, 🪣 « bidon 5 j ». **Décision prise seule** : le prompt dit « l'âge du bidon » ; c'est l'âge du dernier bidon (`mixAgeDays`), en orange au-delà de 7 jours en drain-to-waste. L'autonomie du réservoir n'est plus sur la carte : elle est dans le résumé (« Réservoir … ≈ 2 j ») et dans la vue de l'espace. `spaceState` dit le stade de la carte (cycle en cours, sinon séchage via `dryingCycle` de `calc/digest.ts`, sinon récolté ou vide).
- **Ordre d'Aujourd'hui** : barre du haut, onglets, bande de la semaine, puis **une ligne fine** (`screens/guide-line.tsx`, `GuideLine`) qui remplace la carte « Premiers pas » et le rappel de sauvegarde : « Premiers pas 6/7 : ta première sauvegarde » (`start.line`), dessous le rappel de sauvegarde s'il est dû, bouton « Sauvegarder » (ou « Continuer » vers le guide) et × (cache le guide ; le rappel de sauvegarde reste seul ensuite, sans ×, comme avant). Ids gardés pour les scripts : `#start-card` (avec le guide), `#backup-reminder` (le texte du rappel). Puis Bonjour, **À faire** (`UpcomingCard` devient une section `#upcoming` sans trait du haut, titre 🔔), **Espaces** (`#spaces`, titre 🪴, les cartes). Le titre « Tous les espaces » et sa phrase disparaissent (`today.allTitle` / `allSub` retirés). Vue d'un espace dans le même ordre : titre avec le carré teinté (`ScreenHero tile`, 52 px), Bonjour de l'espace, À faire de l'espace, puis propagation, réservoir, conseil, étape, Relevés 📈, arrosage 💧.
- **Dessins** : `Label` les dessine seulement avec `mark` (Outils garde ses titres nus) ; sur Aujourd'hui : À faire 🔔, Espaces 🪴, Relevés 📈, Arrosage du jour 💧, Réservoir 🪣, Propagation 🌱, Séchage ✂️, Étape suivante (🌿, 🌙 pour 12/12, ✂️ pour la récolte), Dernière récolte ✂️. Aucun nouveau dessin : tous existaient dans `scripts/gen-emoji.mjs`. Icônes au trait inchangées pour les boutons, la barre d'onglets, Outils, les champs et le conseil du jour.
- Pastilles d'espace des onglets et des listes : inchangées (10 px, rayon 3).
- Scripts : `scripts/e2e-10j.py` (version locale + simulation au 8 février, FR / EN / DE, clair / sombre, 390 et 360 px : ordre, lignes ≥ 44 px avec dessin `alt=""`, valeur seule en orange, 3 cadres de 14 px sur la surface sans cadre dedans, carré 42 px teinté avec dessin 28 px, pilule, titres avec dessin, plus de « Tous les espaces », rien de coupé ni de plus large que l'écran, vue d'un espace : carré, Bonjour avant À faire avant Relevés ; captures « Tous » et Floraison). `e2e-10h.py` : la carte du matin est en lignes. 328 tests (10 nouveaux, `calc/lot10j.test.ts`).

### Commandes (lot 10j)
```bash
npm run build:local
PYTHONPATH=scripts python3 scripts/e2e-10j.py dist-local <dossier de simulation> <dossier> [fr,en,de]
```
(dossier de simulation : `npx -y tsx scripts/sim/build.ts <dossier>`.)

## Lot 10i — notes
- **Dictionnaire** `src/i18n/de.ts` (1 644 clés, mêmes clés et mêmes variables que `fr.ts`) ; le test de parité (`i18n.test.ts`) couvre les trois langues (clés, variables, aucun texte vide). Traduit en quatre parties en parallèle avec un glossaire commun, puis harmonisé : espace = Bereich (pièce = Raum, site = Standort), réservoir = Tank, bidon (mélange) = Ansatz / Ansätze (bidon de concentré = Kanister), saisie = Eintrag (saisie du jour = Tageseintrag), rappel = Erinnerung, échéance = Termin, stades Sämling / Wachstum / Stretch / Masse / Reife / Spülen / Geerntet, Blüte W6 · T39 (S → W, J → T), pilotage = Steuerung, donnée manquante = „fehlende Angabe“, HR = rF, EC / pH runoff = EC Runoff / pH Runoff, EC / pH entrée = EC Zulauf / pH Zulauf, Outils = Werkzeuge, Graphiques = Diagramme, Repères = Richtwerte, Sauvegarde = Backup, Nutrition = Düngung, « Bonjour » = « Guten Morgen ». Guillemets allemands „…“. Noms de produits et de marques intacts (test sur chaque clé : un nom présent en français l'est en allemand).
- **Code** : `Lang` = `"fr" | "en" | "de"`, `LANGS`, `isLang` ; `locales` (de-DE) utilisé partout où il y avait `fr ? "fr-FR" : "en-US"` (barre du haut, bande de la semaine, calendrier, rappels, IPW, concentrés) ; `decimalComma` (FR et DE : saisie, CSV, IPW, assistant) ; `formatDayMonth` « 19.10. », `formatDate` « 19.10.2026 », `formatDayShortMonth` « 19. Okt. » ; pluriel allemand : seul 1 est singulier. `lowerWord` : les noms allemands gardent leur majuscule au milieu d'une phrase (phase du stade dans le résumé, substrat sur Aujourd'hui) ; `prose.stage` = « {cycle} in Phase {stage} ».
- `parseSettings` accepte « de » ; **premier lancement** : rien d'enregistré sur l'appareil et `navigator.languages[0]` en `de…` → allemand (`phoneLang`, dans `readLocal`), sinon français ; une copie des réglages dans la base, plus récente, l'emporte toujours. `index.html` met `lang="de"` avant le premier affichage. Écrans d'erreur (`status.tsx`, `main.tsx`) en allemand aussi.
- Sélecteur de langue : FR / EN / DE (cases jointes, « Français / English / Deutsch » dans le menu et l'assistant). Le nom du premier espace de l'assistant suit la langue choisie sur l'écran d'accueil tant qu'il n'a pas été tapé ; équipement et cycles créés par l'assistant prennent la langue du moment ; rien d'enregistré n'est renommé.
- **Carte du matin** : `digestWeek` écrit `texts` en fr, en et de ; la tâche du matin lit `texts.fr` (inchangé). « Demander à Claude » : « Antworte auf Deutsch (du-Form). ».
- Le Calendrier commençait déjà le lundi ; l'app n'affiche pas de numéro de semaine (pas de « KW » à ajouter). CSV : « ; » et virgule décimale comme en français.
- `scripts/e2e-10i.py` : premier lancement sur un téléphone allemand (assistant en allemand, Français / English / Deutsch), onglets Heute / Journal / Diagramme / Werkzeuge, `lang="de"`, rien de plus large que l'écran ni de libellé coupé à 390 et 360 px (neuf écrans, la saisie, le menu d'affichage), FR / EN / DE dans les Réglages, « 19.10. » et « 3,4 » dans le Journal ; captures DE clair / sombre, 390 et 360 px. 318 tests (5 nouveaux, `calc/lot10i.test.ts`).

## Lot 10h3 — notes
- **Barre d'onglets** (`components/hydro/tab-bar.tsx`) : `nav` fixe en bas, pleine largeur, `bg-background`, trait fin en haut, marges de sécurité ; 64 px (48 px sur les écrans courts). Cinq colonnes : quatre onglets (`TABS` = today, journal, charts, tools ; rôle `tab`, `aria-current="page"`, actif en texte normal et icône eau) et, au milieu, le « + » (52 × 44, rayon 12, eau, ombre intérieure, `aria-label` « Saisie du jour »). `Fab` supprimé (fichier retiré), plus de pastille qui glisse. Le contenu garde 96 px de marge basse. Retoucher l'onglet ouvert remonte en haut (doux, ou direct avec les animations réduites) — pour tous les onglets.
- **Calendrier sans onglet** : `calendar` reste une route (`TAB_IDS`), `#calendar` et `#calendar/AAAA-MM-JJ` (`parseHash` / `routeHash`, champ `day`). `navigate(route, { push: true })` garde l'écran d'origine dessous (`planNav(…, push)`), donc le retour y ramène ; un lien « ‹ Retour » en haut du Calendrier (`goBack` : un pas en arrière, sinon Aujourd'hui). Ouvert sur un jour, le Calendrier montre ce mois et ouvre la feuille du jour.
  - Accès : bande de la semaine, date de la barre du haut (`#today-date`, « lun. 19 oct. » en mono, cachée sous 340 px de large où la bande suffit), « Tout le calendrier → » sous « À faire » (`#all-calendar`), première ligne d'Outils (`#tool-calendar`). Outils devient une liste de lignes (plus de grille de cartes).
- **Bande de la semaine** (`screens/week-strip.tsx`) : lundi → dimanche (`weekdayIndex`), jour en Figtree 12 px (pas 11 : règle des 12 px du lot 10e), numéro en mono 15 px, aujourd'hui souligné eau (`aria-current="date"`), jours passés en gris ; repères 5 px : rappel (`info`), échéance (`warn`, `bad` si en retard), bidon (eau : échéance « bidon à refaire » ou bidon fait ce jour-là), 3 au plus ; suit le sélecteur d'espaces. Flèches (zone de 44 px) et balayage horizontal (> 40 px). Hauteur 48 px environ (≤ 64). `aria-label` par jour : date longue et « N éléments prévus ».
- **« Tous les réglages → »** (`top-bar.tsx`, demande de Thomas ajoutée au prompt) : sous Langue et Thème, un trait fin puis le lien tertiaire (44 px) ; il ferme le menu et ouvre `#tools/settings` en gardant l'écran d'origine (retour = Journal, par exemple).
- **Mouvement** : transition d'écran 0,16 s, aucune avec `prefers-reduced-motion` (`useReducedMotion` de Motion, que la règle CSS ne couvre pas) ; retirés : la pastille d'onglet qui glisse, la ligne « prochain arrosage » qui glisse, le glissement du mois en JavaScript (une animation CSS courte, coupée par la règle des animations réduites). Supprimés car inutilisés : `ArcGauge`, `NumberTicker`, `BlurFade`.
- README : textes d'Aujourd'hui, du Calendrier et de la navigation ; captures refaites par `scripts/readme-shots.py` (données posées dans la base, la note « données sur ce téléphone » de l'aperçu retirée).
- Scripts : `e2e-3.py` et `e2e-10e2.py` ouvrent le Calendrier par « Tout le calendrier → » ou `#calendar` ; `e2e-10e.py` (`go`) aussi ; `e2e-10h.py` vérifie la barre (bas de l'écran, fond, trait, ordre des onglets, « + » 52 × 44 au centre), la bande (7 jours, ≤ 64 px, aujourd'hui souligné, un jour ouvre `#calendar/…` avec sa feuille, le retour revient à Aujourd'hui), la date, « Tout le calendrier », Outils, « Tous les réglages » (retour au Journal), le retour en haut, l'absence de transition en mouvement réduit. Captures FR/EN, clair/sombre, 390 et 360 px, zoom 200 % sur la saisie : `e2e-10h.py`. 313 tests (3 nouveaux).

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
