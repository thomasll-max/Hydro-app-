# Changelog

## Lot 8e — Numéro de version et bannière de mise à jour (18/10/2026)
- **Version affichée** en bas de Réglages, dans les deux versions : commit court + date et heure du build (`lib/version.ts`, injectés par `vite.config.ts` via `__HYDRO_BUILD__`). Sur Netlify le commit vient de `COMMIT_REF` ; un build fait avec des changements pas encore commités affiche « + » après le commit.
- **Nouvelle version disponible** (version locale) : le build écrit `version.json` à côté de la page ; l'app le relit au retour au premier plan (`visibilitychange`) et toutes les 30 min (pas hors ligne). Si le build en ligne est plus récent, bannière « Nouvelle version disponible — Mettre à jour » qui recharge l'app (après avoir demandé le nouveau service worker). **Jamais de rechargement automatique**, et la bannière se cache tant qu'un formulaire est ouvert (saisie, cycle…).
- `version.json` n'est jamais mis en cache : ignoré par le service worker (cache `hydro-v2`) et `Cache-Control: no-cache, no-store` dans `netlify.toml`. Un `version.json` identique, plus ancien ou abîmé ne propose rien.
- 221 tests (5 nouveaux) ; parcours `scripts/e2e-8e.py` (déploiement simulé : même build, plus ancien, plus récent, formulaire ouvert, mise à jour) ; 8a et 8b repassés.

## Lot 8d — Dryback : méthode de mesure par espace, correctif runoff (18/10/2026)
- **Correctif** : `derive` (`model/entry.ts`) recopiait l'humidité du capteur de sol (`sensorPct`) dans le % de runoff quand aucun runoff n'était saisi. Le repli est supprimé : le % de runoff ne vient que du runoff mesuré. L'ancien test qui validait ce comportement est remplacé.
- **Méthode de mesure du dryback, par espace** (Réglages de l'espace → Arrosage, mémorisée dans `space.irrigation`) : **Pesée** (par défaut, comme avant), **Capteur AC Infinity**, **Autre capteur** (avec son nom), **Aucune**. La saisie du jour n'affiche que les champs de la méthode : poids matin et pic, ou humidité du capteur matin et pic (%).
- **Dryback capteur** = (pic − matin) ÷ pic (même formule que la fiche Athena), stocké à part (`drybackSensor`) avec la méthode (`drybackMethod`, `sensorName`). Le champ `dryback` reste celui de la pesée.
- Les **cibles Athena ne jugent que la pesée** : pour un capteur, pas de pastille verte / orange / rouge ni de correction, la mention « échelle capteur, à comparer entre tes propres journées (guide Bonorum) », une jauge neutre sur Aujourd'hui et une **courbe séparée** « Dryback capteur (échelle capteur) » dans les graphiques, sans zone cible. Journal, calendrier, cartes d'espace, CSV et « Demander à Claude » affichent le dryback capteur à part.
- L'ancien champ « Capteur de sol (%) » n'est plus proposé ; une valeur déjà saisie reste visible (« ancien relevé »).
- 216 tests (5 nouveaux + correctif) ; parcours `scripts/e2e-8d.py` (pesée → AC Infinity → autre capteur nommé → aucune → pesée) ; 2b, 4b, 5a, 6a et 8c repassés.

## Lot 8c — Premiers pas (18/10/2026)
- **Guide de démarrage « Premiers pas »** (demande de Thomas ; `calc/getting-started.ts`, `screens/tools/start.tsx`, deux versions) : **ce qu'il faut rentrer**, coché d'après les données (lampe : PPF, ou watts réels et efficacité, comme l'estimation du PPFD ; pots de chaque espace arrosé ; cycle avec date de germination ou de 12/12 ; débit de la pompe si arrosage automatique ; premier bidon ; première saisie ; première sauvegarde dans la version locale). Une ligne n'apparaît que si elle s'applique ; chaque ligne ouvre le bon endroit (Équipement, fiche de l'espace à l'Arrosage, cycle, Nutrition, saisie, Sauvegarde). Puis **comment ça marche** en 9 rubriques (journée type, bidon, arrosage, cycle, calendrier, graphiques, réglages, origine des chiffres, sauvegarde).
- Carte **« Premiers pas · n / total »** sur Aujourd'hui avec la prochaine chose à rentrer, masquable (et à remettre depuis le guide). L'assistant de la version locale se termine sur le guide.
- Version locale : un nouveau cycle ne reprend plus les valeurs du grow de Thomas (Cherry Limeade, 4 pots de 15 L, lampes) ; les pots viennent de l'équipement de l'espace, sinon ils sont à saisir.
- Libellés de semis génériques (« Semis » au lieu de « Semis · colonne »).
- 211 tests (6 nouveaux) ; parcours `scripts/e2e-8c.py` (version locale et version Claude) ; 8a, 8b, 2b et 3 repassés.

## Lot 8b — Assistant de premier lancement et guides (18/10/2026)
- **Assistant de premier lancement** (version locale ; `lib/onboarding.ts`, `screens/onboarding.tsx`) : accueil (langue, « Commencer », « Passer l'assistant »), puis 7 étapes dans l'ordre du cahier des charges : nom du grow → espaces (modèle, dimensions L × l × H facultatives, **dupliquer avec l'équipement**, ajouter, retirer) → équipement rapide et facultatif (lampe, pots, réservoir, extracteur : un champ vide ne crée rien, rien n'est supposé) → modules → gamme, add-ons et méthode (Pro Line ou Blended, jamais mélangées ; aucun add-on coché au départ) → premier cycle facultatif (pots repris de l'équipement, obligatoires pour créer le cycle) → heure du résumé, récapitulatif, conseil d'installation. Tout est écrit à la fin, le grow en dernier ; le brouillon survit à un rechargement.
- **Importer une sauvegarde dès l'accueil** de l'assistant (fichier ou texte collé) : tout est repris, l'assistant se ferme.
- La version locale ne crée plus un « Mon grow » vide au premier lancement : l'assistant s'affiche (aussi après « Réinitialiser l'app »). La version Claude est inchangée (grow de départ de Thomas).
- **Installer Hydro** (iPhone / Android) : carte dans l'assistant et dans Réglages (version locale), cachée quand l'app est déjà installée.
- Rappel de sauvegarde : pas le jour même de la création du grow (sauf saisie déjà faite). Note de gamme juste quand les deux gammes sont proposées. `netlify.toml` : pas de cache aussi pour `/` et le manifeste.
- Guides : `docs/guide-amis.md` (installer, assistant, sauvegarde, changer de téléphone, réinitialiser) et `docs/guide-netlify.md` (relier Netlify à GitHub, pour Thomas).
- 205 tests (12 nouveaux) ; parcours `scripts/e2e-8b.py` (assistant complet en sombre et en clair, rechargement en cours de route, réinitialiser → coller une sauvegarde, passer l'assistant) ; `e2e-8a.py` adapté (le collage après réinitialisation passe par l'assistant) ; 2b, 3, 4b et 6b repassés sur la version Claude.

## Lot 8a — Version locale, réinitialiser, transfert entre apps (18/10/2026)
- **Version locale (amis)** : `npm run build:local` → `dist-local/` (Netlify : `netlify.toml`). Polices embarquées (plus de Google Fonts), icônes 3D incluses dans la page, **installable** (manifeste, icônes générées depuis 🪴, `apple-touch-icon`) et **hors ligne** (service worker « réseau d'abord, cache sinon » : les mises à jour arrivent dès qu'on est connecté). Stockage IndexedDB marqué persistant (`navigator.storage.persist()`). La version Claude est inchangée.
- **Réinitialiser l'app** (demande de Thomas) : Réglages → « Réinitialiser… », confirmation avec lien « Exporter une sauvegarde d'abord ». Efface toutes les collections (le grow en dernier) et les photos locales ; langue et thème gardés. Version Claude : l'app repart avec le grow de départ de Thomas ; version locale : de zéro.
- **D'une app à l'autre** (demande de Thomas) : dans Sauvegarde, « Envoyer… » (feuille de partage du téléphone, quand elle existe), « Copier la sauvegarde » et « Coller une sauvegarde » (même résumé et même confirmation que l'import de fichier). Fonctionne entre la version Claude et la version locale, ou entre deux téléphones. Les photos ne suivent pas.
- **Rappel de sauvegarde** (version locale) sur Aujourd'hui : jamais sauvegardé, ou plus de 7 jours.
- 193 tests (4 nouveaux) ; parcours `scripts/e2e-8a.py` sur la version locale servie en HTTP (service worker, rechargement hors ligne, copier → réinitialiser → coller).

## Lot 9 — Tâche du matin et passe de finition (18/10/2026)
- **Tâche du matin** : l'app (version Claude) prépare le résumé du jour et des 6 jours suivants (`digest/latest` et `digest/AAAA-MM-JJ`, en français et en anglais ; les anciens sont supprimés après 7 jours), donc le résumé existe même si l'app n'a pas été ouverte le matin. Une **tâche programmée** « Hydro — résumé du matin » le lit chaque jour à 06:51 (Europe/Oslo) et l'envoie en notification ; si le résumé a été calculé un autre jour, une ligne le précise. Testée une fois (lecture réussie en 8 s). `morningText`, `digestWeek`, `digestDocs` dans `calc/digest.ts`.
- **Réglages par espace** (demande de Thomas : trop de boutons dans les outils) : la fiche de l'espace (Réglages → l'espace) regroupe Général, Nutrition (y compris les réglages du grow quand l'espace les suit), **Arrosage** (mode, substrat, allumage, pots, doses, P0, racines pas encore aux bords ; débit affiché depuis l'Équipement), **Lumière** (photopériode, gradation de chaque lampe) et **Air** (vitesse de l'extracteur). Les outils n'affichent plus que les résultats et les actions du jour, avec un résumé des réglages et un bouton « Réglages » qui ouvre la fiche sur la bonne section (« Tous les réglages de l'espace » pour le reste). IPW s'active depuis la même fiche.
- Arrosage : le tableau d'arrosage manuel de la gamme est toujours visible (référence) ; les relevés du capteur s'enregistrent avec leur propre bouton.
- **Barre du haut** (demande de Thomas) : FR/EN et clair/système/sombre regroupés derrière une petite pastille à roue crantée (`DisplayMenu`, Radix Popover) qui montre la langue et le thème en cours ; le menu affiche « Français / English » et « Clair / Système / Sombre ». Toujours disponibles aussi dans Réglages.
- Finition : sélecteurs à libellés longs qui passent à la ligne (plus de chevauchement en anglais), texte « Heure du résumé » à jour, **build minifié** (3,0 Mo → 1,4 Mo ; `HYDRO_DEBUG=1` pour un build lisible), sélecteur ambigu du parcours 2b corrigé.
- 189 tests (3 nouveaux) ; tous les parcours Playwright repassés (2b, 3, 4a, 4b, 5a, 5b, 6a, 6b).

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
