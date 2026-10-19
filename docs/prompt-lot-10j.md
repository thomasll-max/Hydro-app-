# Prompt lot 10j : clarté (petits dessins, cadres par espace, résumé en lignes)

À lancer dans Claude Code après 10h et 10i (cochés), une seule session à la fois, **avant le lot 7**. Si le lot est trop gros, le couper en 10j1 (Aujourd'hui) et 10j2 (autres écrans).

Planche de référence validée par Thomas : https://claude.ai/artifact/LL3N2GPDqUm5grTnmvJziR (« Aujourd'hui, avant et après »).

Constat de Thomas après 10h : « on a perdu fort en clarté ». Le lot 10h a retiré **en même temps** les petits dessins (repères pour l'œil) et les cadres (on a appliqué « plus de cartes » au lieu de « pas de cartes dans des cartes »). Tout a le même poids, la page est un long mur. On garde tout ce qui marche du 10h : palette, Fraunces / Figtree / mono, barre d'onglets ancrée avec « + », bande de la semaine, Journal en lignes, écran Outils, boutons.

---

0. Vérifie que 10h et 10i sont cochés. `git pull`, `npm ci`, `npm test`. Ajoute « [ ] Lot 10j » dans l'état du build et note le constat ci-dessus dans les décisions.

1. **Les petits dessins reviennent (Fluent Emoji 3D, `Emoji` de `src/components/hydro/emoji.tsx`)**, comme repères et non en décor :
   - devant chaque ligne du résumé du matin (stade 🌿/🌸/🌱 selon le stade, arrosage 💧, réservoir 🪣, climat 🌡️, espace vide 🪴) ;
   - sur chaque titre de section d'Aujourd'hui (À faire 🔔, Espaces 🪴) et des écrans principaux quand ça aide (Journal, Graphiques) ;
   - un par espace, selon son stade ou son type : semis 🌱, végé 🌿, floraison 🌸, séchage ✂️, vide 🪴 ;
   - devant les libellés des relevés dans les cartes d'espace, en petit (15 px) : dryback 💦, EC 🧪, T°/HR 🌡️, VPD 💧, bidon 🪣.
   - Les **icônes au trait** restent pour les boutons, la barre d'onglets, les listes d'Outils et les champs.
   - Les dessins sont décoratifs : `alt=""`, le texte porte toujours le sens. Tailles : 22–26 px en ligne, 28 px dans un carré d'espace.
   - Ajouter à `scripts/gen-emoji.mjs` les dessins manquants s'il en faut (même source, même procédure, artefact compris) ; ne pas changer les identifiants existants.

2. **Un cadre par espace** sur Aujourd'hui : chaque espace redevient une carte (fond « surface », trait 1 px, rayon 14), **un seul niveau**, sans carte dedans.
   - En tête : un carré de 42 px, rayon 11, teinté de la couleur de l'espace (≈ 22 % via `color-mix`), avec le dessin du stade au centre ; puis le nom en Fraunces 20 et la ligne « Cycle 2 · Végé S6 · J41 » ; à droite la pilule d'état.
   - Relevés en grille 2 × 2 (barre de cible du 10h gardée quand une cible existe).
   - Pied : « Dernière saisie · 07/02 » et l'âge du bidon.
   - Pas de liseré de couleur sur le côté de la carte.

3. **Résumé du matin en lignes courtes** (remplace le paragraphe du 10h2) :
   - « Bonjour Thomas. » en Fraunces droit, puis une petite ligne « 3 espaces · dernière saisie hier ».
   - Une ligne par idée, 44 px minimum, trait fin entre les lignes : dessin, texte court, et à droite la valeur en mono (« 12/12 dans 2 j », « 2,3 L/pot », « ≈ 2 j », « VPD 0,96 »).
   - Ce qui demande l'attention : seule la valeur passe en « à surveiller » ou « alerte ».
   - Mêmes informations qu'aujourd'hui, rien d'ajouté ni d'inventé. Un espace vide = une ligne discrète. Plusieurs espaces : regrouper par espace, avec le petit carré de couleur.
   - Le texte envoyé par la tâche du matin ne change pas.

4. **Ordre d'Aujourd'hui** : barre du haut, onglets d'espace, bande de la semaine, puis :
   1. une seule **ligne fine** pour Premiers pas + sauvegarde (« Premiers pas 6/7 : ta première sauvegarde » + bouton « Sauvegarder » + ×), au lieu de deux blocs ;
   2. Bonjour (résumé en lignes) ;
   3. À faire ;
   4. Espaces (les cartes).
   Le titre « Tous les espaces » et sa phrase disparaissent de la vue « Tous » (l'onglet actif le dit déjà).

5. **Pilules** : gardées là où elles disent un **état** (stade « Végé », « Floraison », « Séchage », « Vide », âge du bidon). Dans le Journal, les 4 rangées de filtres (Espace, Plante, Stade, Tag) se replient derrière un bouton « Filtres » qui ouvre une feuille ; les filtres actifs s'affichent en une ligne résumée (« Floraison · Végé ») avec « Effacer ».

6. **Pastilles d'espace** dans les onglets et les listes : 10 px, rayon 3 (comme 10h), mais le carré teinté du point 2 sert de repère principal sur Aujourd'hui.

7. Vérifier les autres écrans avec le même principe (une section = un titre avec son dessin, un cadre seulement pour un objet à part), sans tout refaire : Journal (en-tête), Graphiques (titres de graphique), Réglages (groupes). Outils ne change pas.

8. **Fin de lot** (règles de `CLAUDE.md`) :
   - tests verts, simulation d'un an sans plantage ;
   - captures FR/EN/DE, clair et sombre, 390 et 360 px, de la vue « Tous » et d'un espace, à comparer avec la planche ;
   - README, CHANGELOG et état du build dans le même commit ;
   - push sur `main` **sans** `[deploy]` ;
   - republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
