# Prompt de relais : passe de corrections 10a → 10e

À coller dans une session Claude Code. **Une seule session à la fois** : si elle s'arrête en route, une nouvelle session reprend avec ce même prompt, au premier point non coché.

---

Tu reprends la passe de corrections de l'app Hydro (dépôt `thomasll-max/Hydro-app-`, branche `main`). Thomas est absent : travaille en autonomie, sans poser de question. Note chaque décision dans `docs/etat-du-build.md`.

1. Lis dans l'ordre :
   - `CLAUDE.md` ;
   - `docs/etat-du-build.md` (section « Lot 10 », décisions et point de reprise) ;
   - `docs/audit-2026-10-19.md` (la liste des 84 points ; les points faits sont marqués ✅).
2. `git pull`, `npm ci`, `npm test` : tout doit passer avant de toucher au code.
3. Reprends au premier point non coché du premier lot non terminé (ordre : 10a, 10b, 10c, 10d, 10e). Pour chaque point :
   - corriger ;
   - ajouter un test quand c'est de la logique pure ;
   - relancer `npx tsc --noEmit -p .` et `npm test` ;
   - cocher ✅ le point dans `docs/audit-2026-10-19.md`.
4. Fin de chaque lot (règles de `CLAUDE.md`) :
   - tests verts ;
   - captures à 390 px (`scripts/shots.py`) ;
   - `CHANGELOG.md` et `docs/etat-du-build.md` mis à jour dans le même commit ;
   - commit « Lot 10x : … » poussé sur `main` ;
   - `npm run build` puis copie de `dist/hydro.html` dans `release/hydro.html` ;
   - republication sur l'artefact https://claude.ai/artifact/CPfncsJe9Yi21RMwHSLqYC **sans redéclarer les capacités** (si l'outil Artifact n'est pas disponible, le noter dans l'état du build).
5. Règles absolues :
   - n'invente aucune valeur (dose, caractéristique) : pas de source → champ vide ou « donnée manquante » ;
   - ne mélange jamais Pro Line et Blended ;
   - un lot trop gros se coupe en sous-lots (10b1, 10b2…).

Décisions déjà prises par Thomas :
- les 5 lots s'enchaînent ;
- ajouter une option « Autre marque / je dose moi-même » (journal EC/pH sans recettes) en attendant le lot 7 ;
- création de cycle minimale (nom, variété(s), espace, date de départ) ; les dates prévues sont optionnelles et repliées ; les étapes se déclenchent par des boutons le jour J (« Passer en végé », « Passer en 12/12 », « Récolter ») ;
- pas de date de transfert à prévoir : un transfert est un déplacement d'espace, qui déclenche le rappel Great White ;
- la récolte prévue est affichée, calculée depuis le 12/12 et les semaines de floraison, sans jamais remplir la date réelle de récolte.

## Simulation d'un an (vérification)

Les scripts sont dans `scripts/sim/`. Les lancer à la fin de 10b et à la fin de la passe.

1. Générer l'année : `npx -y tsx scripts/sim/build.ts /tmp/sim`. Cela produit `hydro-simulation-1an.json` et des instantanés à 9 dates dans `checkpoints/`.
2. Rejouer les matins : `npx -y tsx scripts/sim/validate.ts /tmp/sim`. Cela produit `validation.json` : anomalies détectées, fausses alertes, échéances qui traînent, plantages.
3. Passer dans le navigateur : `npm run build:local` puis `python3 scripts/sim/browse.py dist-local /tmp/sim`, avec Chromium sur `/opt/pw-browsers/chromium`. Les captures des 9 dates sont prises écran par écran.

Résultat de référence avant la passe :
- 23/23 anomalies détectées ;
- 96 jours de « végé en Colonne jugée comme un semis », à ramener à 0 avec 10b ;
- 12 échéances qui traînent, dont les Fade ;
- 0 plantage.

Les scripts appellent le vrai code de l'app : si un module change de signature, adapter le script, pas le contraire.
