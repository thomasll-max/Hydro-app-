# Prompt lot 10l : page d'un espace et saisie du jour, version calme

À lancer dans Claude Code **juste après le lot 10k** (coché), une seule session à la fois, avant les lots 11 et 12. Découpé en 10l1 (page d'un espace) et 10l2 (saisie du jour), un commit par sous-lot.

Planche validée par Thomas le 19/10/2026 : « Les menus, un par un », https://claude.ai/artifact/T2JmTqXVjvWPVhgSjdwuCC (sections « Page d'un espace » et « Saisie du jour »). Les règles « calme » et la typographie du lot 10k s'appliquent (Geologica pour titres et chiffres, Figtree pour le texte, Fraunces seulement dans le logo, plus de JetBrains Mono, chaque chiffre une seule fois, un seul bouton plein).

---

## 10l1 : page d'un espace (onglet d'un espace sur Aujourd'hui)

0. `git pull`, `npm ci`, `npm test`. Ajoute « [ ] Lot 10l1 » et « [ ] Lot 10l2 » sous « Lot 10l » dans l'état du build et remplace « prompt à venir » par `docs/prompt-lot-10l.md`.
1. **En-tête** : carré teinté de la couleur de l'espace (48 px, rayon 13) avec le dessin du stade ; nom en Geologica (≈ 28 px) ; dessous en petit « Cycle 2 · Melonade Runtz » (cycle et variété(s)) ; **à droite, une pilule d'état** avec le stade (« Végé S6 · J41 », couleur « plante »).
2. **Bloc d'état encadré** (le seul cadre mis en avant de la page) :
   - une ligne : carré de 32 px avec une coche « plante » si tout est dans la cible, ou un repère « à surveiller » / « alerte » sinon ; titre (« Tout est dans la cible » ou la correction à faire, déjà calculée par l'app) ; dessous en petit « Rien à corriger · saisie du 07/02 » ;
   - juste en dessous, **dans le même bloc**, le bouton d'étape du cycle à contour : à gauche l'action (« Passer en 12/12 », « Passer en végé », « Récolter »), à droite en discret le délai (« dans 2 j », « aujourd'hui ») et un chevron. **Plus de texte de conséquence** (« J1 floraison → ») : Thomas le trouve inutile et il chevauchait le reste ;
   - s'il n'y a pas d'étape proche, le bouton n'apparaît pas.
3. **Relevés** : titre de section avec à droite, en petit, la date de la saisie et « Graphiques → ». **Quatre** lectures en grand (2 × 2) avec barre de cible : dryback (ou dryback capteur selon la méthode, sans cible Athena), EC runoff, runoff %, pH runoff. Le reste en **une ligne** : « VPD 0,96 · EC entrée 3,0 · DLI 31 · 25°/59 % ». Espaces sans arrosage (séchage) : T°, HR, VPD, jour de séchage.
4. **Arrosage du jour** (si le module est actif) : titre avec « Programme → » à droite ; deux lignes seulement : « ✓ P1 · 5/5 doses faites » et « 11:20 prochaine dose · P2 1/4 · 450 mL ». La liste complète des doses passe dans l'outil Arrosage (lien « Programme → »).
5. **Réservoir** : barre de remplissage, « 33 L sur 120 L », puis « ≈ 2 j · 12,5 L/jour, estimé » (en « à surveiller » sous le seuil d'alerte existant).
6. **À faire ici** : lignes de tâche normales (case à cocher 22 px à gauche, titre, date en petit à droite sur la même ligne, 52 px de haut), 3 au maximum, puis « Tout le calendrier → ».
7. **Sources** : une seule ligne discrète en bas.
8. Ordre fixe : en-tête, état, relevés, arrosage, réservoir, à faire, sources. Une section sans objet pour l'espace disparaît. **Le résumé « Bonjour » n'apparaît pas sur la page d'un espace.**

## 10l2 : saisie du jour (feuille ouverte par le « + »)

1. **En-tête** : poignée, titre « Saisie · Floraison » (Geologica ≈ 24 px), ×. Dessous **une seule ligne** : « dim. 8 févr. · 08:30 modifier · tout l'espace ▾ ». « modifier » ouvre date et heure ; « tout l'espace ▾ » ouvre le choix de l'espace et de la plante (P1, P2…). L'espace vient de l'onglet ouvert. Les deux champs date/heure, le sélecteur d'espace et la rangée P1–P4 actuels disparaissent de la vue principale.
2. **Bande des résultats calculés**, collée sous l'en-tête et visible pendant le défilement : dryback, runoff, VPD, DLI (ceux qui ont un sens pour l'espace). Calculés en direct pendant la frappe, couleur « plante » dans la cible, « à surveiller » hors cible, « — » tant qu'il manque une valeur.
3. Deux boutons secondaires côte à côte : **« Reprendre hier »** (remplit tous les champs avec la veille, comme « Copier les valeurs d'hier ») et **« Dicter »** (emplacement réservé : il n'apparaît qu'avec le lot 11 ; jusque-là, « Reprendre hier » prend toute la largeur).
4. **Ordre des champs** (style « instrument » du 10h, chiffres en Geologica) :
   1. **Arrosage** (cible dryback à droite du titre) : pot matin, pot pic, runoff du pot (ou les champs capteur selon la méthode de l'espace) ;
   2. **Runoff** (cible pH à droite) : EC runoff, pH runoff ;
   3. **Climat** : T° jour, T° nuit, HR (3 colonnes) ;
   4. **une ligne repliée** « Plante, réservoir, réglages » qui contient hauteur, reste du réservoir et les réglages repris de la veille ;
   5. **Ce que tu as vu ou fait** : observations puis actions, les 4 plus utilisées de chaque visibles (selon l'historique de l'utilisateur, sinon l'ordre actuel), les autres derrière « +N » ; la gravité des observations reste réglable comme aujourd'hui ; puis **une seule ligne** « Une note, une photo… » qui ouvre la note et l'ajout de photo.
5. **Valeurs de la veille** : affichées en **fantôme** dans le champ (couleur très discrète) tant qu'elles ne sont pas reprises ; toucher une valeur fantôme la reprend seule ; une valeur reprise ou tapée s'affiche normalement. La phrase d'explication grise actuelle disparaît. « hier 25,4 » reste en petit sous le champ. Rien n'est enregistré s'il n'a pas été tapé ou repris (règle actuelle inchangée).
6. **Bas de la feuille** : un seul bouton plein « Enregistrer », pleine largeur. Le bouton « Rappel » passe dans un menu « ⋯ » de l'en-tête (avec « Supprimer cette saisie » quand on modifie une saisie existante).
7. La saisie rapide « tous les espaces » garde son fonctionnement, avec le même style.
8. Accessibilité : la bande des résultats est annoncée (`aria-live="polite"`) ; zoom 200 % sans débordement ; cibles tactiles de 44 px.

## Tests

- Choix des 4 observations/actions les plus utilisées (historique vide, égalités).
- Reprise d'une valeur fantôme seule et « Reprendre hier » : rien d'enregistré sans action de l'utilisateur.
- Bande des résultats : calcul en direct, « — » si une valeur manque, couleurs selon `dayTargets`.
- Page d'un espace : sections masquées selon les modules (séchage, sans arrosage), méthode capteur.
- Simulation d'un an sans plantage.

## Fin de chaque sous-lot (règles de `CLAUDE.md`)

- Tests verts.
- Captures FR/EN/DE, clair et sombre, 390 et 360 px, zoom 200 % sur la saisie, à comparer avec la planche.
- README, CHANGELOG et état du build dans le même commit.
- Push sur `main` **sans** `[deploy]`.
- Republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
