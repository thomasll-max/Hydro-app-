# Prompt lot 7 : nutrition multi-marques

À lancer dans Claude Code, une seule session à la fois, **après** 10h, 10i, et après que le paquet de recherche a été copié dans `docs/marques/` (voir l'étape 0). Le lot est gros : il est découpé d'avance en 7a → 7e, un commit par sous-lot. Si un sous-lot est encore trop gros, le recouper.

---

## Sources de vérité (dans le dépôt)

- `docs/marques/_schema.md` : modèle de données commun (Brand → Line → Product / Program / Step / Dose / Rule), avec les décisions de Thomas en section 6.
- `docs/marques/<marque>.donnees.md` : canna, plagron, mills, advanced-nutrients, terra-aquatica. Données sourcées, avec niveau de certitude.
- `docs/marques/_pret-pour-code.md` : état de chaque marque (complet / partiel / bloqué), décisions de Thomas, écarts avec le code actuel.
- `docs/athena-fiche.md` : Athena, inchangée.
- Les décisions notées dans `docs/etat-du-build.md` priment sur ces documents.

## Règles absolues

- **Aucune valeur inventée.** Chaque nombre du catalogue porte une référence (source, endroit, certitude). Valeur non publiée = `null` + raison, et l'UI affiche « donnée manquante ». Jamais 0, jamais d'interpolation, jamais de moyenne.
- **Les gammes ne se mélangent jamais**, y compris Pro Line et Blended. Un test le vérifie.
- **Contradictions conservées** : les deux valeurs sont stockées et affichées (« Canna : 1–5 ; FAQ : 0–7 »), sans en choisir une en silence.
- Valeurs `reconstructed` ou `retailer_only` : affichées avec une mention discrète (« colonne reconstruite », « copie revendeur »).
- Une marque **bloquée** dans `_pret-pour-code.md` n'est pas proposée dans l'app ; elle est listée dans l'état du build.
- **Données existantes intactes** : les identifiants de gamme actuels (`ATHENA_PRO.id`, `ATHENA_BLENDED.id`, `own`), les bidons (`Mix`), les réglages d'espace et les sauvegardes `hydro-backup` doivent continuer à fonctionner. Aucun identifiant de stockage renommé. Migration testée sur un vieux backup (`scripts/sim`).

---

## 7a : nouveau modèle, Athena migrée, sans changement visible

0. Vérifie que 10h et 10i sont cochés et que `docs/marques/` contient `_schema.md`, `_pret-pour-code.md` et les 5 fichiers `.donnees.md`. **S'il en manque un, arrête-toi et préviens Thomas.** Puis `git pull`, `npm ci`, `npm test`. Ajoute les lignes « [ ] Lot 7a » à « [ ] Lot 7e » dans l'état du build.
1. Écris les types de `_schema.md` en code (`src/data/nutrients/schema.ts`), en tenant compte des écarts listés dans `_pret-pour-code.md`.
2. Le moteur actuel (`src/calc/nutrients.ts`) lit aujourd'hui `NutrientCatalog`. Deux options, choisis la plus sûre et note-la :
   - un adaptateur qui produit l'ancien `NutrientCatalog` à partir du nouveau modèle pour Athena ;
   - ou l'inverse : Athena décrite dans le nouveau modèle, et le moteur passe au nouveau modèle.
   Dans les deux cas, **les résultats Athena doivent être identiques au centième** : test de non-régression sur toutes les phases, toutes les EC de la table p. 37, Pro Line et Blended, add-ons allumés et éteints.
3. Tests génériques : chaque valeur non nulle a au moins une référence ; aucun programme ne pointe vers une autre gamme ; conversions d'unités (mL/10 L, g/10 L, gal US = 3,785 L, formule stockée).
4. Simulation d'un an (`scripts/sim`) : mêmes résultats qu'avant 7a.

## 7b : moteur générique

1. Dose pour un bac : dose normalisée × volume. Fourchettes affichées min–max ; le choix de l'utilisateur est enregistré dans le bidon comme « choix utilisateur ».
2. EC : afficher la cible de l'étape. Si `ecIncludesWater` est vrai, ajouter « EC apportée ≈ cible − EC de ton eau » (calcul de l'app, étiqueté). Si `null`, le dire (« la marque ne précise pas si l'eau est incluse »). Si `not_published`, jauge sans bande cible + « la marque ne publie pas de cible ».
3. pH selon `phPolicy` : cible, tampon automatique (AN : pas de correction conseillée, plage indicative) ou titrage (Athena Balance, inchangé).
4. Étapes par semaine, par jours, par plage de semaines, et par **phase sans durée** (Terra Aquatica : durée de chaque phase fixée par l'utilisateur au début du cycle, marquée « choix utilisateur », décision de Thomas).
5. Extension (allonger végé ou floraison) : seulement selon la règle publiée ; sinon « la marque ne précise pas comment allonger ».
6. Ordre de mélange : la séquence publiée, ou « ordre non précisé par la marque ».
7. **Alertes**, informatives et non bloquantes (décision de Thomas), visibles sur le bidon et dans la carte du matin, avec leur source :
   - **conservation** : si l'autonomie du bac (jours × 24) dépasse la durée de vie la plus courte des produits du bidon ou de la gamme ;
   - **goutteurs** : produit `dripSafe = "no"` dans un espace en goutte-à-goutte ;
   - **plafond d'EC** et **exclusions** entre produits ;
   - produits **foliaires** jamais comptés dans le bac ni dans l'EC.
8. Tests unitaires pour chaque règle, avec les cas réels (Mills 24–48 h < bac 5 j, Plagron organiques 48 h, Canna Cannazym 4 j).

## 7c : les marques

Une gamme par fichier (`src/data/nutrients/<marque>.ts`) et `_sources.ts` pour toutes les sources datées. En priorité la **gamme coco** de chaque marque, puis les autres gammes seulement si `_pret-pour-code.md` les dit complètes.
- Ordre conseillé : Canna COCO, Plagron 100 % Coco, Terra Aquatica, Mills, Advanced Nutrients (Sensi Coco).
- Cas particuliers déjà tranchés (`_schema.md` §6) :
  - Plagron COCO mode système : doses du tableau manuel, mention « non publiées pour le mode système », EC du tableau système ;
  - Plagron TERRA / NATURAL à double « Terra Bloom » : pas importés ;
  - AN : seulement Top Shelf et Master, pas les niveaux vus chez les revendeurs ;
  - Mills, CalMag hebdomadaire hors bac : une échéance du calendrier, pas une dose.
- Applique aussi les décisions de Thomas listées dans `_pret-pour-code.md` et recopiées dans l'état du build.
- Pour chaque gamme : un test qui compare quelques cellules au tableau de `.donnees.md` (au moins une par étape), et un test de non-mélange.

## 7d : interface

1. **Choix de la gamme** dans Réglages (grow et espace) et dans l'assistant de démarrage : marque, puis gamme, puis programme ou niveau (Easy / Expert, Top Shelf / Master, Regular / High Concentrate, eau du robinet / osmosée…). Pour chaque gamme : état, substrats, et le verdict de `_pret-pour-code.md` pour un bac de 5–7 jours en goutte-à-goutte.
2. Outil Nutrition : recette du jour selon la gamme de l'espace, unités d'origine visibles au toucher, sources sous chaque résultat, mentions « donnée manquante », « colonne reconstruite », « copie revendeur ».
3. Changer de gamme en cours de cycle : demande de confirmation. Les bidons déjà faits gardent leur gamme et leurs valeurs.
4. Version claude.ai : Blended reste cachée (choix existant). Les nouvelles marques sont visibles dans les deux versions, sauf décision contraire de Thomas.
5. « Demander à Claude » et la carte du matin reçoivent la gamme réelle de l'espace, sans valeur inventée (tests sur le texte généré).
6. Style du lot 10h (et 10j s'il est fait) : lectures, champs « instrument », un seul bouton plein.

## 7e : gamme perso (si `_pret-pour-code.md` et Thomas le confirment ; sinon reporter)

`_schema.md` §5 : l'utilisateur décrit sa propre gamme (produits, grille produits × étapes, cibles, règles), ou part d'une gamme du catalogue (« copier puis modifier »). Tout est marqué « perso, non vérifié ». Export et import en JSON. L'option actuelle « Autre marque / je dose moi-même » reste disponible.

## Fin de chaque sous-lot (règles de `CLAUDE.md`)

- Tests verts, simulation d'un an sans plantage.
- Captures FR/EN/DE de l'outil Nutrition et des Réglages avec au moins deux marques.
- README, CHANGELOG et état du build dans le même commit.
- Push sur `main` **sans** `[deploy]`.
- Republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais deux gammes ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
