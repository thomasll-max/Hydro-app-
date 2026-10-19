# Prompt lot 10k : interface « calme » (Aujourd'hui, Outils, Journal, Graphiques)

À lancer dans Claude Code après les lots 10j et 7 (cochés), une seule session à la fois, **avant les lots 11 et 12**. Découpé d'avance en 10k1 → 10k4, un commit par sous-lot. Si un sous-lot est trop gros, le recouper.

Planches validées écran par écran par Thomas le 19/10/2026 :
- **Aujourd'hui, version calme** : https://claude.ai/artifact/8J98dQ5X7hpyk9FoDbSkyV
- **Les menus, un par un** (Outils, Journal, page d'une semaine, Graphiques) : https://claude.ai/artifact/T2JmTqXVjvWPVhgSjdwuCC

La page d'un espace et la saisie du jour sont encore en cours de validation : elles feront le lot 10l. **Ne pas les refaire ici**, sauf ce qui est dit au point 10k1.6.

Constat de Thomas après 10j : « toujours un effet plein d'infos éparpillées, ça donne mal à la tête, difficile de savoir où poser le regard ». Causes identifiées :
- la même information affichée deux ou trois fois (résumé « Bonjour », cartes d'espace, À faire) ;
- toutes les sections ont le même poids, aucun point d'entrée ;
- trop de petits dessins (4 niveaux depuis 10j).

## Règles « calme » pour toute l'app (à noter dans l'état du build)

1. **Un point d'entrée par écran.** Un seul cadre mis en avant et un seul bouton plein.
2. **Chaque chiffre une seule fois par écran.**
3. **Petits dessins 3D** seulement sur : les espaces (carré teinté), le bloc « Maintenant », le bandeau Premiers pas. **Retirer** ceux des titres de section, des lignes de résumé et des libellés de relevés (ajoutés en 10j). Icônes au trait pour les outils, boutons et onglets.
4. **Trois tailles de texte** par écran (titre Fraunces, texte, petit/mono). Plus d'espace entre les sections (≈ 30–36 px), presque plus de traits.
5. **Pas de jargon dans les listes** : le jargon reste à l'intérieur des outils, avec le glossaire.
6. **Lignes de graphique honnêtes** : segments droits, pas de lissage qui invente des creux.

---

## 10k1 : Aujourd'hui (planche « Aujourd'hui, version calme »)

0. `git pull`, `npm ci`, `npm test`. Ajoute « [ ] Lot 10k » et ses sous-lots dans l'état du build, et les règles ci-dessus dans les décisions.
1. **Bandeau Premiers pas** (choix de Thomas : « comme le tuto d'un jeu vidéo ») : fin, tout en haut sous les onglets, **fermable** (×). Dessin 🌱, « Premiers pas · 6/7 », l'étape suivante en une ligne, une barre de progression (couleur « plante »), un bouton secondaire « Y aller ». Il disparaît quand le guide est fini ou fermé. La sauvegarde n'est plus un bloc à part : c'est l'étape du guide quand elle est la suivante, et sinon un rappel normal dans À faire si aucune sauvegarde depuis 7 jours.
2. « **Bonjour Thomas.** » devient le titre de l'écran (Fraunces). Le résumé en lignes de 10j **disparaît** : son contenu est réparti dans les blocs suivants.
3. **Bloc « Maintenant »** : le seul cadre de l'écran, le seul bouton plein. Petit sur-titre mono « MAINTENANT » (couleur « eau »), dessin, une phrase en Fraunces, une ligne de contexte, le bouton, puis « Ensuite : … » en une ligne. Choix de la chose à afficher, dans cet ordre de priorité (calcul pur, testé) :
   1. une alerte du jour (valeur hors cible de la dernière saisie, avec la correction déjà calculée par l'app) ;
   2. la saisie du jour pas encore faite (après l'heure d'allumage) ;
   3. une échéance aujourd'hui (bidon, 12/12, Fade, rinçage, récolte, séchage) ;
   4. sinon « Tout est à jour », avec la prochaine échéance.
   En vue « Tous », l'espace concerné est nommé. Rien d'inventé : uniquement des informations que l'app calcule déjà.
4. **À faire** : 3 tâches au maximum, triées par date, puis « + N autres · Tout le calendrier → ». Lignes simples : case, titre, date en mono à droite. L'espace en sous-ligne seulement en vue « Tous ».
5. **Espaces** : une ligne par espace (64 px) : carré teinté avec le dessin du stade, nom, stade en petit (« Végé S6 · J41 »), à droite **un seul état** (point coloré + quelques mots : « bidon ≈ 2 j », « 19° · 61 % », « dans la cible », « pas de cycle »), chevron. Toucher la ligne ouvre l'espace (onglet de l'espace). Les cartes à 4 relevés de 10j **disparaissent** d'Aujourd'hui.
6. **Bande de la semaine** : retirée d'Aujourd'hui (décision de Thomas). Le calendrier reste accessible par la date de la barre du haut et « Tout le calendrier → ». Quand un espace est choisi, la page de l'espace garde provisoirement son contenu actuel, sans le résumé « Bonjour » en double (le reste sera revu en 10l).

## 10k2 : Outils (planche « Les menus », section Outils)

1. Trois groupes avec un petit titre mono en capitales :
   - **Chaque jour** : Nutrition (« La recette du bidon »), Arrosage (« Doses et horaires du jour »), pH (« Combien de Balance verser »), Calendrier (« Rappels et échéances ») ;
   - **Régler la pièce** : Lumière (« Intensité et hauteur de lampe »), Climat (« Température, humidité, VPD »), Pulvérisation (« IPW Athena ou ton propre mélange ») ;
   - **Mon installation** : Équipement (« Lampes, réservoirs, pompes »), Repères Athena (« Les tableaux du Handbook »), Sauvegarde (« Exporter, importer »).
2. **Réglages et Premiers pas sortent d'Outils** (ils sont dans l'engrenage du haut et le bandeau). Leurs routes (`#tools/settings`, `#tools/start`) restent valides. Une ligne discrète en bas : « Premiers pas et Réglages : dans l'engrenage en haut. » La phrase « Calculs testés… » disparaît.
3. Icônes au trait colorées par sujet : « eau » pour Nutrition, Arrosage, pH ; « plante » pour Lumière, Climat, Pulvérisation ; neutres pour le reste. Lignes de 54 px.
4. **Pulvérisation générique** (demande de Thomas) : l'outil IPW devient « Pulvérisation ». Dedans, deux choix :
   - **IPW Athena** : le protocole actuel, sourcé, inchangé ;
   - **Mon mélange** : un spray maison ou un stack décrit par l'utilisateur (nom, produits et doses par litre tels qu'il les saisit, fréquence, notes), marqué « perso, non vérifié ». Réutiliser les produits perso existants si possible. **Aucune dose proposée par l'app.**
   - Les rappels et la checklist fonctionnent pour les deux. Les données IPW existantes ne changent pas d'identifiant.

## 10k3 : Journal et page d'une semaine (planche « Les menus », sections Journal)

1. **Ajouter** : les trois gros boutons du haut disparaissent. Le « + » de la barre d'onglets ouvre une petite feuille : Saisie du jour, Saisie rapide (tous les espaces), Nouveau bidon, Événement.
2. En haut : le titre, puis une ligne : choix du **cycle** (Cycle 2, Cycle 1…), la **loupe** (recherche dans les notes, observations, actions), l'icône des **filtres** (feuille existante de 10j2). Le Journal suit l'onglet d'espace.
3. **Une carte par semaine du cycle** (« Végé S6 », « Floraison S3 », semaines du calendrier du cycle), repliée sauf la semaine en cours. En-tête : nom de la semaine, dates en mono, chevron. Résumé en une ligne mono : nombre de saisies, plages réelles des valeurs clés, nombre de jours hors cible, incidents, bidons, événements. En vue « Tous » : une carte par semaine **et par espace**.
4. **Semaine ouverte** : seuls les jours qui comptent ont leur ligne (incident ou observation, note, action, bidon, événement, valeur hors cible). Une valeur hors cible s'affiche en « à surveiller ». Les autres jours tiennent en « + N jours sans souci » (dépliable). Dernière ligne : « Voir la semaine → ». **Bidons et événements apparaissent dans la frise à leur date** : les tiroirs « Événements · Bidons · Récolte » du bas disparaissent (la récolte reste dans le cycle et sera reprise par le bilan du lot 12).
5. **Page d'une semaine** (ouverte en touchant la semaine ouverte ou « Voir la semaine → ») :
   - en-tête : retour « ‹ Journal », espace et cycle, titre « Végé S6 », dates et nombre de saisies, « comparée à S5 » ;
   - **verdict** en une ou deux phrases calculées : « Bonne direction » (couleur « plante ») si toutes les valeurs clés sont dans la cible ou s'en rapprochent par rapport à la semaine d'avant, sinon « À surveiller » (couleur « à surveiller ») ; puis ce qui est hors cible avec la date, et ce qui a bougé (« Le VPD est revenu dans la cible (1,42 la semaine dernière) »). Uniquement à partir des cibles enregistrées dans les saisies (`TargetsSnapshot`), jamais d'avis inventé ;
   - **une ligne par valeur clé** (selon le stade et les modules de l'espace : dryback (pesée, ou capteur séparé sans cible Athena), runoff %, EC runoff, pH runoff, VPD ; en séchage : T°, HR, VPD) : libellé et cible, mini-courbe des 7 jours sur la bande de cible (points hors cible en « à surveiller »), moyenne de la semaine, valeur de la semaine d'avant avec flèche, nombre de jours dans la cible (« 5/5 j ») ;
   - **une carte par jour** : jour et date, climat ou action/alerte en tête, 4 valeurs en grille (hors cible en « à surveiller »). Toucher une carte ouvre la saisie de ce jour pour la corriger.
   - Calculs purs et testés : moyennes, jours dans la cible, sens « se rapproche de la cible », semaine précédente absente (« première semaine »), jours sans saisie.
6. Performance : vérifier avec la simulation d'un an (189 saisies et plus) que le Journal s'ouvre vite (semaines calculées une fois, pages ouvertes à la demande).

## 10k4 : Graphiques (planche « Les menus », section Graphiques)

1. **Vues toutes prêtes** en onglets texte sous le titre, à la place des 17 pilules :
   - Arrosage : dryback (et dryback capteur s'il y en a), runoff %, EC runoff ;
   - Solution : EC entrée, pH entrée, pH runoff, Balance ;
   - Climat : T°, HR, VPD ;
   - Lumière : PPFD, DLI ;
   - Plante : hauteur, levée.
   Une vue sans aucune donnée pour l'espace est masquée. « Choisir mes courbes » (lien en bas) ouvre la liste complète actuelle dans une feuille ; ce choix devient une vue « Perso ».
2. Période en une ligne : 7 j · 30 j · Cycle · Tout. À droite « Comparer… » : feuille pour superposer jusqu'à 4 espaces (fonction existante). L'espace suit l'onglet du haut.
3. Chaque graphique : en-tête avec nom, cible et unité à gauche, **dernière valeur en grand** (mono) à droite. Bande de cible du jour derrière, points hors cible en « à surveiller », bidons en trait vertical pointillé, couleur de la courbe = couleur de l'espace.
4. **Segments droits** entre les mesures (plus de courbe lissée). **Un jour sans mesure est relié en pointillé** ; la ligne ne s'interrompt qu'après plus de 7 jours sans mesure (règle actuelle).
5. Légende en une ligne : « ● hors cible · ▬ cible du jour · ┊ nouveau bidon · - - jour sans mesure ». Les phrases d'explication et la liste d'événements sous les graphiques disparaissent (les événements sont dans le Journal).

## Fin de chaque sous-lot (règles de `CLAUDE.md`)

- Tests verts, simulation d'un an sans plantage.
- Captures FR/EN/DE, clair et sombre, 390 et 360 px, à comparer avec les planches.
- README, CHANGELOG et état du build dans le même commit.
- Push sur `main` **sans** `[deploy]`.
- Republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
