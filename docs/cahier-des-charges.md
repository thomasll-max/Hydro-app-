# Cahier des charges — Application de culture « Hydro » (v1)

> Copie de travail dans le dépôt (source de vérité pour les sessions Claude Code). Les autres documents : `docs/etat-du-build.md`, `docs/athena-fiche.md`, `docs/maquette-aujourdhui.html`.

Objectif : une application web pour piloter un grow, utilisée surtout **au téléphone, dans la tente**.

**Un seul code, deux versions (section 12) :**
- **Version Claude**, pour Thomas : artefact Claude (https://claude.ai/artifact/CPfncsJe9Yi21RMwHSLqYC) avec base de données, photos, exports, « Demander à Claude » et résumé du matin envoyé par une tâche programmée.
- **Version locale**, pour ses amis : site statique sur Netlify, installable en PWA, tout sur le téléphone, hors ligne, sans compte.

**Les choix techniques sont arrêtés (sections 11 et 12).** Si l'un d'eux s'avère impossible, le signaler avec la raison et proposer l'alternative la plus proche.

**Maquette validée : `docs/maquette-aujourdhui.html`.** C'est la référence visuelle obligatoire : ambiance, cartes, jauges en arc avec bande cible, compteurs animés, alerte Border Beam, mini-courbe avec zone cible, liste d'arrosage avec la prochaine dose surlignée, barre d'onglets en verre, bouton flottant « Saisie du jour », sélecteurs FR/EN et clair/sombre.

Les décisions prises en cours de route (Blended reporté au lot 8, libellés, add-ons de Thomas…) sont dans `docs/etat-du-build.md` et **priment** sur ce document.

---

## 1. Setup de Thomas (valeurs par défaut de son grow)
- Tente AC Infinity CloudLab 743D (120×90×180), qui forme **deux espaces** :
  - **« Floraison »** : 90×90×180, IONFRAME EVO4 300 W, Alien RAIN 4 × 15 L ;
  - **« Colonne »** : 30×90×180, IONBEAM S16 (2 + 2 barres) ; propagation et végé, puis séchage.
- EVO4 : pas de PPF publié pour la lampe complète (3,14 µmol/J donnés par diode, « 1819 PPFD » sans distance). Gradation sur 10 niveaux.
- S16 : 4 barres, 42 W au total, LM301H EVO, 3,14 µmol/J.
- Réservoir de 120 L (drain-to-waste, 5 à 7 jours de solution) et bidon de runoff de 20 à 25 L.
- RAIN : 100 % coco UGro Rhiza. Pompe de pression sur la Control Plug (débit à mesurer), pompe de drain toujours alimentée.
- Air : Cloudline S6 + filtre à charbon 150 mm, Cloudray S6, HYDRONE 5 hors de la tente.
- Controller AI+ : écran dans la floraison, sonde 1 dans la colonne, port 2 pour le futur capteur de sol ; capteur CO2/lumière.
- Athena Pro Line en concentrés à 226 g/L, avec Fade, Cleanse, Balance, Proper ; Great White au transfert. Eau de Bergen, douce.
- Mesures : stylo EC/pH, peson (pot témoin), téléphone (lux ou Photone).
- Cycle 1 : Cherry Limeade en graines, germination dans la Colonne puis passage en Floraison. Ensuite, récolte perpétuelle avec deux cycles en parallèle.

**Assistant de premier lancement (amis)** : nom du grow → espaces (modèles, dimensions L × l × H) → équipement (rapide, facultatif) → modules → gamme, add-ons et méthode → premier cycle → heure du résumé. Un espace se duplique avec son équipement.

## 2. Navigation
- Onglets : **Aujourd'hui**, **Journal**, **Calendrier**, **Graphiques**, **Outils** (Arrosage / crop steering, Nutrition, pH / Balance, Pulvérisation IPW, Lumière, Climat et air, Équipement, Repères, Réglages).
- Sélecteur d'espace en haut (Tous, rooms ou sites, espaces), mémorisé. Clair / sombre / système et FR / EN.
- Une page tient sur un ou deux écrans.
- Une fonction pas encore construite affiche « Arrive au lot X ».
- Pas de « Demander à Claude » dans la version locale.

## 3. Aujourd'hui
- Carte « Bonjour ».
- Vue « Tous » : une carte par espace, regroupées par room.
- Vue d'un espace :
  - culture : stade, cibles, programme, dernière saisie, **une seule correction** ;
  - propagation ;
  - séchage.
- Autonomie du réservoir.
- Rappel de sauvegarde (version locale).

## 4. Journal
- Moins d'une minute par saisie, préremplissage maximal, seule la date est obligatoire, seulement les modules actifs.
- Saisie par espace (groupe ou plante en option) : climat et VPD ; irrigation (dryback, % de runoff) ; solution (EC, pH, bidon) ; runoff ; lumière (%, hauteur, PPFD, DLI) ; propagation ; plante ; tags ; photos ; note ; instantané des cibles ; « + Rappel » ; niveau du réservoir.
- Saisie rapide multi-espaces.
- Événements, dont les changements d'équipement.
- Bidons, pulvérisations, récolte (g/W avec les watts réels), historique.

## 4bis. Modèle modulable
- **Grow** unique (réglages globaux).
- **Site / room** : facultatif, un seul niveau.
- **Espace** : nom, modèle, couleur, ordre, dimensions (cm) donnant surface et volume, modules, gamme et add-ons propres ; archivable et duplicable.
- **Modules** : `climate`, `light`, `irrigation`, `nutrition`, `propagation`, `drying`, `plants`.
- **Modèles** :
  - Floraison/Végé = climate + light + irrigation + nutrition + plants ;
  - Propagation = climate + light + propagation ;
  - Mère = climate + light + irrigation + nutrition ;
  - Séchage = climate + drying ;
  - Personnalisé.
- Désactiver un module masque ses données sans les effacer.
- **Cycles** : illimités, un seul espace à la fois, transferts historisés (même partiels).
- Groupes et plantes facultatifs.
- Calculs par espace et par cycle.
- Doit rester fluide avec 20 espaces sur 2 ans.

## 4quater. Équipement
- Inventaire `equipment`, affectations historisées (un espace, plusieurs, ou stock).
- **Lampe** : W réels, µmol/J ou PPF, dimensions, couverture, gradation, quantité.
- **Réservoir** : volume utile/total, mode, chauffage, bulleur.
- **Pompe** : débit mesuré (mL/min) et date de la mesure, sorties.
- **Contenants** : volume, nombre, substrat.
- **Extracteur** : m³/h (CFM converti), filtre, % de vitesse.
- Autres appareils, capteurs.
- Pré-rempli **uniquement avec le matériel de Thomas**. Ne jamais inventer les caractéristiques d'un modèle du commerce. Un champ manquant affiche « donnée manquante ».
- Calculs :
  - PPFD estimé = Σ(PPF × %) × pertes ÷ surface ; W/m² ; hauteur libre ;
  - durée d'une dose = volume ÷ débit ; rappel de mesure du débit après 60 jours ;
  - volume du bac = réservoir ; autonomie ;
  - renouvellement d'air (repère courant étiqueté comme tel) ;
  - g/W.
- Le schéma SVG de l'espace est prévu au lot 5.

## 4ter. Calendrier, rappels, Bonjour
- Rappels récurrents, échéances automatiques (chacune ajoutée au lot qui livre son calcul).
- Calendrier : mois avec stats, agenda, fiche du jour.
- `buildDailyDigest` (pure), lu par la tâche du matin.
- Export .ics.

## 5. Graphiques (lot 6)
- Courbes : dryback, EC, pH, Balance, volume et runoff, T, HR et VPD, PPFD et DLI, hauteur, levée, consommation, réservoir.
- Zones cibles et événements affichés.
- Comparaison jusqu'à 4 espaces.
- Périodes : 7 jours, 30 jours, cycle.

## 6. Outils
### Arrosage / crop steering (lot 4)
- Auto ou manuel ; coco / terreau / 70-30.
- P0–P3 ou méthode manuelle de la gamme.
- Volume des pots et débit tirés de l'équipement.
- Mode capteur AC Infinity (méthode Bonorum : P1 = 2 × la dose P2 à heure fixe, doses P2 de 1–2 % déclenchées par le capteur, pause de 30–45 min, plus rien 3 h avant l'extinction ; seuil génératif = base, végétatif = pic − 2 points). **Le tableau en secondes de Bonorum est faux d'un facteur 10 : utiliser la formule.**

### Nutrition à catalogue (lot 4)
- `data/nutrients/athena-pro.ts`, `athena-blended.ts`, `addons.ts`, chaque valeur sourcée (voir `docs/athena-fiche.md`).
- **Pro** : EC visée, poudre ou concentré (113/226/282 g/L), recettes p. 31.
- **Blended** : programme p. 58, mise à l'échelle **estimée**, B avant A. Le menu reste caché pour Thomas (décision lot 8).
- **Add-ons** : Fade, Cleanse (avec mode rinçage), Balance, CaMg/PK (Blended uniquement), IPW (jamais dans le bac), produits perso (Proper : dose prise sur l'étiquette).
- Résultat dans l'ordre de mélange, avec les règles d'incompatibilité.
- Volume du bac = réservoir de l'espace.
- « Enregistrer ce bidon » : un bidon peut servir plusieurs espaces ; on enregistre le pH avant/après et le Balance ajouté.
- Assistant concentré et stocks, échéance « concentré presque vide ».

### pH / Balance (lot 5)
- pH cible automatique, avec sa source.
- Titrage guidé : 1 mL pour 4 L.
- Prédiction apprise à partir de 2 bidons, avec un départ à 80 %.
- En cas de dépassement, aucune dose inventée.

### IPW (lot 5)
- 24 mL/L deux fois par semaine ; 32 mL/L trois fois par semaine ; restauration sur 9 jours.
- Jusqu'en floraison S3 maximum.
- Checklist et rappels.

### Lumière (lot 5)
- DLI et calcul inverse, PPFD depuis les lampes, W/m², hauteur libre.
- Schéma de l'espace, grille 3×3 avec carte de chaleur.
- Cibles avec leur source.

### Climat et air (lot 5)
- VPD et cibles, renouvellement d'air.

## 7. Design
- La maquette est la référence n° 1.
- Tokens tirés de `npx getdesign add supabase`, adaptés au mobile, sans marque.
- Composants : shadcn/ui ; quelques effets 21st.dev / Magic UI / Aceternity ; Motion ; Lucide ; Fluent Emoji 3D (MIT).
- Très gros compteur pour le titrage.
- 8 couleurs d'espace accessibles.
- Deux thèmes, conception mobile d'abord.

## 8. Langues FR/EN
- Dictionnaires aux clés identiques (vérifié par un test), aucun texte en dur.
- Unités métriques.

## 9. Règles de contenu (non négociables)
- N'invente aucune valeur. Chaque chiffre affiche sa source : Athena (page), Bonorum, fabricant saisi, repère courant, estimation ou étiquette.
- Ne jamais inventer les caractéristiques d'un équipement.
- Ne jamais mélanger Pro Line et Blended (un test le vérifie).
- pH :
  - coco 5,8–6,2 ; floraison 5,9–6,3 en arrosage manuel (avec la source) ;
  - Fade et rinçage 6,0–6,4 ; clone 5,6 ; tourbe 6,0–6,4 ; mélange 70/30 estimé à 5,9–6,3.
- L'EC du substrat n'est pas l'EC de la solution.
- Cycle 1 : solution autour de 2,0–2,4.
- Rinçage coco sur 3 jours.

## 10. Lots et définition de « fini »
**Lots :**
- 1, 2a, 2b, 3 ✅
- **4** : Arrosage et Nutrition
- **5** : pH, IPW, Lumière, Climat
- **6** : Graphiques, exports et import, « Demander à Claude »
- **9** : tâche du matin + passe de finition
- *(validation par Thomas)*
- **7** : multi-marques et gamme perso complète
- **8** : version locale (assistant, PWA hors ligne, sauvegarde, .ics, Netlify relié à GitHub, guide)

**Un lot est fini quand :**
- les captures ont été comparées à la maquette ;
- les tests passent ;
- les captures existent à 390 px, en sombre et en clair, en FR et en EN ;
- la console ne montre aucune erreur ;
- une saisie prend moins d'une minute ;
- les écritures ont été vérifiées ;
- aucune régression n'est constatée ;
- le code est poussé sur `main` et `docs/etat-du-build.md` est à jour.

Si un lot est trop gros, le couper en a/b après avoir prévenu Thomas.

**Tests obligatoires du lot 4 :**
- Pro EC 2,0 → 57 + 34 mL à 226 g/L (114 + 69 à 113 g/L ; 46 + 27 à 282 g/L).
- Pro EC 3,0, bac de 100 L → 900 + 540 mL.
- Pro S8 → Fade 51, sans Core, pH 6,0–6,4.
- Blended végé S2, 50 L → Grow B et Grow A 145 mL chacun, CaMg 40–65, Cleanse 25–65, EC 2,1.
- Blended fl. S5, 10 L → Bloom B/A 26, PK 24, CaMg 8–13, EC 2,4.
- Blended S8 → PK 32, Fade 32, EC 1,5.
- Aucun mélange entre les gammes.
- Sac de 0,9 kg → 4,0 L ; stock de 4,0 L après 2 bidons Pro de 100 L à EC 3,0 → 2,2 L.
- Un bidon pour 3 espaces.
- Manuel Blended végé → EC du runoff 3,5–4,5.

**Lot 5 :**
- Balance 100 L → palier de 25 mL ; 3 paliers → 75 mL ; prédiction à partir de 2 bidons, départ à 80 %.
- IPW 2 L × 24 → 48 mL ; bloqué en S5.
- Schéma proportionnel.

**Lot 6 :**
- Export puis import JSON → données identiques.
- 20 espaces sur 2 ans restent fluides.

## 11. Décisions techniques
- React 19, TypeScript, Vite 8, Tailwind 4 ; build en un seul fichier HTML pour l'artefact.
- Les registres shadcn/magicui/21st.dev sont bloqués dans le shell : prendre le code sur GitHub.
- Recharts 3 via le composant Chart de shadcn.
- `date-fns` + `date-fns-tz`.
- Calculs dans des modules purs, testés avec Vitest ; moteur de nutrition générique ; registre de modules ; i18n maison.
- Modèle de données :
  - collections : `grow`, `sites`, `spaces`, `cycles`, `groups`, `plants`, `entries`, `events`, `mixes`, `reminders`, `concentrateStocks`, `sprays`, `customProducts`, `equipment`, `equipmentAssignments`, `settings` (+ `digest`) ;
  - un `schemaVersion` par document.
- Même format de sauvegarde JSON dans les deux versions.

## 12. Deux versions, un seul code
- `Storage` + `Capabilities`, `VITE_TARGET=claude|local`, tests de contrat communs.
- **Claude** :
  - capacités `db` (17 règles propriétaire), `user`, `assets`, `downloads`, `sample` (au clic) ;
  - tâche du matin.
- **Local** :
  - Netlify, PWA hors ligne ;
  - IndexedDB (Dexie), photos en Blob, `navigator.storage.persist()` ;
  - sauvegarde et import JSON, rappel tous les 7 jours ;
  - .ics ;
  - aucun compte, aucun serveur.
