# Prompt : revue complète de Hydro (design, fonctions, expérience, code)

À coller dans une **nouvelle session Claude Code** sur ce dépôt (modèle Fable 5), une seule session à la fois. Thomas veut un regard neuf et exigeant, pas une validation de l'existant.

---

Tu reprends **Hydro**, une app de suivi de culture (React 19, TypeScript, Vite, Tailwind, Vitest), construite lot par lot depuis le 17/10/2026. Tout est fini jusqu'au lot 15 et en ligne sur Netlify. Ton travail : **regarder l'app comme un nouvel utilisateur exigeant, un designer produit et un développeur senior**, dire ce qui ne va pas, proposer comment faire mieux, et rendre le code propre.

## 0. Avant tout
1. Lis `CLAUDE.md`, puis `docs/etat-du-build.md` (décisions, pièges, règles « calme » du lot 10k), `docs/cahier-des-charges.md`, `docs/athena-fiche.md`.
2. `git pull`, `npm ci`, `npm test`, `npm run build:local`, `PYTHONPATH=scripts python3 scripts/e2e-15.py dist-local /tmp/e2e`. Tout doit être vert avant de commencer. Sinon, arrête-toi et préviens Thomas.
3. Ajoute « [ ] Revue complète (prompt `docs/prompt-revue-complete.md`) » dans l'état du build.

## 1. Phase A : la revue (aucune modification du comportement de l'app)

Utilise l'app pour de vrai, sur profil vide **et** avec la simulation d'un an (`scripts/sim`), à 390 et 360 px, clair et sombre, FR/EN/DE, en Playwright avec Chromium (`/opt/pw-browsers/chromium`). Prends des captures de tout ce que tu cites.

Regarde quatre choses :

**a. Expérience utilisateur**
- Le premier lancement et les 7 premiers jours d'un nouvel utilisateur : où il bloque, hésite, ne comprend pas, abandonne.
- Les gestes quotidiens (saisie du matin, bidon, rappels, passer en 12/12, récolter) : nombre de touchers, attente, erreurs possibles, retours en arrière.
- Les messages : jargon, phrases trop longues, ton, cohérence entre FR, EN et DE.
- L'accessibilité : contrastes, tailles tactiles, lecteurs d'écran, zoom 200 %, mouvement réduit.

**b. Design**
- Cohérence avec les règles « calme » du lot 10k (un point d'entrée, chaque chiffre une fois, Geologica, Figtree, plus de JetBrains Mono, dessins 3D seulement sur les espaces, « Maintenant » et Premiers pas) : liste chaque écart, écran par écran.
- Hiérarchie, espacements, alignements, états vides, états de chargement, erreurs, feuilles et menus.
- Ce qui fait encore « généré par une IA » ou « gabarit », et comment lui donner plus de caractère sans perdre la clarté.

**c. Fonctions**
- Ce qui manque pour un cultivateur sérieux en coco ou hydro (compare à Grow with Jane, GrowDiaries, AROYA, l'app AC Infinity), ce qui est en trop, et ce qui fait doublon entre écrans.
- La justesse des calculs et des cibles : rien d'inventé, chaque valeur traçable jusqu'à `docs/athena-fiche.md` ou à une formule. Signale tout chiffre sans source.
- La robustesse des données : sauvegarde, import, migrations, version claude.ai contre version locale, hors ligne.

**d. Code**
- Architecture et découpage : composants trop gros, logique métier dans l'interface, duplications, code mort, `any`, `eslint-disable`, TODO.
- Types et modèles de données : cohérence, champs morts, migrations (`schemaVersion`).
- i18n : clés mortes, parité FR/EN/DE, textes en dur.
- Tests : ce qui est bien couvert, ce qui ne l'est pas, tests fragiles ou redondants, scripts `e2e-*.py` à fusionner.
- Performance : taille du bundle (version claude.ai et locale), rendus inutiles, calculs répétés sur 1 an de données.
- Sécurité et vie privée : verrou PIN, données envoyées à Claude, en-têtes Netlify, dépendances.

**Livrables de la phase A** (dans un commit « Revue complète : constats et propositions », sans toucher au code de l'app) :
- `docs/revue-2026-10/rapport.md` : constats classés par gravité (bloquant, important, confort), chacun avec l'écran ou le fichier, la capture ou la ligne, et la correction proposée.
- `docs/revue-2026-10/propositions.md` : tes idées pour aller plus loin en design, fonctions et expérience, chacune avec le bénéfice pour l'utilisateur, le coût (petit, moyen, gros) et ce qu'elle remplace ou simplifie.
- `docs/revue-2026-10/code.md` : le plan de nettoyage du code, en étapes qui gardent les tests verts à chaque commit.
- `docs/revue-2026-10/lots.md` : un découpage en lots 16, 17, 18… prêts à lancer, chacun avec sa liste de tâches, dans le même style que `docs/prompt-lot-15.md`.
- Si l'outil Artifact est disponible dans ta session : une **planche HTML** avant/après des 5 changements de design les plus importants, publiée en artefact privé.

Puis **arrête-toi** et envoie à Thomas un résumé court en français : les 5 problèmes les plus graves, les 5 meilleures idées, et le plan de nettoyage du code en une phrase par étape. **Ne passe pas à la phase B sans son accord.**

## 2. Phase B : seulement après l'accord de Thomas
Applique les lots validés, un commit par lot ou sous-lot, avec les règles de fin de lot de `CLAUDE.md`. Le nettoyage du code ne change aucun comportement visible : les tests et `scripts/e2e-15.py` restent verts à chaque commit, et la simulation d'un an donne les mêmes résultats.

## Règles (de `CLAUDE.md` et des décisions de Thomas)
- **N'invente aucune valeur** (dose, cible, caractéristique). Pas de source = « donnée manquante ».
- **Ne mélange jamais Pro Line et Blended.**
- **Ne renomme aucun identifiant technique** (base `hydro`, clés `hydro.*`, format `hydro-backup`), et aucune donnée existante ne doit être perdue.
- Les décisions de `docs/etat-du-build.md` priment ; si tu veux en remettre une en cause, dis-le dans le rapport au lieu de la changer.
- Pas de mise en ligne Netlify (`[deploy]`) sans demande de Thomas.
- Republication de l'artefact sans redéclarer les capacités, sauf accord explicite de Thomas.
- Sois franc : Thomas préfère une critique honnête à un rapport rassurant.
