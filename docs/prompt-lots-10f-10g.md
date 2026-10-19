# Prompts lots 10f et 10g : identité « hydro. »

À lancer **après** la passe 10 (lots 10a → 10e cochés, 10e3 compris), une seule session à la fois. 10f d'abord, puis 10g. La planche de référence est sur claude.ai : https://claude.ai/artifact/KXiZWWzBwM65pYwCSGqC4Z (planche « identité finale »).

---

## Lot 10f : police, logo, icône, direction visuelle

Nouvelle identité visuelle de l'app. Le nom reste **Hydro** ; le logo s'écrit « hydro. ». Travaille en autonomie. Si le lot est trop gros, coupe-le en 10f1 (police, logo, icône) et 10f2 (direction visuelle, point 5).

0. Vérifie dans `docs/etat-du-build.md` que les lots 10a à 10e sont cochés. Sinon, arrête-toi et préviens Thomas.
   - Lance `git pull`, `npm ci` puis `npm test`.
   - Ajoute dans l'état du build les lignes « [ ] Lot 10f : identité hydro. » et « [ ] Lot 10g : motif goutte et écran de démarrage ».

1. Police (direction « Serre », validée par Thomas)
   - **Fraunces** pour le logo et ce qui se lit comme un titre :
     - titres d'écran, noms d'espaces sur les cartes, titres des feuilles ;
     - le « Bonjour » de la carte du matin ;
     - le nom des stades (« Floraison S6 »).
   - Fraunces en police variable, avec `font-variation-settings: 'SOFT' 100` (l'axe opsz reste automatique), graisse 600–700.
   - **Figtree** reste pour le texte courant et les libellés.
   - **JetBrains Mono** reste pour tous les chiffres (EC, pH, VPD, DLI, doses). Les valeurs principales des cartes passent un cran plus gros, comme l'écran d'un appareil de mesure.
   - Version locale (hors ligne) : embarquer Fraunces via `@fontsource-variable/fraunces`, avec l'axe SOFT, dans `src/fonts-local.css`, comme les autres polices.
   - Version artefact : ajouter Fraunces au lien Google Fonts existant.
   - Créer un token `--font-display` et l'utiliser partout au lieu de valeurs en dur.
   - Vérifier : aucun débordement à 360 px ni au zoom 200 %.

2. Nom : il ne change pas, c'est toujours « Hydro ». Aucun identifiant technique ne bouge : base `hydro`, clés `hydro.*`, format `hydro-backup`, URL Netlify, dépôt, artefact.

3. Logo « hydro. »
   - Le mot **hydro** en minuscules, Fraunces 700 avec SOFT 100. Le « o » est remplacé par une **goutte qui contient une feuille** (SVG, viewBox `0 0 100 125`) :
     - goutte pleine : `<path d="M50 4 C50 4 8 58 8 84 A42 42 0 0 0 92 84 C92 58 50 4 50 4 Z" fill="var(--drop)"/>` ;
     - feuille découpée, de la couleur du fond : `<path d="M50 114 C29 101 29 72 50 54 C71 72 71 101 50 114 Z" fill="var(--bg)"/>` ;
     - nervure de la couleur de la goutte : `<path d="M50 108 L50 64" stroke="var(--drop)" stroke-width="5" stroke-linecap="round"/>`.
   - La goutte a la hauteur de l'œil d'un « o » : elle repose sur la ligne de base, avec 1 px d'espace de chaque côté.
   - Le mot finit par un **vrai point « . »**, en caractère texte de la même police, en vert feuille.
   - Couleurs :
     - thème sombre : texte `currentColor`, goutte #3ecf8e, point #8bd450 ;
     - thème clair : goutte au vert texte accessible défini au lot 10e (≈ #1f9e68 ou plus foncé, contraste ≥ 3:1), point #4f9a2a ;
     - la feuille découpée prend toujours la couleur du fond sur lequel le logo est posé.
   - Composant `Wordmark` réutilisable (taille en prop). L'utiliser dans la barre du haut, à la place de l'emoji plante en pot, et sur l'écran de bienvenue de l'assistant.

4. Icône d'app : la même **goutte avec sa feuille**, sans lettre.
   - Goutte #3ecf8e, feuille découpée et nervure, sur fond #101613. Icône carrée pleine : le système arrondit les coins.
   - La goutte occupe environ 58 % de la hauteur, pour rester dans la zone sûre « maskable ».
   - Générer depuis un SVG source `pwa/icon.svg` :
     - `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180) ;
     - une version `maskable` (512, avec marge) déclarée dans le manifeste ;
     - `favicon.svg` et un PNG de 32 px.
   - Ne pas toucher aux capacités de l'artefact.

5. Direction visuelle. Consigne de Thomas : **ça ne doit pas faire « app générée par une IA »**.
   - **Deux verts qui ont un sens**, en tokens `--water` et `--leaf` :
     - **vert eau** (goutte) pour tout ce qui touche à l'eau : arrosage, runoff, réservoir, EC et pH de la solution ;
     - **vert feuille** (point) pour la plante : stade, croissance, hauteur, récolte ;
     - même règle dans les pastilles, les courbes des graphiques et les icônes ;
     - orange et rouge réservés aux alertes ;
     - contraste vérifié dans les deux thèmes (texte ≥ 4,5:1, graphismes ≥ 3:1).
   - **Fonds teintés** : thème sombre en vert-noir (#0f1512, surfaces #18201c, bordures #26302b) ; thème clair en blanc cassé verdâtre (#f4f6f4) plutôt que blanc pur.
   - **Icônes** : dans l'interface courante (onglets, boutons, listes), des icônes au trait fin, de la même épaisseur que la nervure de la feuille. Les emojis 3D Fluent restent seulement dans l'assistant, les écrans vides et les moments rares (première récolte, cycle terminé).
   - **À retirer, ça fait « IA »** :
     - le halo dégradé radial en haut de l'écran (`App.tsx`, `--glow`) ;
     - la barre d'onglets translucide (la rendre opaque) ;
     - les ombres et lueurs colorées ;
     - les dégradés décoratifs ;
     - les animations d'apparition systématiques sur chaque carte (garder seulement les transitions d'écran et les retours d'action).
   - **Pas d'ajout gadget** : pas de glassmorphism, pas de violet, pas de grosses cartes « stats » décoratives, pas de texte en dégradé.
   - **Ton des textes** : phrases courtes, pas de points d'exclamation, tutoiement, sobre et sûr comme le point final du logo (« Tout est dans la cible. »).

6. Fin de lot (règles de `CLAUDE.md`)
   - Tests verts.
   - Captures FR/EN, en clair et en sombre, à 390 px.
   - Mise à jour des captures du README.
   - Dans le même commit : CHANGELOG et `docs/etat-du-build.md` (« [x] Lot 10f »).
   - Push sur `main` **sans** `[deploy]`.
   - Republication de l'artefact, sans redéclarer les capacités.

---

## Lot 10g : motif goutte et écran de démarrage

À faire après 10f, dans la même session si elle a encore de la place. Sinon, dans une nouvelle session avec ce même prompt (étape 0 : vérifier que 10f est coché).

1. **La goutte comme motif**, avec parcimonie : trois usages au maximum.
   - **Indicateur de chargement** : la goutte du logo qui se remplit de bas en haut (masque SVG). Avec `prefers-reduced-motion`, goutte fixe et texte « Chargement… ».
   - **Marqueur d'arrosage** sur la frise des graphiques : une petite goutte vert eau aux dates des bidons, à la place du marqueur actuel s'il y en a un.
   - **Jauge du réservoir** sur la carte d'espace : une goutte remplie au pourcentage de litres restants. Le chiffre en JetBrains Mono reste affiché à côté ; la goutte ne remplace jamais le chiffre.

2. **Écran de démarrage** (version locale installée)
   - Fond #0f1512, goutte avec sa feuille centrée (environ 96 px), le mot « hydro. » dessous, sans animation longue.
   - Dans le manifeste, `background_color` et `theme_color` à #0f1512, pour que l'écran système d'Android corresponde.
   - Sur iOS, `apple-touch-startup-image` n'est pas obligatoire. Si ça demande trop de tailles, s'en passer et le noter.
   - L'écran disparaît dès que les données sont chargées, sans délai artificiel.

3. **Fin de lot** : mêmes règles que 10f, avec « [x] Lot 10g : motif goutte et écran de démarrage ».

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- pas de mise en ligne Netlify sans demande de Thomas (voir `CLAUDE.md`).
