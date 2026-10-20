# Prompt lot 14 : toute la gamme Athena (Blended partout, Stack, Proper, Cuts)

À lancer dans Claude Code après le lot 13 (coché), une seule session à la fois. Si c'est trop gros : 14a (Blended visible partout, choix de gamme) puis 14b (Stack, Proper, Cuts).

Demande de Thomas (20/10/2026) : « Quitte à utiliser Athena, autant faire toute leur gamme. » On garde la règle d'or : **Pro Line et Blended ne se mélangent jamais** dans un même bidon ou un même espace.

## État actuel (à vérifier dans le code)
- **Pro Line** : complète, visible partout.
- **Blended** : déjà encodée (`src/data/nutrients/athena-blended.ts`, depuis le Handbook FR V8, pages citées), mais **cachée dans la version claude.ai** (`visibleCatalogs("artifact")` ne renvoie que Pro), décision du lot 1 « Blended reporté à la version des amis ». Elle est visible en version locale (Netlify).
- **Add-ons** : Cleanse, Fade, Balance, IPW, CaMg et PK (ces deux derniers Blended uniquement).
- **Proper** : dans la fiche (`docs/athena-fiche.md`, section ADD-ONS) comme « dose et semaines depuis l'étiquette uniquement ». Il n'est pas un add-on de l'app.
- **Stack** et **Cuts** : absents.

## Sources officielles relevées le 20/10/2026 (à recopier dans `docs/athena-fiche.md`, nouvelle section « Compléments hors Handbook »)
- **Stack**, page boutique officielle https://store.athenaag.com/stack/ (consultée le 20/10/2026) :
  - « Natural plant nutrient made from premium kelp extract » ; aide à corriger de légères carences en potassium ; contient des ingrédients organiques, peut se séparer : bien agiter ;
  - **arrosage (root drench)** : **1–2 mL par gallon**, une fois par semaine, dans le bidon de la semaine, **ajouté en dernier** ; peut être combiné avec la recette d'engrais habituelle ; « safe for irrigation systems » ;
  - **pulvérisation foliaire** : **7 mL par gallon**, une fois par semaine, lampes éteintes, laisser sécher avant de rallumer, **pas après la semaine 3 de floraison** ;
  - **période** : de la dernière semaine de végé à la semaine 3 de floraison (ou dès que les plantes ne grandissent plus) ;
  - transplantation : 2 mL par gallon (trempage 30–60 s des racines ou dans l'eau après transfert) ; graines : 4 mL par gallon, trempage 1–2 min ;
  - compatible avec Athena IPM dans le même pulvérisateur (page https://www.athenaag.com/foliar-line) ;
  - étiquette et FDS officielles : https://www.athenaag.com/sds-sheets (lien Google Drive, non lu ici).
  - **Conversion** : 1 gallon US = 3,785 L. Afficher l'unité d'origine **et** la valeur en mL/L ou mL/10 L avec la formule (1–2 mL/gal = 0,26–0,53 mL/L ; 7 mL/gal = 1,85 mL/L ; 2 mL/gal = 0,53 mL/L ; 4 mL/gal = 1,06 mL/L), arrondis à 2 décimales et marqués « converti ».
  - **Contradiction** : des revendeurs écrivent « jusqu'à la semaine 4–5 de floraison » pour l'arrosage. La page officielle dit semaine 3 : **on suit l'officiel**, sans afficher la version revendeur.
  - Stack n'appartient ni à Pro ni à Blended (gamme « Foliar ») : il peut s'ajouter aux deux.
- **Proper** (« Synganic Terpene Booster ») : **aucune dose publiée** (Handbook V8, https://www.athenaag.com/modified, et absent de la page des étiquettes au 20/10/2026). Il reste un produit Athena **sans dose** : l'app le propose, mais la dose et les semaines sont **saisies par l'utilisateur depuis son étiquette** et marquées « dose de l'étiquette, saisie par toi ».
- **Cuts** (Blended, produit pour boutures) : une étiquette existe sur https://www.athenaag.com/sds-sheets, mais elle n'a pas été lue. Même traitement que Proper tant qu'aucune dose officielle n'est relevée : proposé, **dose à saisir depuis l'étiquette**.

**N'invente aucune autre valeur.** S'il te manque une donnée, écris « donnée manquante » et note-le dans l'état du build.

---

## 14a : Blended partout et choix de la gamme

1. `git pull`, `npm ci`, `npm test`. Ajoute « [ ] Lot 14 » dans l'état du build et note la demande de Thomas.
2. **Blended visible aussi dans la version claude.ai** : `visibleCatalogs` renvoie Pro et Blended pour les deux cibles. Mets à jour la décision « Blended reporté » dans l'état du build.
3. **Choix de la gamme** par grow et par espace (Réglages, assistant de démarrage, outil Nutrition) : **Pro Line** (poudres, table d'EC) ou **Blended** (liquides A/B). Une ligne d'explication sous chaque choix, tirée du Handbook. Les identifiants de gamme existants ne changent pas.
4. Changer de gamme en cours de cycle : confirmation ; les bidons déjà faits gardent leur gamme ; les graphiques et bilans séparent les deux (règle déjà en place pour les bilans).
5. Repères (Outils) : afficher les tableaux Blended à côté de ceux de Pro, avec leurs pages.
6. Tests : un espace Blended ne propose jamais de produit Pro et inversement ; CaMg et PK seulement en Blended ; non-régression des recettes Pro.

## 14b : Stack, Proper, Cuts

1. **Stack** : nouvel add-on Athena, disponible avec Pro **et** Blended, désactivé par défaut.
   - Deux usages, au choix dans l'outil :
     - **dans le bidon** (root drench) : dose 1–2 mL/gal convertie, **une fois par semaine**, ajouté **en dernier** dans l'ordre de mélange ; seulement de la dernière semaine de végé à la semaine 3 de floraison ;
     - **en pulvérisation** : dans l'outil Pulvérisation (lot 10k), 7 mL/gal converti, une fois par semaine, lampes éteintes, **bloqué après la semaine 3 de floraison** (message clair) ; peut être combiné avec l'IPW dans le même pulvérisateur.
   - Comme il contient des ingrédients organiques, il suit la règle du lot 7b : l'utilisateur peut le passer « à la main ».
   - Rappel hebdomadaire proposé (pas automatique) dans le calendrier.
   - Source dans l'ⓘ et dans la page À propos (lot 13) : « Athena, page officielle Stack, consultée le 20/10/2026 ».
2. **Proper** et **Cuts** : proposés dans la liste des produits Athena, avec la mention « dose non publiée par Athena : saisis celle de ton étiquette ». Ils réutilisent le formulaire des produits perso (dose, unité, pour combien de litres, semaines). Tant que rien n'est saisi, ils n'apparaissent dans aucune recette. Proper : avec Pro et Blended. Cuts : Blended, au stade bouture.
3. Tests : conversions gal → L ; Stack absent avant la dernière semaine de végé et après S3 de floraison ; Stack ajouté en dernier ; pulvérisation Stack refusée après S3 ; Proper et Cuts sans dose n'entrent dans aucune recette ; aucune valeur pour Proper/Cuts dans le code.

## Fin de lot (règles de `CLAUDE.md`)
- Tests verts, simulation d'un an sans plantage.
- Captures FR/EN/DE : choix de gamme, recette Blended, Stack dans le bidon et en pulvérisation, Proper sans dose.
- `docs/athena-fiche.md`, README, CHANGELOG et état du build dans le même commit.
- Push sur `main` **sans** `[deploy]`.
- Republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
