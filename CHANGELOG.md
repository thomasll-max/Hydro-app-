# Changelog

## Lot 6b — Sauvegarde, import et « Demander à Claude » (18/10/2026)
- Outil **Sauvegarde** (`lib/backup.ts`, `screens/tools/data.tsx`) : export JSON de tout le grow (16 collections, documents tels que stockés ; le résumé du matin n'est pas gardé, il est reconstruit chaque jour), **même format dans les deux versions**. Import avec résumé avant écriture et deux modes : **fusionner** (même identifiant remplacé, le reste gardé) ou **remplacer** (ce qui n'est pas dans le fichier est supprimé, bouton rouge). Fichiers refusés : pas du JSON, pas une sauvegarde Hydro, version plus récente. Journal en **CSV** (séparateur « ; », noms d'espaces). Les photos restent référencées par leur id.
- Outil **Demander à Claude** (`calc/ask.ts`, `lib/sample.ts`, `screens/tools/ask.tsx`, version Claude seulement) : question sur l'espace envoyée avec ce que l'app sait (gamme, stade, cibles et leur source, 7 dernières saisies, dernier bidon, équipement, données manquantes), réponse en direct, questions suggérées, suite de conversation (6 derniers échanges), arrêt. Consigne : ne jamais inventer une dose absente du Handbook, ne jamais mélanger les gammes, citer la source. Caché dans la version locale et tant que la capacité `sample` n'est pas accordée.
- Liens profonds `#ask` et `#data`. La déclaration complète des capacités est notée dans `docs/artifact-capabilities.json`.
- 186 tests (7 nouveaux, dont **export puis import JSON → données identiques**) ; parcours `scripts/e2e-6b.py` (téléchargement réel, restauration « Remplacer », « Demander à Claude » avec une capacité simulée, aucun appel réel).

## Lot 6a — Graphiques (18/10/2026)
- Onglet **Graphiques** (`calc/series.ts`, `screens/charts.tsx`, Recharts 3 via le composant Chart de shadcn) : 17 courbes au choix (dryback, EC entrée et runoff, pH entrée et runoff, Balance des bidons, volume par pot, % de runoff, température, humidité, VPD, PPFD, DLI, hauteur, levée, consommation, réservoir).
- **Un graphique par courbe** (zone cible enregistrée avec chaque saisie, donc juste même si la cible a changé ; événements en repères verticaux) ou **courbes superposées** (chaque courbe à l'échelle de sa propre plage, légende avec la plage, vraies valeurs dans l'infobulle).
- Comparaison jusqu'à **4 espaces** (couleur de l'espace), périodes **7 j, 30 j, cycle**. Choix des courbes, de la vue et de la période gardés sur l'appareil.
- Fluidité : saisies indexées par espace, recherche par dichotomie, au plus 120 points par courbe (jours moyennés par paquets au-delà). Test : 20 espaces × 2 ans (14 600 saisies), toutes les courbes de 4 espaces en moins de 250 ms.
- 179 tests (8 nouveaux) ; parcours `scripts/e2e-6a.py` (saisies de test écrites dans le stockage local).

## Lot 5b — Lumière et Climat (18/10/2026)
- Outil **Lumière** (`calc/light.ts`, `screens/tools/light.tsx`) : PPFD estimé depuis les lampes de l'espace au réglage de gradation saisi (enregistrable dans l'équipement), DLI sur la photopériode, calcul inverse (DLI visé → PPFD nécessaire et gradation estimée), W/m², PPF, hauteur libre (espace − pot − épaisseur de lampe − distance minimale, « donnée manquante » tant que ces champs sont vides). **Schéma de l'espace à l'échelle** (Floraison carré, Colonne 1 : 3) avec lampes dessinées à leur taille quand leurs dimensions sont saisies, grille 3 × 3 et **carte de PPFD mesurée** (moyenne, min, max, uniformité ; la mesure remplace l'estimation pour le DLI), enregistrée sur l'espace (`space.lightMap`). Cibles du stade avec leur source (repère courant, hors Handbook).
- Outil **Climat et air** (`calc/climate.ts`, `screens/tools/climate.tsx`) : VPD feuille (Tetens) depuis la dernière saisie ou les valeurs tapées, cible du stade (repère courant), humidité à viser à cette température, renouvellement d'air depuis l'extracteur de l'espace à la vitesse saisie (enregistrable), repère courant 1 à 3 min, avertissement filtre à charbon. Débit du Cloudline S6 : « donnée manquante » tant qu'il n'est pas saisi.
- Équipement : nouveaux champs longueur / largeur / épaisseur de lampe et hauteur du pot. Lignes de calcul : la liste « manque : … » ne déborde plus.
- Les quatre outils du lot 5 sont ouverts ; plus aucun « Arrive au lot 5 ».
- 171 tests (10 nouveaux, dont le schéma proportionnel) ; parcours `scripts/e2e-5b.py`.

## Lot 5a — pH / Balance et IPW (18/10/2026)
- Outil **pH / Balance** (`calc/balance.ts`, `screens/tools/ph-balance.tsx`) : pH visé du stade avec sa source (page du Handbook), titrage guidé par paliers de 1 mL pour 4 L (100 L → 25 mL), très gros compteur à valeur exacte, relevés de pH après chaque ajout. Prédiction apprise à partir de 2 bidons enregistrés avec leur Balance (par 10 L, ou par point de pH quand le pH avant/après est connu), **départ à 80 %**, puis paliers. Au-dessus de la cible : aucune dose proposée. Enregistrement sur le dernier bidon de l'espace (pH avant, pH après, Balance ajouté).
- Outil **Pulvérisation IPW** (`calc/ipw.ts`, `screens/tools/ipw.tsx`) : prévention 24 mL/L 2 fois par semaine, pression 32 mL/L 3 fois par semaine, restauration 32 mL/L sur 9 jours (2 jours + 1 de pause) ; dose du pulvérisateur (2 L × 24 → 48 mL) ; fenêtre végé et floraison S1–S3, **bloqué dès S4 (donc en S5)**, au rinçage et en semis ; checklist avant pulvérisation ; historique (`sprays`). IPW reste désactivé chez Thomas (pas encore acheté), un bouton permet de l'activer.
- Échéance **IPW** (`deadlines.ts`, kind `ipw`) : prochaine pulvérisation du protocole en cours, jamais après la fin de S3, seulement si IPW est activé.
- 161 tests (10 nouveaux) ; parcours `scripts/e2e-5a.py`.

## Lot 4b — Arrosage (18/10/2026)
- Outil Arrosage : volume des pots, nombre de pots et débit **tirés de l'équipement de l'espace** (`spaceIrrigation` dans `equipment/calc.ts`). Absent → « donnée manquante » (doses en mL et durées masquées, lien vers l'équipement), rien d'inventé. Débit de la pompe de Thomas : toujours à mesurer.
- **Volume du pot modifiable** (demande de Thomas, pas seulement 15 L) : volume et nombre de pots se changent dans l'outil Arrosage et sont enregistrés sur le contenant de l'espace (`withPots` ; « Pots 15 L » devient « Pots 11 L »), ou créent un contenant s'il n'y en a pas. Le programme suit immédiatement.
- Arrosage manuel **par gamme** : `dayTargets(..., { line })` lit les tableaux des catalogues (Pro p. 41, Blended p. 60) ; tableau semaine par semaine dans l'outil, ligne du stade surlignée. pH coco en floraison manuelle 5,9–6,3 (p. 41), Fade 6,0–6,4. EC de solution du Blended = programme p. 58 (jamais le 3,0 de la Pro Line).
- Les cibles du jour (Aujourd'hui, saisie) suivent la gamme de l'espace du cycle.
- 151 tests (10 nouveaux, dont manuel Blended végé → EC du runoff 3,5–4,5) ; parcours `scripts/e2e-4b.py`.

## Lot 4a — Nutrition à catalogue (18/10/2026)
- Catalogues sourcés `src/data/nutrients/` : `athena-pro.ts` (programme p. 31, dosage par EC en poudre et en concentrés 113/226/282 g/L p. 37, arrosage manuel p. 41), `athena-blended.ts` (programme p. 58 semaine par semaine, B avant A, arrosage manuel p. 60), `addons.ts` (Fade, Cleanse et rinçage, Balance par paliers de 1 mL pour 4 L, IPW, CaMg et PK réservés au Blended). Chaque dose porte sa page.
- Moteur générique `src/calc/nutrients.ts` (remplace `calc/nutrition.ts`) : phase du programme d'après le cycle, recette dans l'ordre de mélange avec la source de chaque ligne, plages publiées affichées telles quelles tant que la dose n'est pas choisie, mise à l'échelle Blended marquée « estimation ». **Fade en S8–S9 à la place du Core** (Core conservé si le Fade est désactivé), pH 6,0–6,4.
- Produits perso : écran « Saisir depuis l'étiquette » (dose min/max pour un volume, converti pour 10 L ; semaines en végé et/ou floraison de S… à S… ; texte de l'étiquette ; désactivation). **Proper reste vide tant que Thomas ne l'a pas saisi**, source « étiquette ». Great White reste sur les racines, jamais dans le bidon.
- Assistant concentré (sac entier ÷ concentration, 80 % d'eau, 15–45 min, compléter, Core à part) et stocks `concentrateStocks` : le stock baisse à chaque bidon enregistré ; un nouveau bidon de concentré clôt l'ancien.
- « Enregistrer ce bidon » : un bidon pour plusieurs espaces de la même gamme (jamais Pro + Blended), pH avant, Balance ajouté (mL), pH après, EC mesurée ; le Balance total revient en premier au bidon suivant. Fiche Bidon du Journal : pH avant et Balance ajouté, la recette est conservée à la modification.
- Échéance **concentré presque vide** (`deadlines.ts`, kind `concentrateLow`) : moins de 2 bidons comme le dernier (estimation), datée du bidon qui a fait passer sous le seuil.
- Blended : moteur et tests, menu caché dans la version de Thomas (visible en `VITE_TARGET=local`).
- 141 tests (24 nouveaux) ; parcours Playwright `scripts/e2e-4a.py`.

## Lot 3 — Calendrier (18/10/2026)
- Rappels perso (`reminders/{id}`) : intitulé, espace ou tout le grow, date et heure dans le fuseau du grow (Europe/Oslo pour Thomas), répétition (tous les N jours, jours de la semaine, chaque mois ; fin jamais / après N fois / jusqu'au), alerte, note. « Fait » et « Reporter à demain » agissent sur une seule occurrence. Les heures restent fixes au changement d'heure.
- Échéances automatiques (`src/calendar/deadlines.ts`) : 12/12 prévu, début du Fade (S8, si l'add-on est activé), rinçage (3 derniers jours), récolte prévue, bidon à refaire (autonomie du réservoir), fin de propagation et **Great White sur les racines au transfert** (nouveau champ « Transfert prévu » du cycle), fin de séchage (nouveau champ « Séchage prévu »), **mesurer le débit** de la pompe (jamais mesuré, ou plus de 60 jours). Chaque échéance cite sa source ; leur état (fait, reporté) est stocké dans `reminders/auto_{clé}`.
- Onglet Calendrier : vue mois (points journal / échéances / rappels / en retard, stats du mois), agenda (en retard + 30 jours), fiche du jour (à faire + saisies, bidons, événements), filtres, suit le sélecteur d'espace. Bouton « Rappel » aussi dans « À venir » et dans la saisie du jour (enregistre puis ouvre un rappel).
- Aujourd'hui : « À venir » branché sur le calendrier (vue Tous, vue d'un espace, même sans cycle). Carte Bonjour v2 : rappels et échéances du jour, par espace et pour tout le grow.
- Export .ics (`src/calendar/ics.ts`) : RRULE, VALARM, VTIMEZONE générée depuis les vrais décalages du fuseau, occurrences reportées en RECURRENCE-ID, UID stables (`{id}@hydro.app`, `auto-{clé}@hydro.app`). Version Claude : `hydro.zip` contenant `hydro.ics` (l'artefact n'autorise pas l'extension .ics au téléchargement) + bouton Copier ; version locale : `hydro.ics` direct.
- 117 tests (dont rappel tous les 3 jours × 5 à travers le passage à l'heure d'hiver, .ics relu par ical.js, UID stables, zip vérifié) ; parcours Playwright `scripts/e2e-3.py`.

## Lot 2b — Journal et Aujourd'hui (18/10/2026)
- Saisie quotidienne rattachée à un espace (plante en option) : n'affiche que les modules actifs (climat, propagation — graines, levées, dôme —, arrosage, runoff, nutrition, lumière avec hauteur lampe / canopée, plante), niveau du réservoir si un réservoir est affecté. Possible sans cycle (séchage, réservoir…).
- Saisie rapide multi-espaces (T°, HR, réservoir) depuis « Tous » ou le Journal ; le bouton « Saisie du jour » ouvre la saisie rapide en vue « Tous », la saisie complète sur un espace.
- Journal qui suit le sélecteur d'espace : historique filtrable par espace, plante, stade et tag ; événements et bidons de l'espace.
- Aujourd'hui : vue « Tous » (une carte par espace, groupées par room), vue d'un espace selon son type (culture, propagation, séchage), autonomie du réservoir (niveau saisi ou estimé depuis le bidon, alerte au-delà de 7 jours en drain-to-waste).
- Carte « Bonjour » v1 : `buildDailyDigest(data, date, locale)` pure (climat, arrosage prévu, dernière saisie, réservoir), FR/EN ; la version Claude l'écrit dans `digest/latest`.
- Produits racines (Great White) proposés au transfert et aux événements Rempotage / Transfert, quantité saisie depuis l'étiquette, jamais dans le bidon.
- 102 tests ; parcours Playwright `scripts/e2e-2b.py` (saisie complète en 1,4 s).

## Lot 2a — Données et équipement (18/10/2026)
- Modèle modulable : grow, rooms/sites, espaces (modèle, couleur, ordre, dimensions L × l × H → surface et volume, modules, gamme propre), cycles rattachés à un espace avec transferts historisés (complets ou partiels), groupes, plantes. Duplication d'un espace avec son équipement, archivage.
- Registre central des modules (`climate`, `light`, `irrigation`, `nutrition`, `propagation`, `drying`, `plants`) et modèles Floraison / Végé / Propagation / Mère / Séchage / Personnalisé. Désactiver un module masque ses données sans les effacer.
- Collections à plat (`grow/main`, `spaces/{id}`, `cycles/{id}`, `entries/{date}_{espace}[_{plante}]`, …) ; `reminders`, `concentrateStocks`, `sprays`, `customProducts` déclarés sans écran. Base réservée au propriétaire sur les 17 collections.
- Équipement : inventaire, affectations historisées (une lampe déplacée ne change pas le passé), stock, glisser-déposer entre espaces, duplication, bibliothèque « Mes lampes ». Les champs vides affichent « donnée manquante ».
- `equipment/calc.ts` : PPF, PPFD moyen estimé, W/m², hauteur libre, durée d'une dose, autonomie, renouvellement d'air, CFM → m³/h, g/W.
- Réglages : affichage, grow, gamme, add-ons (Fade, Cleanse, Balance, IPW), méthode de dosage (poudre ou concentré 113/226/282 g/L), espaces, rooms, cycles, transferts.
- Navigation : Aujourd'hui, Journal, Calendrier (« Arrive au lot 3 »), Graphiques, Outils (9 outils, dont pH, IPW, Lumière, Climat « Arrive au lot 5 »). Sélecteur d'espace en haut, mémorisé.
- Repères : tableau Pro en g et en mL de concentré, arrosage manuel avec dryback S1 à 30–40 %.
- Grow de Thomas pré-rempli : Floraison 90×90×180 et Colonne 30×90×180, matériel du cahier des charges, cycle 1 dans la Colonne. EVO4 à 2,8 µmol/J marqué « hypothèse ».
- Add-ons de Thomas : Fade, Cleanse, Balance activés ; IPW désactivé (pas encore acheté) ; pas de CaMg ni de PK (Pro Line). Produits perso déclarés, doses vides tant qu'elles ne sont pas saisies depuis l'étiquette (source « étiquette ») : Proper (Athena, dans le bidon) et Great White (mycorhizes, une fois sur les racines au rempotage / transfert).
- 8 nouvelles illustrations 3D (🌸 🍂 📅 ⏰ 💦 🪣 🌀 🔌). 92 tests.

## Point de sauvegarde — 18/10/2026 (avant le nouveau découpage 2a/2b)
Construit selon l'ancien découpage du cahier des charges.

### Lot 1
- Squelette, 5 onglets, barre en verre dépoli, bouton « Saisie du jour », thèmes clair/sombre/système, FR/EN.
- Design system : tokens de la maquette + getdesign supabase ; shadcn/ui, Magic UI (NumberTicker, BorderBeam, BlurFade), Motion, Lucide, Recharts.
- 22 illustrations Fluent Emoji 3D dans le stockage d'assets.

### « Lot 2 » (ancien découpage)
- Cycle unique, plantes P1–P4, saisie quotidienne préremplie, événements, bidons, récolte, historique filtrable.
- Aujourd'hui sur données réelles : stade, cibles sourcées, une seule correction, programme, rappels.
- Stockage interchangeable : artefact / local (IndexedDB) / mémoire.

### « Lot 3 » (ancien découpage)
- Outil Arrosage (P0–P3, manuel, installation, mode capteur Bonorum) repris du « Plan d'arrosage ».
- Outil Nutrition générique (gamme Athena Pro Line), concentrés 113/226/282 g/L (Handbook p. 37), enregistrement des bidons.

### Correctifs
- Page blanche dans l'app Claude (style de l'hôte), champs illisibles en sombre, plantage à l'ouverture des outils (`scrollTo`).
- Base réservée au propriétaire (règles d'accès).
