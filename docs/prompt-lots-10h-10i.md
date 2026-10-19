# Prompts lots 10h et 10i : interface « instrument », palette harmonisée, allemand

À lancer dans Claude Code après les lots 10f et 10g (cochés), une seule session à la fois. 10h d'abord, puis 10i. Si un lot est trop gros, le couper (10h1, 10h2…).

Planches de référence (claude.ai, design « Hydro — typo & logo ») : https://claude.ai/artifact/KXiZWWzBwM65pYwCSGqC4Z, planches « Aujourd'hui, version instrument », « Composants, version instrument » et « Palette harmonisée ».

---

## Lot 10h : interface « instrument » et palette harmonisée

Consigne de Thomas : que l'app ne fasse plus « générée par une IA ». On remplace les composants génériques (pilules, cartes dans des cartes, boutons teintés) par un style d'instrument de mesure : traits fins, chiffres en avant, un seul bouton plein par écran.

0. Vérifie que 10f et 10g sont cochés dans `docs/etat-du-build.md`. Puis lance `git pull`, `npm ci` et `npm test`. Ajoute les lignes « [ ] Lot 10h » et « [ ] Lot 10i » dans l'état du build.

1. **Logo** : le point final de « hydro. » prend la couleur du texte (`currentColor`), et non plus le vert. La goutte et sa feuille ne changent pas.

2. **Palette harmonisée**. Couleurs calculées en OKLCH, même clarté et même saturation par famille. Remplace les tokens existants ; aucune couleur en dur dans les composants.
   - Sombre :
     - fond #0d1310, surface #131c18, trait #28302c ;
     - texte #eaf0ed, discret #9ca8a2 ;
     - eau #56d1a3, plante #aad56e, à surveiller #eeb154, alerte #ed7761.
   - Clair :
     - fond #f2f6f4, surface #ffffff, trait #d5dcd8 ;
     - texte #141d19, discret #56605b ;
     - eau #007653, plante #4f7715, à surveiller #a15b00, alerte #b2392b.
   - Règles d'usage :
     - La goutte du logo prend la couleur « eau » du thème. L'icône d'app garde #3ecf8e, sur un fond #0d1310 ou #101613.
     - « Eau » sert à tout ce qui touche à l'eau (arrosage, runoff, réservoir, EC/pH de la solution) et au bouton principal.
     - « Plante » sert au stade, à la croissance, à la récolte et aux cases cochées.
     - « À surveiller » et « alerte » ne colorent qu'un mot ou un petit repère, jamais une phrase entière : dans la carte du matin, les lignes en orange deviennent du texte normal avec un repère.
   - **Couleurs des espaces** : 8 teintes terreuses, sans aucun vert, pour qu'elles ne se confondent jamais avec « eau » ou « plante ».
     - Ordre : brique, cuivre, ocre, lagune, ardoise, lavande, prune, rose.
     - Sombre : #d49a99, #cea081, #bfa878, #74b8c0, #82b1d3, #9da8d8, #b89fcc, #cc99b5.
     - Clair : #8b5050, #865634, #785f28, #157079, #34698c, #565f91, #715685, #84506e.
     - **Migration obligatoire** : les espaces existants stockent un nom de couleur (`emerald`, `sky`…). Garder les mêmes 8 identifiants dans `SPACE_COLORS`, ou fournir une table de correspondance ancien → nouveau à la lecture. Aucune donnée existante ne doit perdre sa couleur ni planter.
     - Le marqueur d'espace devient un petit carré à coins arrondis (10 px, rayon 3) au lieu d'un rond.
   - Vérifier les contrastes : texte ≥ 4,5:1, graphismes ≥ 3:1, dans les deux thèmes. Le test existant de contraste, s'il y en a un, doit couvrir les nouveaux tokens.

3. **Boutons**
   - Rayons : 10 px pour les boutons et les champs, 14 px pour les rares blocs encadrés. La forme pilule est réservée aux filtres du Journal.
   - **Principal** : un seul par écran. Fond « eau », texte foncé, hauteur 48 px, graisse 600, ombre intérieure basse (`inset 0 -2px 0 rgba(0,0,0,.25)`). À l'appui, il descend d'1 px avec une ombre intérieure en haut.
   - **Secondaire** : contour 1 px (trait renforcé), fond transparent, texte normal. Plus aucun bouton à fond vert pâle teinté.
   - **Tertiaire** : texte souligné (soulignement « eau », décalage 4 px), par exemple « Continuer le guide ».
   - **Destructif** : texte souligné en couleur « alerte ».
   - **Étape du cycle** (« Passer en végé », « Passer en 12/12 », « Récolter ») : un bouton large à contour, avec à droite la conséquence en mono (« J1 floraison → »).
   - Les ronds verts « Fait » des rappels deviennent des **cases à cocher carrées** (22 px, rayon 6, couleur « plante »), dans des lignes de 48 px minimum.
   - Focus clavier : contour 2 px « eau », décalé de 2 px, sur tous les éléments interactifs.

4. **Champs de saisie « instrument »**
   - Libellé au-dessus. Pas de boîte grise : une ligne basse de 1,5 px, qui passe en « eau » au focus et en « à surveiller » en cas d'erreur, avec le message dessous.
   - Valeur en JetBrains Mono, en grand (environ 26 px). Unité dans le champ, à droite, en discret (°C, %, mS/cm, L).
   - Sous le champ, « hier 25,3 » en mono discret, plus le bouton « Copier les valeurs d'hier » prévu au lot 10d.
   - Sélecteurs de phase et choix exclusifs : un contrôle segmenté à cases jointes (contour commun, segment actif plein texte/fond inversés), au lieu d'une rangée de pilules.

5. **Lectures et cartes**
   - Les tuiles de valeurs deviennent des **lectures** :
     - libellé en petit ;
     - valeur en mono 30 px environ, unité en petit ;
     - en dessous, une barre fine (6 px) avec la zone cible en « eau » transparente et un trait vertical à la valeur du jour ;
     - la cible écrite en mono discret (« cible 3,5–6 ») ;
     - hors cible : trait et texte en « à surveiller » ou « alerte ».
     Utiliser les vraies cibles déjà calculées (`dayTargets`), rien d'inventé.
   - **Plus de cartes dans des cartes.** Les sections d'un écran sont séparées par un trait fin et un titre en Fraunces. Le cadre est gardé seulement pour les éléments vraiment à part (feuille modale, guide « Premiers pas »).
   - Les petits titres en capitales avec icône (« À VENIR », « RECETTE ») deviennent des titres en Fraunces, en casse normale.
   - **Carte du matin** : « Bonjour Thomas. » en Fraunces italique, puis 2 ou 3 phrases simples au lieu d'une liste à puces. Garder exactement les informations actuelles (stade, arrosage, réservoir, rappels), juste rédigées. Le texte envoyé par la tâche du matin ne change pas de contenu.
   - **Journal** : une ligne par jour, avec la date en mono à gauche, le résumé au centre et la valeur clé en mono à droite. Les hauteurs par plante sont regroupées sous la saisie du jour (lot 10d).
   - Filtre d'espaces du haut : des onglets texte soulignés (souligné « eau » de 2 px sur l'actif), au lieu de la barre de pilules.

6. **Barre d'onglets et bouton de saisie**
   - La barre d'onglets est **ancrée en bas**, pleine largeur, opaque (fond de page), avec un trait fin en haut et la marge de sécurité du téléphone. Elle ne flotte plus.
   - Le « + » de la saisie du jour est **intégré au centre de la barre** : bouton plein « eau », 52 × 44 px, rayon 12, avec un `aria-label` « Saisie du jour ». Il n'y a plus de bouton flottant qui recouvre le contenu.
   - Onglets : Aujourd'hui, Journal, « + », Graphiques, Outils.
   - **Le Calendrier reste accessible depuis l'écran d'accueil**, à la demande de Thomas :
     - **Bande de la semaine** en haut d'Aujourd'hui, sous les onglets d'espaces : 7 jours (lundi → dimanche).
       - Jour en Figtree, numéro en mono ; aujourd'hui souligné en « eau ».
       - Sous chaque jour, de petits repères pour ce qui est prévu : un repère par type (rappel, échéance, bidon), 3 au maximum.
       - Toucher un jour ouvre le Calendrier sur ce jour.
       - Flèches ou balayage pour la semaine précédente ou suivante.
       - Hauteur ≤ 64 px. Cibles tactiles de 44 px. `aria-label` par jour, avec la date et le nombre d'éléments.
     - **La date de la barre du haut** (« lun. 19 oct. ») est un bouton qui ouvre le Calendrier sur aujourd'hui.
     - **Retoucher l'onglet Aujourd'hui** quand on y est déjà ramène en haut de l'écran. Ce n'est pas un raccourci caché vers le calendrier.
     - En bas de la section « À faire », un lien texte « Tout le calendrier → ».
   - Le Calendrier n'a plus d'onglet propre : il s'ouvre depuis ces accès et depuis Outils (en haut de la liste). Ses liens profonds (`#calendar`) restent valides. Le retour depuis le Calendrier ramène à l'écran d'où on venait.
   - Les rappels du jour et à venir restent sur Aujourd'hui, dans la section « À faire ».

7. **Mouvement** : seulement les transitions d'écran courtes et les retours d'action (appui, case cochée, toast). `prefers-reduced-motion` est respecté.

8. **Fin de lot** (règles de `CLAUDE.md`)
   - Tests verts.
   - Captures FR/EN, clair et sombre, à 390 px et à 360 px, avec le zoom 200 % sur la saisie.
   - README mis à jour.
   - CHANGELOG et état du build dans le même commit.
   - Push sur `main` **sans** `[deploy]`.
   - Republication de l'artefact sans redéclarer les capacités.

---

## Lot 10i : allemand

Ajoute l'allemand (`de`) comme troisième langue, à côté du français et de l'anglais.

1. `src/i18n/de.ts`, avec exactement les mêmes clés et les mêmes variables que `fr.ts`. Étendre le test de parité aux trois langues. Le type `Lang` devient `"fr" | "en" | "de"`.
2. Traduire tout, sur le ton de l'app : phrases courtes et tutoiement (« du »).
   - Vocabulaire de culture courant en allemand : Blüte, Wachstum, Steckling, Runoff, Dryback, EC, pH, VPD, DLI, PPFD.
   - Les noms de produits (Pro Grow, Pro Bloom, Pro Core, Fade, Cleanse, Balance, IPW, Proper, Great White) ne se traduisent pas.
   - Les sources (« Handbook p. 37 ») restent comme en anglais.
3. Formats : nombres avec virgule décimale (`de-DE`), dates « 19.10. » et « 19. Okt. », semaine « KW » si l'app l'affiche, `date-fns/locale/de` pour les noms de jours et de mois. Calendrier (premier jour lundi), export .ics et CSV : séparateur `;` et virgule décimale, comme en français.
4. Sélecteur de langue (barre du haut et Réglages) : FR / EN / DE. `parseSettings` accepte « de ». L'assistant de démarrage propose aussi l'allemand. La langue du téléphone est détectée au premier lancement si c'est de l'allemand.
5. Carte du matin : `texts` contient aussi « de ». La tâche du matin de Thomas continue d'envoyer le français.
6. Noms générés (équipement de l'assistant, cycles par défaut) : traduits à la création selon la langue choisie. Les données déjà enregistrées ne sont jamais renommées.
7. Vérifier que rien ne déborde à 360 px : l'allemand est plus long, surtout les libellés d'onglets et les boutons. Raccourcir les libellés si besoin, sans couper les mots.
8. Fin de lot : mêmes règles que 10h, avec en plus des captures en DE.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
