# Prompt lot 7 : Athena + « mes produits » (version simple)

À lancer dans Claude Code, une seule session à la fois, après 10h, 10i et 10j (cochés). Si le lot est trop gros, le couper en 7a et 7b.

**Décision de Thomas (19/10/2026)** : on abandonne le catalogue multi-marques. L'app reste **Athena seule** (Pro Line, et Blended dans la version des potes). Les autres marques s'entrent **à la main** par l'utilisateur, produit par produit, avec les doses de leur étiquette. La recherche sur Canna, Plagron, Mills, Advanced Nutrients et Terra Aquatica reste dans le projet claude.ai, pour plus tard. **Elle n'est pas importée dans l'app.**

Ce qui existe déjà et sert de base :
- les **produits perso** (`CustomProduct` dans `src/model/grow.ts` : nom, marque, unité, dose par 10 L, semaines d'usage, application bac ou racines) ;
- la gamme **« Autre marque / je dose moi-même »** (`OWN_LINE`, lot 10e), qui ne donne aujourd'hui ni recette ni dose : juste une note texte, l'EC visée, le pH.

---

## 7a : « Autre marque » devient une vraie recette perso

1. `git pull`, `npm ci`, `npm test`. Ajoute « [ ] Lot 7a » et « [ ] Lot 7b » dans l'état du build et note la décision ci-dessus dans les décisions.
2. Avec la gamme « Autre marque », l'utilisateur compose **sa gamme** à partir des produits perso :
   - bases et additifs, dans n'importe quelle marque ;
   - pour chaque produit, la dose de l'étiquette dans son unité (mL ou g pour 1 L, 4 L, 10 L, ou 1 gallon US, converti avec 3,785 L, la formule affichée), et les semaines d'usage (végé, floraison S… à S…) ;
   - l'ordre de mélange : celui de la liste, déplaçable. Sans ordre saisi, l'app affiche « ordre non précisé ».
3. L'outil Nutrition calcule alors **la recette du bidon** pour la semaine en cours : dose × volume, produit par produit. Une fourchette s'affiche en min–max. Tout est marqué « perso, non vérifié ».
4. EC et pH : seulement ce que l'utilisateur saisit comme cible (par phase, facultatif). Sans saisie, pas de cible : la jauge s'affiche sans bande, comme aujourd'hui. **L'app ne propose jamais de valeur.**
5. Le bidon enregistré (`Mix`) garde les produits et les quantités du jour, comme pour Athena.
6. Raccourci « Partir de l'étiquette » : un formulaire court par produit (nom, dose, pour combien de litres, semaines). Pas de saisie de NPK ni de tableau complet.
7. Les données existantes ne bougent pas : un espace déjà en « Autre marque » garde sa note texte, affichée au-dessus de la nouvelle recette tant qu'elle n'est pas remplie.

## 7b : « À la main » et produits perso dans Athena

1. Chaque produit perso reçoit un choix d'application : **bac**, **à la main** (arrosoir) ou **racines** (déjà existant, une fois au transfert).
2. Les produits « à la main » ne sont pas comptés dans la recette ni dans l'EC du bac. Ils sont listés sous la recette, dans « À la main, si tu veux », avec leur dose par litre d'arrosoir. Pas de fréquence, pas de rappel automatique : un bouton « Ajouter un rappel » suffit si l'utilisateur en veut un.
3. Dans les bidons Athena, les produits perso restent possibles comme aujourd'hui (« hors Athena, non vérifié »), avec le même choix bac ou à la main.
4. Aide d'une ligne dans le formulaire : « Produits organiques (enzymes, sucres, extraits) : plutôt à la main, ils peuvent boucher les goutteurs et se dégrader dans un bac de plusieurs jours. » C'est un conseil général, sans chiffre.

## Tests

- Conversions d'unités (1 L, 4 L, 10 L, gal US) et dose × volume.
- Semaines d'usage : un produit n'apparaît que dans ses semaines.
- Produits « à la main » absents du bac et de l'EC.
- Aucune cible inventée : sans saisie, pas de cible.
- Un vieux backup avec un espace en « Autre marque » s'ouvre sans perte.
- Pro Line et Blended inchangées (test de non-régression existant).

## Fin de lot (règles de `CLAUDE.md`)

- Tests verts, simulation d'un an sans plantage.
- Captures FR/EN/DE de Nutrition en « Autre marque » avec 3 produits, dont un à la main.
- README, CHANGELOG et état du build dans le même commit.
- Push sur `main` **sans** `[deploy]`.
- Republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
