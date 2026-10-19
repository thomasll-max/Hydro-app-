# Prompt lot 12 : bilans de récolte, galerie, variétés, photo pour Claude, verrou

À lancer dans Claude Code **après les lots 10j, 7 et 11** (cochés), une seule session à la fois. Découpé d'avance en 12a → 12d, un commit par sous-lot. Si un sous-lot est trop gros, le recouper.

Origine : comparaison avec Grow with Jane, GrowDiaries, GrowBuddy, StrainTrakker, AROYA GO et l'app AC Infinity (19/10/2026). Thomas a retenu cinq idées. Le reste (communauté publique, abonnés, concours, badges, alertes météo, suivi réglementaire, capteurs AROYA) **n'est pas repris**.

Principe d'intégration : **rien de nouveau à saisir si la donnée existe déjà**. Ces écrans relisent ce que l'app a déjà (cycles, saisies, bidons, récolte, photos, événements). La seule nouvelle saisie : le poids sec par plante (facultatif) et les étiquettes de photo.

---

## 12a : bilan de récolte et comparaison de cycles

1. `git pull`, `npm ci`, `npm test`. Ajoute « [ ] Lot 12a » à « [ ] Lot 12d » dans l'état du build.
2. **Bilan d'un cycle**, ouvert depuis un cycle récolté (Journal → Récolte, et Réglages → cycles archivés). Une page en sections avec dessins (style 10j) :
   - **Résultat** : poids sec (g), poids humide, g par watt (poids sec ÷ watts de `Harvest`, ou de l'équipement lumière du cycle s'il est connu), g par plante, g par m² si la surface de l'espace est connue. Une valeur sans donnée affiche « donnée manquante », jamais d'estimation.
   - **Calendrier** : dates de germination, végé, 12/12, récolte, durée de chaque étape, semaines de floraison réelles contre prévues, jours de séchage.
   - **Conduite** : moyennes et plages réelles **par étape**, calculées sur les saisies : EC entrée et runoff, pH, dryback (pesée et capteur séparés, jamais mélangés), runoff %, T°, HR, VPD, PPFD et DLI. Pour chaque valeur : le nombre de saisies et la part des jours dans la cible du jour (`TargetsSnapshot`).
   - **Bidons** : nombre, litres totaux, produits consommés (somme des bidons enregistrés).
   - **Incidents** : observations et actions du Journal, par semaine (étiquettes existantes).
   - **Dégustation et notes** : `Harvest.tasting`, `dryingNotes`, et une note libre de bilan.
3. **Poids sec par plante** (facultatif) : un champ par plante dans la saisie de récolte. La somme ne remplace jamais `dryG` si celui-ci a été saisi ; un écart s'affiche tel quel.
4. **Comparer deux cycles** : bouton « Comparer avec… » sur un bilan. Deux colonnes, mêmes lignes, l'écart en mono. On peut filtrer les cycles proposés par variété ou par espace.
5. Export du bilan : CSV (séparateur `;`, virgule décimale en FR et DE) et une version imprimable en HTML simple, sans PDF à générer.
6. Tests : chaque calcul de moyenne et de part dans la cible, le g/W et le g/m² avec données manquantes, la séparation pesée/capteur, et un cycle de la simulation d'un an (`scripts/sim`).

## 12b : galerie photo et frise

1. **Galerie** : nouvelle entrée en haut du Journal (« Photos »), et un raccourci depuis le bilan et la fiche variété.
   - Grille de vignettes, regroupées par semaine du cycle (« Floraison S3 »), avec la date en mono.
   - Filtres : espace, cycle, plante, **étiquette**.
   - Toucher une photo : plein écran, balayage gauche-droite, la saisie du jour en dessous (valeurs clés et note).
2. **Étiquettes de photo** : les étiquettes d'observation existantes (`ObsTag`), plus des étiquettes libres enregistrées et proposées ensuite (« stretch », « trichomes », « racines »…). Ajoutées à la prise de photo ou depuis la galerie.
3. **Frise semaine par semaine** : pour une plante ou un cycle, une photo par semaine (la plus récente de la semaine, ou celle choisie avec « Photo de la semaine »), affichées l'une après l'autre avec un curseur. C'est le « time-lapse » de Thomas, sans montage vidéo.
4. Stockage : réutiliser le stockage de photos existant (assets de l'artefact, IndexedDB en local). Aucun identifiant renommé. Vérifier la taille et la vitesse avec 300 photos ; miniatures générées une fois et gardées.
5. Avertissement si une photo référencée est introuvable (sauvegarde partielle), au lieu d'une case vide.

## 12c : fiche variété et photo pour Claude

1. **Fiche variété**, ouverte depuis le nom d'une variété partout dans l'app (cycle, plante, bilan) et depuis Outils → « Variétés » :
   - tes notes libres sur la variété (phénotypes, comportement, odeur, stretch) ;
   - tous les cycles où elle a poussé, avec pour chacun le poids sec par plante, la durée de floraison réelle et le lien vers le bilan ;
   - la frise photo de ses plantes (12b).
   - Pas de base de données publique ni de valeurs de breeder : seulement ce que Thomas a vécu. S'il veut garder une info du breeder, c'est une note avec sa source.
   - Les variétés sont les chaînes `cultivars` / `Plant.cultivar` existantes : regrouper sans tenir compte des majuscules ni des espaces, et proposer de fusionner deux orthographes (« Blue Zushi » / « blue zushi »). Pas de renommage silencieux.
2. **Photo dans « Demander à Claude »** (version claude.ai seulement) :
   - un bouton « Ajouter une photo » dans la conversation, ou « Demander à Claude » depuis une photo de la galerie ;
   - la photo part avec les données du jour de l'espace (comme `ask.ts` aujourd'hui) ;
   - consigne à Claude : décrire ce qu'il voit, relier aux mesures, proposer des pistes, **jamais de diagnostic présenté comme certain**, et dire quand la photo ne suffit pas ;
   - **vérifier d'abord** que le mécanisme utilisé par `ask.ts` accepte une image. Si une capacité supplémentaire est nécessaire, **ne pas redéclarer les capacités de l'artefact** : le noter dans l'état du build et demander l'accord de Thomas. En attendant, livrer le reste de 12c.
   - Version locale (Netlify) : pas d'IA. Le bouton n'apparaît pas.

## 12d : verrou

1. Réglage « Verrouiller l'app » : un **code PIN à 4–6 chiffres**, demandé à l'ouverture et après X minutes en arrière-plan (1, 5, 15 ; défaut 5).
2. Le PIN n'est jamais stocké en clair (dérivation avec sel, Web Crypto). Cinq erreurs : attente de 30 s, puis qui double.
3. **Être honnête dans l'interface** : c'est un écran de confidentialité, pas un chiffrement. Les données restent lisibles par quelqu'un qui a accès au téléphone déverrouillé et aux outils du navigateur. Une ligne le dit dans le réglage.
4. Version locale installée : proposer en plus l'empreinte ou le visage via WebAuthn si le navigateur le permet ; sinon PIN seul. Dans l'artefact claude.ai : PIN seul.
5. PIN oublié : la seule issue est « Réinitialiser l'app » (déjà existant), qui efface tout. À la création du PIN, l'écrire clairement et proposer de faire une sauvegarde tout de suite.
6. La tâche du matin et les notifications ne montrent rien de plus qu'avant quand l'app est verrouillée.

## Fin de chaque sous-lot (règles de `CLAUDE.md`)

- Tests verts, simulation d'un an sans plantage.
- Captures FR/EN/DE, clair et sombre, 390 et 360 px des nouveaux écrans.
- README, CHANGELOG et état du build dans le même commit.
- Push sur `main` **sans** `[deploy]`.
- Republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
