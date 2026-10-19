# Hydro — instructions pour les sessions Claude

Application de suivi de culture (React 19 + TypeScript + Vite + Tailwind). Interface en français par défaut, avec l'anglais disponible. Thomas teste sur son téléphone.

## À lire en premier, dans cet ordre
1. `docs/etat-du-build.md` : lots faits, décisions, pièges, commandes, **prochain lot**. Ses décisions priment sur le cahier des charges.
2. `docs/cahier-des-charges.md`
3. `docs/athena-fiche.md` : toutes les valeurs nutritives, avec leur page source.
4. `docs/maquette-aujourdhui.html` : la référence visuelle.

Ces fichiers sont la source de vérité. Il n'est pas nécessaire d'avoir accès au projet claude.ai.

## Règles
- **Une seule session à la fois.** Avant de commencer, vérifie dans `docs/etat-du-build.md` que tous les lots précédents sont cochés. Sinon, arrête-toi et préviens Thomas.
- `npm ci` puis `npm test` : tout doit passer **avant** de toucher au code.
- **Branche** : Thomas autorise le push direct sur `main` (un commit par lot ou sous-lot). Si la session est configurée sur une autre branche, pousse-la, ouvre une PR vers `main` et préviens Thomas.
- Fin de lot :
  - tests verts ;
  - captures ;
  - republication de `dist/hydro.html` sur **le même artefact** https://claude.ai/artifact/CPfncsJe9Yi21RMwHSLqYC, **sans redéclarer les capacités** ;
  - mise à jour de `CHANGELOG.md` **et** de `docs/etat-du-build.md` dans le même commit.
- Si la republication est refusée parce que la version en ligne vient d'une autre session : vérifie qu'elle correspond au build du dernier commit de `main` (en comparant hors `<style>`), demande l'accord explicite de Thomas, puis publie avec `force: true`.
- **N'invente aucune valeur** (dose, caractéristique d'équipement…). Pas de source → champ vide ou « donnée manquante ».
- Ne mélange jamais Pro Line et Blended.
- Si un lot est trop gros : préviens Thomas et coupe-le en a/b.
- **Netlify (version des potes)** : un push sur `main` ne met plus en ligne (crédits limités : 20 mises en ligne par mois). Ne mets `[deploy]` dans un message de commit que si Thomas demande une mise en ligne : `git commit --allow-empty -m "Mise en ligne [deploy]"` puis push.
