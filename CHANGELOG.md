# Changelog

## Lot 15b — Les valeurs absurdes ne passent plus (20/10/2026)
- **Toute saisie** (saisie du jour, saisie rapide, dictée) a maintenant les plages plausibles de la dictée : pH 3–9, EC 0–6 (EC runoff 0–15), T° 5–40, HR 10–100, pot 0–50 kg, hauteur 0–400 cm… Hors plage : « Hors plage : entre 3 et 9. » sous le champ, la page y va, et l'enregistrement attend la correction (pas de case « forcer »).
- **Pot pic plus léger que le matin** : « Le pic doit être plus lourd que le matin : inversés ? » sous les deux champs, et le dryback n'est pas calculé.
- **Bidons** (« Nouveau bidon » et l'outil Nutrition) : volume 1–2 000 L, EC 0–6, pH 3–9, avec le même message sous le champ.
- Le **dryback, le VPD, le DLI et le runoff %** ne s'affichent plus jamais hors de ce qu'ils peuvent valoir : sinon « — » et un « ? » qui dit « valeur impossible avec ces mesures ».
- **Ce qui a déjà été enregistré** n'est pas effacé, mais une valeur hors plage est marquée « Valeur douteuse, hors des calculs » dans le Journal et n'entre plus dans les moyennes, les verdicts de la semaine, les bilans, les graphiques ni « Maintenant ». La corriger dans la saisie suffit.
- 498 tests.

## Lot 15a — Créer son premier cycle sans tourner en rond (20/10/2026)
- **Sans espace**, Aujourd'hui propose d'abord **« Créer un espace »** (dans « Maintenant » et sous « Espaces ») : son nom et son modèle, puis la feuille du premier cycle s'ouvre toute seule, rangée dans ce nouvel espace.
- La feuille **« Nouveau cycle »** montre toujours le **choix de l'espace** (l'espace ouvert, ou le seul). S'il n'y a encore aucun espace, elle le crée dans la même feuille. Un cycle ne peut plus être enregistré sans espace.
- Un cycle déjà créé sans espace s'affiche sur Aujourd'hui : « Cycle sans espace : choisir son espace ». Rien n'est perdu, rien n'est renommé.
- **Assistant, étape « Premier cycle »** : les **pots sont facultatifs** (comme dans la feuille) ; la **date de départ est obligatoire** partout, avec le même texte. Une date à venir est acceptée : le cycle reste « À venir » jusque-là.
- **Chaque erreur s'écrit sous son champ**, en couleur « à surveiller », et la page défile jusqu'à lui en lui donnant le focus (même dans une partie repliée de la feuille). Plus de message seulement en bas de page. Les formulaires qui refusaient un nombre mal tapé font de même.
- 494 tests.

## Correctif — la bannière « Nouvelle version disponible » ne cache plus rien (20/10/2026)
- Dans l'app installée, la bannière de mise à jour flottait par-dessus le haut de l'écran et pouvait prendre le toucher de « Y aller » (Premiers pas) ou des onglets d'espace. Elle se place maintenant sous la barre du haut et pousse le reste vers le bas.

## Correctif — dictée sur la version des potes (20/10/2026)
- Sur le site Netlify, le navigateur refusait le micro à l'app : la dictée n'aurait pas pu écouter. C'est corrigé (le micro est autorisé pour Hydro seulement).

## Lot 14b — Stack, Proper, Cuts (20/10/2026)
- **Stack** (Athena, avec Pro Line ou Blended, à activer dans les add-ons) : **dans le bidon** (ajouté en dernier), **à la main** ou **en pulvérisation**, une fois par semaine, de la dernière semaine de végé à la floraison S3. Les doses de la page officielle sont en mL par gallon : l'app montre l'unité d'origine et la valeur convertie en mL/L. Après la floraison S3, la pulvérisation est refusée avec la raison. Il peut aller dans le même pulvérisateur que l'IPW. Un rappel chaque semaine est proposé, jamais créé tout seul.
- **Proper** et **Cuts** (Cuts en Blended, pour les boutures) : proposés dans « Produits perso », « dose non publiée par Athena : saisis celle de ton étiquette ». Tant que la dose est vide, ils n'entrent dans aucune recette.
- La fiche Athena a une nouvelle section « Compléments hors Handbook » avec les sources.
- 488 tests.

## Lot 14a — Blended partout et choix de la gamme (20/10/2026)
- **Athena Blended** est maintenant proposée aussi dans la version Claude, à côté de la Pro Line. Les deux gammes ne se mélangent jamais.
- **Choix de la gamme** dans Réglages, la fiche d'un espace et l'assistant de démarrage : Pro Line, Blended ou ta propre marque, avec une ligne d'explication sous chaque choix.
- Changer de gamme en cours de cycle demande d'abord : les bidons déjà faits gardent leur gamme, les graphiques ne relient jamais un bidon Pro à un bidon Blended.
- **Repères** : le programme Blended (p. 58) et son arrosage manuel (p. 60) à côté des tableaux de la Pro Line.
- En allemand, les cases des 13 phases Blended ne coupent plus « Vorwässern ».
- 478 tests.

## Lot 13 — Sources discrètes et page « À propos » (20/10/2026)
- **Plus de lignes « Sources : … »** sous les outils et les écrans. À la place, un **petit ⓘ** à côté du titre (Arrosage, Nutrition, pH / Balance, Pulvérisation, Lumière, Climat, Repères, le calendrier, et « Relevés » sur la page d'un espace) : il dit d'où viennent les chiffres, une source par ligne, puis « Toutes les sources → ».
- Ce qui change la lecture d'un chiffre reste visible à côté de lui : « estimation », « débit à mesurer », « perso, non vérifié », « échelle capteur ».
- **Page « À propos »** (Réglages, dernière ligne, ou le menu de l'engrenage) : la version, sur quoi Hydro s'appuie (Athena Handbook avec ses pages, le mode capteur d'après le guide de Bonorum, les formules, les repères courants, ce que tu saisis), les crédits techniques avec leurs licences, un avertissement et la vie privée (ce qui reste où, ce qui part vers Claude et quand).
- Le mode capteur ne dit plus rien du tableau de Bonorum : « Durées calculées avec la formule volume ÷ débit. » Les noms de source quittent les libellés : « Repères Athena » devient « Repères ». Les noms des produits Athena restent.
- 468 tests.

## Correctif — « Ajouter une photo » (20/10/2026)
- Le bouton « Ajouter une photo » de Demander à Claude ne s'ouvrait pas dans l'app Claude : toucher le bouton ouvre maintenant directement le choix de la photo (appareil photo ou galerie). Même chose pour la photo de la saisie du jour.
- Outils : l'icône de Variétés est neutre, comme les autres outils de « Mon installation » (seuls les outils d'arrosage et de réglage de la pièce sont en couleur).

## Lot 12d — Verrou (20/10/2026)
- **Réglages → Verrouiller l'app** : un PIN de 4 à 6 chiffres, demandé à l'ouverture et quand tu reviens après 1, 5 ou 15 minutes ailleurs. Le PIN n'est jamais gardé en clair.
- Cinq erreurs : 30 secondes d'attente, puis deux fois plus à chaque nouvelle erreur.
- **Dit honnêtement** : c'est un écran de confidentialité, pas un chiffrement.
- Dans l'app installée (version des potes), l'empreinte ou le visage peut remplacer le PIN. Dans l'artefact : le PIN seul.
- **PIN oublié** : la seule issue est « Réinitialiser l'app », qui efface tout. À la création du PIN, l'app te le dit et te propose une sauvegarde tout de suite.
- 456 tests.

## Lot 12c — Fiche variété et photo pour Claude (20/10/2026)
- **Outils → Variétés** : chaque variété de ta grow, avec **tes notes** (phénotypes, comportement, odeur, stretch ; une info du breeder seulement comme note, avec sa source), **ses cycles** (poids sec par plante, floraison réelle, lien vers le bilan) et **la frise de ses photos**. Rien qui vienne d'une base publique : seulement ce que tu as vécu.
- Les noms de variété mènent à leur fiche (bilan, cycle, plante). Une variété écrite de deux façons (« Blue Zushi » / « blue zushi ») est regroupée, et l'app propose de **fusionner** les orthographes ; rien n'est renommé sans toi.
- **Une photo pour Claude** (version Claude) : « Ajouter une photo » dans Demander à Claude, ou « Demander à Claude » sur une photo de la galerie. Claude décrit ce qu'il voit, le relie à tes mesures et propose des pistes, sans jamais présenter un diagnostic comme certain ; il dit quand la photo ne suffit pas. L'autorisation d'envoyer des images a été ajoutée avec ton accord : claude.ai te la redemande à la prochaine question.
- 449 tests.

## Lot 12b — Galerie photo et frise (20/10/2026)
- **Photos**, en haut du Journal : toutes tes photos regroupées par semaine du cycle (« Floraison S3 »), avec la date sur chaque vignette. Filtres par espace, cycle, plante et étiquette.
- **Une photo en grand** : balaye à gauche ou à droite pour passer à la suivante ; dessous, les valeurs et la note de ce jour-là.
- **Étiquettes de photo** : les observations du Journal, et tes propres étiquettes (« stretch », « trichomes », « racines »…), proposées ensuite. Depuis la photo en grand, ou dès la prise de photo dans la saisie.
- **La frise** : une photo par semaine pour un cycle ou une plante, l'une après l'autre avec un curseur. Le « time-lapse », sans montage. « Photo de la semaine » choisit celle qui représente sa semaine.
- Les miniatures sont faites une fois et gardées : la galerie reste rapide avec 300 photos. Une photo qui manque sur l'appareil (sauvegarde partielle) l'annonce au lieu d'une case vide.
- 441 tests.

## Lot 12a — Bilan de récolte et comparaison de cycles (20/10/2026)
- **Le bilan d'un cycle récolté**, ouvert depuis le Journal (« Bilan » sur la ligne du cycle), Réglages → cycles ou la carte de la dernière récolte. Rien de nouveau à saisir : tout vient de ce que l'app a déjà.
  - **Résultat** : poids sec et humide, g par watt (la puissance de la récolte, sinon les lampes de l'espace), g par plante, g par m². Sans donnée : « donnée manquante », jamais d'estimation.
  - **Calendrier** : germination, végé, 12/12, récolte, durée de chaque étape, floraison réelle contre prévue, jours de séchage.
  - **Conduite** : par étape, la moyenne, la plage et la part des jours dans la cible du jour pour l'EC, le pH, le dryback (pesée et capteur séparés), le runoff, la T°, l'HR, le VPD, le PPFD et le DLI.
  - **Bidons** (nombre, litres, produits consommés), **incidents** par semaine, **dégustation et notes**.
- **Poids sec par plante** (facultatif) dans la saisie de récolte. La somme ne remplace jamais le poids sec saisi : un écart s'affiche tel quel. Et une **note de bilan**.
- **Comparer avec…** : un autre cycle récolté, filtré par variété ou par espace ; deux colonnes, l'écart à droite.
- **Export** : CSV (pour un tableur) et une version imprimable.
- 431 tests.

## Lot 11b — Dicter sans IA (20/10/2026)
- **« Dicter » aussi dans la version des potes** (Netlify, version locale), sans IA ni clé : même panneau, même micro. L'app reconnaît les mesures simples, en français, anglais ou allemand, en chiffres ou en toutes lettres : « EC runoff 4,2 », « pH cinq neuf », « runoff 380 ml », « température vingt-cinq », « humidité 60 % », « poids matin 4,2 », « EC Zulauf 3,0 »…
- **Toujours à relire** : la saisie s'ouvre remplie, rien n'est enregistré avant « Enregistrer ». Ce qui n'est pas une mesure va dans la note, avec tes mots.
- **Rien de deviné** : « pH 59 » (hors plage), « EC deux huit » (2,8 ou 28 ?), « runoff 15 » sans unité deviennent des doutes, rien n'est rempli. Une EC ou un pH dit sans « runoff » ni « entrée » est mis dans la solution et marqué « à vérifier ». « VPD », « DLI », « dryback » et « runoff 15 % » sont calculés par l'app : ils restent dans la note.
- 414 tests.

## Lot 11a — Dicter le journal à Claude (20/10/2026)
Demande de Thomas : « lâcher toutes les infos à Claude en lisant mes résultats ».
- **« Dicter »** en haut de la saisie du jour (version Claude), à côté de « Reprendre hier » : un panneau avec une grande zone de texte et, si le navigateur le permet, un bouton **« Écouter »** qui écrit ce que tu dis au fur et à mesure, en français, anglais ou allemand. Sans micro dans le navigateur, le micro du clavier du téléphone fait la même chose dans la zone de texte.
- **« Remplir le journal »** : Claude lit ta dictée et remplit **seulement** ce que tu as dit, dans les champs de l'espace ouvert (ou de l'espace que tu nommes). Dryback, % de runoff, VPD et DLI restent calculés par l'app. Ce qui n'a pas de champ va dans la note, avec tes mots.
- **Tout seul quand c'est clair** : la saisie est enregistrée tout de suite (fusionnée avec celle du jour), et le toast « Journal rempli : 4 valeurs · Annuler » reste 10 secondes ; « Annuler » remet la saisie exactement comme avant.
- **Quand il y a un doute** (« pH 59 », un espace pas clair, une valeur hors plage) : rien n'est enregistré, la saisie s'ouvre remplie, le champ douteux est marqué en orange avec ce qui a été entendu. Tu corriges, tu enregistres. Le réglage **« Relire avant d'enregistrer »** fait toujours passer par là.
- Un **bidon** dicté (« bidon de 40 L, EC 2,9, pH 5,8 ») crée ou complète le bidon du jour, seulement si tu dis bien « bidon ».
- La saisie garde **ta dictée** à part de la note, visible dans le détail du jour.
- 406 tests.

## Lot 10l2b — « Ce que tu as vu ou fait » et saisie rapide (20/10/2026)
- Observations et actions dans une seule section, **« Ce que tu as vu ou fait »** : tes 4 observations et tes 4 actions les plus utilisées d'abord (d'après tes saisies), les autres derrière « +4 ». La gravité se règle toujours en touchant plusieurs fois.
- Une seule ligne **« Une note, une photo… »** ouvre la note et les photos.
- **La saisie rapide** prend le même style : la date derrière « modifier », les valeurs d'hier en fantôme (un toucher en reprend une), un titre par espace.
- 393 tests.

## Lot 10l2a — La saisie du jour, plus calme (20/10/2026)
Planche « Les menus » : la saisie tient sur un écran qu'on lit de haut en bas.
- **En-tête** : « Saisie · Floraison », et une seule ligne « dim. 8 févr. · 08:30 modifier · tout l'espace ▾ ». La date, l'heure, le choix de l'espace et des plantes ne s'ouvrent que si tu les touches. « ⋯ » en haut à droite : « Enregistrer et ajouter un rappel », et « Supprimer cette saisie » quand tu en modifies une.
- **Les résultats en direct**, collés sous l'en-tête pendant que tu descends : dryback, runoff, VPD, DLI, calculés pendant la frappe, en vert dans la cible, en orange hors cible, « — » tant qu'il manque une valeur.
- **Les valeurs d'hier en fantôme** dans les champs : touche un champ pour reprendre sa valeur seule (tu peux taper par-dessus), ou **« Reprendre hier »** pour toutes les reprendre. Rien n'est enregistré que tu n'aies tapé ou repris.
- **Dans l'ordre** : Arrosage (avec la cible de dryback), Runoff (avec la cible de pH), Climat sur trois colonnes, puis une ligne repliée « Plante, réservoir, réglages ». En bas, un seul bouton « Enregistrer ».
- 390 tests.

## Lot 10l1 — La page d'un espace, version calme (20/10/2026)
Planche « Les menus » validée par Thomas : chaque information de l'espace a sa section, une seule fois, dans un ordre fixe.
- **En-tête** : le carré de la couleur de l'espace avec le dessin du stade, le nom en grand, « Cycle 2 · Melonade Runtz » dessous, et le stade dans une pilule verte à droite (« Végé S6 · J41 »).
- **Un seul bloc encadré** : le verdict de la dernière saisie (« Tout est dans la cible · Rien à corriger · saisie du 07/02 », ou la correction déjà calculée par l'app, en orange ou en rouge), et dedans le **bouton d'étape** à contour : « Passer en 12/12 » à gauche, « dans 2 j › » à droite. Le texte « J1 floraison → » disparaît. Le bouton n'apparaît que si l'étape est proche (dans la semaine, ou sans date prévue pour la végé et le 12/12) ; la récolte se propose dans sa dernière semaine, et se note toujours depuis le cycle.
- **Relevés** : « 07/02 · Graphiques → » à droite du titre, **quatre** lectures en grand avec leur barre de cible (dryback ou dryback capteur, EC runoff, runoff, pH runoff), le reste sur une ligne : « VPD 0,96 · EC entrée 3,0 · DLI 31 · 25° / 59 % ». Sans saisie, les quatre lectures montrent « — » avec la cible du jour.
- **Arrosage du jour** en deux lignes : « ✓ P1 · 5/5 doses faites » et « 11:20 prochaine dose · P2 1/4 · 450 mL ». Toute la liste est dans l'outil Arrosage (« Programme → »).
- **Réservoir** : une barre, « 33 L sur 120 L », « ≈ 2 j · 12,5 L/jour · estimé » (orange sous le seuil d'alerte).
- **À faire ici** : trois tâches au plus, sans répéter l'étape du bloc ni le nom de l'espace, puis « Tout le calendrier → ».
- Les sources sur une ligne en bas. Un séchoir montre T°, HR, VPD et le jour de séchage (« J7/10 ») ; un espace de propagation, sa levée et son dôme.
- 384 tests.

## Lot 10k4 — Graphiques calmes (19/10/2026)
- Les 17 pilules disparaissent : **des vues toutes prêtes** en onglets sous le titre : **Arrosage** (dryback, dryback capteur s'il y en a, runoff, EC runoff), **Solution** (EC et pH entrée, pH runoff, Balance), **Climat** (T°, HR, VPD), **Lumière** (PPFD, DLI), **Plante** (hauteur, levée). Une vue sans aucune donnée pour l'espace n'apparaît pas.
- **La période sur une ligne** : 7 j · 30 j · Cycle · Tout, et à droite **« Comparer… »** : une feuille pour mettre jusqu'à 4 espaces sur les mêmes graphiques. L'espace suit l'onglet du haut.
- **Chaque graphique dit l'essentiel** : son nom, la cible et l'unité à gauche, **la dernière valeur en grand** à droite (orange si elle sort de la cible). Toucher un jour affiche ses valeurs sur tous les graphiques ; le toucher encore revient à la dernière.
- **Des lignes qui ne mentent pas** : segments droits entre les mesures (plus de courbe lissée), un jour sans mesure relié en pointillé, la ligne ne s'arrête qu'après plus de 7 jours sans mesure. La bande de cible du jour derrière, les points hors cible en orange, chaque bidon en trait vertical pointillé, la courbe à la couleur de l'espace.
- **La légende tient en une ligne** ; les phrases d'explication et la liste d'événements sous les graphiques disparaissent (les événements sont dans le Journal).
- **« Choisir mes courbes »**, en bas : la liste complète dans une feuille ; ton choix devient la vue **« Perso »**, qui peut aussi être superposée sur un seul graphique. Tes anciens réglages deviennent « Perso ».
- 377 tests.

## Lot 10k3c — La page d'une semaine (19/10/2026)
- « Voir la semaine → », le résumé d'une semaine ouverte ou un jour de la bande ouvrent **la page de la semaine** : « Végé S6 · 2–8 févr. · 5 saisies · comparée à Végé S5 ».
- **Le verdict d'abord**, calculé seulement à partir des cibles enregistrées : « Bonne direction » ou « À surveiller », ce qui est hors cible avec la date, ce qui est revenu dans la cible.
- **Une ligne par valeur clé** (dryback, runoff, EC et pH runoff, VPD ; en séchage T°, HR, VPD) : la cible, une mini-courbe des 7 jours sur la bande de cible, la moyenne, la semaine d'avant et le nombre de jours dans la cible.
- **Une carte par jour** avec quatre valeurs ; la toucher ouvre la saisie pour la corriger.
- 370 tests.

## Lot 10k3b — Le Journal par semaines (19/10/2026)
- Une **carte par semaine** du cycle (« Végé S6 · 2–8 févr. »), repliée sauf la semaine en cours. En vue « Tous », une carte par semaine et par espace.
- Dans chaque carte, la **bande des 7 jours** : vert clair quand la saisie est dans la cible, orange quand une valeur sort de la cible, pointillé sans saisie, contour pour aujourd'hui, un petit point quand il y a un bidon, une action ou un événement. Toucher un jour ouvre la page de la semaine sur ce jour.
- La semaine ouverte ne montre que **les jours qui comptent** (alerte, bidon, action, observation, note, événement), chacun avec sa petite icône ; les autres tiennent en « + 2 jours sans souci ».
- En haut, sur une ligne : le **cycle** (Cycle 2, Cycle 1…), la **loupe** (cherche dans les notes, observations et actions) et les **filtres**.
- Les tiroirs « Événements · Bidons · Récolte » disparaissent : bidons et événements sont dans leur semaine. « Modifier le cycle », « Récolte » et « Plantes » restent en bas.
- Livré avec la page d'une semaine (10k3c).

## Lot 10k3a — Le « + » ouvre un petit menu (19/10/2026)
- Le « + » de la barre du bas ouvre une petite feuille : **Saisie du jour**, **Saisie rapide** (tous les espaces), **Nouveau bidon**, **Événement**.
- Les trois gros boutons du haut du Journal disparaissent.
- 359 tests.

## Lot 10k2b — Pulvérisation : IPW ou ton propre mélange (19/10/2026)
- L'outil IPW devient **Pulvérisation**, avec deux choix : **IPW Athena** (le protocole sourcé, inchangé) ou **Mon mélange**.
- **Mon mélange** : un spray maison ou un stack que tu décris toi-même : son nom, tes produits avec leur dose par litre (telle que tu la saisis), sa fréquence, tes points à vérifier avant de pulvériser et des notes. Il est marqué « perso, non vérifié » : l'app ne propose aucune dose, elle calcule seulement les quantités pour ton pulvérisateur.
- Tes produits perso peuvent être repris par leur nom (jamais leur dose, faite pour le bidon).
- La pulvérisation s'enregistre comme pour l'IPW, avec sa checklist, et la prochaine arrive dans le calendrier et sur Aujourd'hui quand une fréquence est donnée.
- 357 tests.

## Lot 10k2a — Outils en trois groupes (19/10/2026)
- Outils se range en trois groupes : **Chaque jour** (Nutrition, Arrosage, pH, Calendrier), **Régler la pièce** (Lumière, Climat, Pulvérisation) et **Mon installation** (Équipement, Repères Athena, Sauvegarde).
- Des mots simples sous chaque outil (« La recette du bidon », « Doses et horaires du jour », « Combien de Balance verser »…) ; le jargon reste dans l'outil.
- Icônes au trait colorées par sujet : couleur « eau » pour le bidon et l'arrosage, « plante » pour la pièce.
- Premiers pas et Réglages quittent la liste : ils sont dans l'engrenage en haut (qui gagne « Premiers pas → »). La phrase « Calculs testés… » disparaît.
- 353 tests.

## Lot 10k1b — Aujourd'hui calme (19/10/2026)
Constat de Thomas : « plein d'infos éparpillées, ça donne mal à la tête ». Aujourd'hui suit maintenant la planche validée : un seul endroit où poser le regard.
- **« Bonjour Thomas. »** devient le titre de l'écran.
- **Maintenant** : un seul bloc encadré, avec le seul bouton plein. Il dit la chose la plus importante, dans cet ordre : une valeur hors cible dans la saisie d'hier ou d'aujourd'hui (avec la correction de l'app), la saisie du jour pas encore faite (après l'allumage), une échéance du jour ou en retard, sinon « Tout est à jour ». En dessous : « Ensuite : passer en 12/12 · dans 2 j ».
- **À faire** : trois tâches au plus, puis « + 2 autres · Tout le calendrier → ».
- **Espaces** : une ligne par espace, avec son carré de couleur, son stade et un seul état (« dans la cible », « bidon ≈ 1 j », « 19° · 61 % », « pas de cycle »…). Toucher la ligne ouvre l'espace.
- **Premiers pas** : un bandeau fin tout en haut, fermable, avec une barre de progression et « Y aller » qui ouvre l'étape suivante. La sauvegarde devient une ligne de « À faire » quand elle est due.
- **Retirés** : la bande de la semaine (le calendrier s'ouvre par la date en haut et « Tout le calendrier → »), le résumé en lignes, les cartes d'espace à quatre relevés (ils sont dans la page de l'espace). Le résumé du matin envoyé à 9 h ne change pas.
- **Petits dessins** seulement sur les espaces, « Maintenant » et le bandeau : plus sur les titres de section (Journal, Graphiques, Réglages, Calendrier) ni sur les relevés.
- 350 tests.

## Lot 10k1a — Typographie droite (19/10/2026)
Retour de Thomas : les titres en Fraunces « mous » ne lui plaisent pas, et les chiffres en police code s'intègrent mal (chasse trop large, « 38  % » espacé, deux familles mélangées).
- **Titres** en Geologica 700, droits et serrés (choix de Thomas parmi cinq polices) : titres d'écran, de section, de carte, « Bonjour Thomas. ».
- **Chiffres** en Geologica à chasse fixe (ils restent alignés), l'unité plus petite et plus discrète, collée par une espace fine : « 38 % », « 4,0 ». Plus de JetBrains Mono du tout.
- **Fraunces** reste seulement dans le logo « hydro. » et l'écran de démarrage. Le texte courant reste en Figtree.
- 344 tests.

## Lot 7b — Produits « à la main » (19/10/2026)
- Chaque produit perso se donne **dans le bidon**, **à la main** (arrosoir) ou **sur les racines** (une fois au transfert, comme avant).
- Les produits « à la main » ne comptent jamais dans la recette ni dans l'EC du bidon : ils sont listés dessous, dans « À la main, si tu veux », avec leur dose par litre d'arrosoir. Pas de fréquence ni de rappel automatique : un bouton « Ajouter un rappel » si tu en veux un.
- Pareil avec Athena : tes produits perso restent possibles (« hors Athena, non vérifié »), dans le bidon ou à la main.
- Une ligne d'aide dans le formulaire : les produits organiques (enzymes, sucres, extraits) plutôt à la main, ils peuvent boucher les goutteurs et se dégrader dans un bac de plusieurs jours.
- 340 tests.

## Lot 7a — « Autre marque » : ta recette (19/10/2026)
Décision de Thomas : pas de catalogue multi-marques. L'app reste Athena seule ; les autres marques s'entrent à la main, avec les doses de leur étiquette.
- **Ta gamme** : avec « Autre marque / je dose moi-même », Nutrition calcule le bidon de la semaine à partir de tes produits : dose de l'étiquette × volume, produit par produit, une fourchette en min–max. Tout est marqué « perso, non vérifié ».
- **Partir de l'étiquette** : un formulaire court par produit (nom, dose, pour 1 L, 4 L, 10 L ou 1 gallon US, semaines de végé ou de floraison). Pas de NPK, pas de tableau.
- **Ordre de mélange** : celui de « Ma gamme », avec des flèches pour le changer ; tant qu'il n'est pas donné, l'app écrit « ordre non précisé ».
- **Semaines** : un produit n'apparaît que dans ses semaines.
- **EC et pH** : seulement tes cibles, par phase, si tu les saisis (Réglages → Nutrition). Sans saisie, pas de cible : l'app ne propose jamais de valeur.
- Le bidon enregistré garde les produits et les quantités du jour. Un espace déjà en « Autre marque » garde sa note, affichée au-dessus de la recette tant qu'elle n'est pas remplie.
- 337 tests ; `scripts/e2e-7.py`.

## Lot 10j2 — Journal, Graphiques et Réglages plus clairs (19/10/2026)
- **Filtres du Journal** rangés derrière un bouton « Filtres » qui ouvre une feuille (espace, plante, stade, tag) ; les filtres actifs tiennent en une ligne (« Colonne · Griffes ») avec « Effacer ».
- Les titres du Journal, de chaque graphique et des groupes des Réglages retrouvent leur petit dessin (📖 Historique, 💦 Dryback, 🧪 EC runoff, 🌡️ Température…). Outils ne change pas.
- La carte du cycle du Journal retrouve son cadre, comme les cartes d'espace.
- 330 tests.

## Lot 10j1 — Aujourd'hui plus clair (19/10/2026)
Constat de Thomas après 10h : « on a perdu fort en clarté ». Les petits dessins et les cadres reviennent là où ils aident.
- **Le matin en lignes courtes** : « Bonjour Thomas. », une petite ligne « 3 espaces · dernière saisie hier », puis une ligne par idée avec un petit dessin (stade, arrosage, réservoir, climat, rappels) et la valeur à droite (« 2,3 L/pot », « ≈ 2 j », « VPD 0,96 »). Ce qui demande l'attention : seule la valeur passe en orange. Un espace vide tient en une ligne discrète. Mêmes informations qu'avant ; le texte envoyé par la tâche du matin ne change pas.
- **Un cadre par espace** : chaque espace redevient une carte, sur un seul niveau, avec un carré teinté de sa couleur et le dessin de son stade (🌱 semis, 🌿 végé, 🌸 floraison, ✂️ séchage, 🪴 vide), son nom, « Cycle 2 · Végé S6 · J41 », la pilule du stade, quatre relevés avec leur petit dessin et la barre de cible, la dernière saisie et l'âge du bidon.
- **Le bon ordre** : la semaine, une seule ligne fine pour « Premiers pas » et la sauvegarde (« Premiers pas 6/7 : ta première sauvegarde » · Sauvegarder · ×), Bonjour, À faire, Espaces. Le titre « Tous les espaces » disparaît : l'onglet actif le dit déjà.
- Les titres de section d'Aujourd'hui retrouvent leur dessin (🔔 À faire, 🪴 Espaces, 📈 Relevés, 💧 Arrosage…). La vue d'un espace montre son carré teinté à côté du titre et suit le même ordre.
- 328 tests ; `scripts/e2e-10j.py`.

## Lot 10i — Allemand (19/10/2026)
- **Troisième langue** : l'app existe en allemand (tutoiement « du »), à côté du français et de l'anglais. Sélecteur FR / EN / DE dans la barre du haut, les Réglages et l'assistant de démarrage. Un téléphone réglé en allemand ouvre l'app en allemand au premier lancement.
- Vocabulaire de culture courant (Blüte, Wachstum, Steckling, Runoff, Dryback…) ; les noms de produits (Pro Grow, Pro Bloom, Pro Core, Fade, Cleanse, Balance, IPW, Proper, Great White) et les sources (« Handbook p. 37 ») ne sont pas traduits.
- Formats allemands : virgule décimale, dates « 19.10. » et « 19. Okt. », semaine commençant le lundi, export CSV avec « ; » et virgule comme en français.
- Carte du matin : le texte existe aussi en allemand ; la tâche du matin de Thomas continue d'envoyer le français.
- Les noms créés par l'assistant (premier espace, équipement) suivent la langue choisie ; les données déjà enregistrées ne sont jamais renommées.
- 318 tests ; `scripts/e2e-10i.py`.

## Lot 10h3 — Barre d'onglets ancrée et accès au calendrier (19/10/2026)
- **Barre d'onglets** ancrée en bas de l'écran, pleine largeur, sur le fond de la page : Aujourd'hui, Journal, « + », Graphiques, Outils. Le « + » de la saisie du jour est au milieu de la barre ; plus de bouton flottant sur le contenu.
- **Calendrier** sans onglet, toujours à portée depuis l'écran d'accueil :
  - une **bande de la semaine** en haut d'Aujourd'hui (lundi → dimanche, aujourd'hui souligné, un petit repère par rappel, échéance ou bidon) : toucher un jour ouvre le calendrier sur ce jour ; flèches ou balayage pour changer de semaine ;
  - la **date** en haut de l'écran (« lun. 19 oct. ») ouvre le calendrier ;
  - « Tout le calendrier → » en bas de « À faire », et le Calendrier en tête d'Outils.
  Le retour ramène à l'écran d'où on venait ; les liens `#calendar` marchent toujours.
- **Tous les réglages →** dans le menu de l'engrenage (demande de Thomas).
- Retoucher l'onglet ouvert remonte en haut de l'écran.
- **Mouvement** : seulement la transition d'écran (courte) et les retours d'appui ; rien avec les animations réduites.
- Outils en liste ; README et ses captures refaits. 313 tests.

## Lot 10h2 — Écrans « instrument » (19/10/2026)
- **Relevés** : les tuiles et les jauges d'Aujourd'hui deviennent des lectures d'instrument : la valeur en grands chiffres, une barre fine avec la zone cible et un trait à la valeur du jour, la cible écrite dessous. Hors cible, le chiffre et le trait passent en orange ou en rouge. Les cibles sont celles du jour, rien d'inventé.
- **Plus de cartes dans des cartes** : les sections sont séparées par un trait fin et un titre en Fraunces, en casse normale (« À faire », « Relevés », « Arrosage du jour »…). Seul le guide « Premiers pas » garde un cadre.
- **Carte du matin** : « Bonjour Thomas. » en Fraunces droit, puis chaque espace en deux ou trois phrases au lieu d'une liste. Mêmes informations ; le texte envoyé par la tâche du matin ne change pas. Le prénom se règle dans Réglages → Grow (sinon il est lu dans « Grow de … »).
- **À faire** (ex « À venir ») : case à cocher, titre, espace, et l'échéance en chiffres à droite (orange si l'heure est passée).
- **Journal** : une ligne par jour (date à gauche, résumé, valeur clé à droite), les hauteurs des plantes regroupées dessous.
- **Espaces en haut** : des onglets texte, l'espace choisi souligné.
- **Étape du cycle** : un bouton large à contour, avec la conséquence à droite (« J1 floraison → »).
- Les avertissements restants (débit, bidon, lampes, import…) passent en texte normal avec un petit repère.
- 310 tests ; `scripts/e2e-10h.py` complété.

## Lot 10h1 — Palette harmonisée et composants « instrument » (19/10/2026)
Consigne de Thomas : que l'app ne fasse plus « générée par une IA ». Lot 10h coupé en trois : 10h1 (palette et composants), 10h2 (écrans), 10h3 (barre d'onglets et accès au calendrier).
- **Palette harmonisée** (calculée en OKLCH) dans les deux thèmes : fond, surface, trait, texte, discret, « eau », « plante », « à surveiller », « alerte ». Contrastes vérifiés : texte ≥ 4,5:1, graphismes ≥ 3:1.
- **Couleurs des espaces** : 8 teintes terreuses sans vert (brique, cuivre, ocre, lagune, ardoise, lavande, prune, rose). Les espaces existants gardent leur couleur enregistrée, rien à migrer. Le repère d'espace devient un petit carré.
- **Logo** : le point de « hydro. » prend la couleur du texte ; la goutte prend la couleur « eau » du thème.
- **Boutons** : un bouton principal plein « eau » qui s'enfonce à l'appui ; boutons secondaires à contour ; boutons tertiaires en texte souligné (« Continuer le guide ») ; suppression en texte souligné rouge. Plus de boutons vert pâle ni de pilules (sauf les filtres du Journal).
- **Cases à cocher carrées** pour « Fait » : un second appui annule.
- **Champs « instrument »** : libellé au-dessus, un trait dessous (« eau » quand on tape, orange en cas d'erreur), valeur en grand chiffres, unité dans le champ, « hier 25,3 » dessous. Le bouton devient « Copier les valeurs d'hier ».
- **Choix exclusifs** en cases jointes (le choix actif est inversé).
- Les messages à surveiller sont du texte normal avec un petit repère, plus des phrases entières en orange.
- Focus clavier : contour « eau » de 2 px partout.
- 305 tests ; `scripts/e2e-10h.py`.

## Lot 9 validé (19/10/2026)
- Thomas valide le lot 9 (tâche du matin). Vérifié : la tâche « Hydro — résumé du matin » est active et a réussi le 19/10, le résumé du 20/10 est déjà prêt dans la base. Aucun changement de code ; le lot 7 (nutrition multi-marques) peut démarrer à la demande de Thomas.

## Lot 10g — Motif goutte et écran de démarrage (19/10/2026)
- **Chargement** : la goutte du logo se remplit de bas en haut ; avec les animations réduites, elle reste fixe et « Chargement… » s'affiche.
- **Graphiques** : une petite goutte vert eau au pied des courbes les jours de bidon.
- **Réservoir** : une goutte remplie au pourcentage de litres restants, avec le chiffre à côté.
- **Écran de démarrage** de la version installée : fond vert-noir, la goutte et « hydro. », le temps de lire les données, sans attente ajoutée. Couleurs du manifeste accordées pour l'écran système d'Android.
- 298 tests ; `scripts/e2e-10g.py`.

## Lot 10f2 — Direction visuelle (19/10/2026)
Consigne de Thomas : ça ne doit pas faire « app générée par une IA ».
- **Fonds teintés** : vert-noir en thème sombre, blanc cassé verdâtre en thème clair. Contraste vérifié dans les deux thèmes.
- **Deux verts qui ont un sens** : vert eau pour tout ce qui touche à l'eau (arrosage, runoff, réservoir, EC et pH de la solution), vert feuille pour la plante (stade, hauteur, levée). Même règle dans les pastilles, les icônes et les courbes. Orange et rouge restent pour les alertes.
- **Icônes au trait fin** dans l'interface courante ; les illustrations 3D restent dans l'assistant, « Premiers pas » et les écrans vides.
- **Retiré** : le halo en haut de l'écran, les barres translucides, les ombres et lueurs colorées, la bordure animée du conseil du jour, l'apparition en fondu de chaque carte, les chiffres qui défilent.
- Textes plus sobres, sans point d'exclamation.
- Captures du README refaites. 294 tests.

## Lot 10f1 — Identité « hydro. » : police, logo, icône (19/10/2026)
Le nom reste Hydro ; le logo s'écrit « hydro. ». Lot 10f coupé en 10f1 (police, logo, icône) et 10f2 (direction visuelle).
- **Fraunces** (direction « Serre ») pour le logo et ce qui se lit comme un titre : titres d'écran, noms des stades, titres des feuilles, « Bonjour » de la carte du matin, noms d'espaces sur les cartes. Figtree reste pour le texte, JetBrains Mono pour les chiffres ; les valeurs principales des cartes sont un cran plus grosses.
- **Logo « hydro. »** dans la barre du haut et sur l'écran de bienvenue : le « o » est une goutte qui contient une feuille, le point final est vert feuille.
- **Nouvelle icône d'app** : la goutte et sa feuille sur fond vert-noir, avec une version « maskable » pour Android et une icône d'onglet.
- Calendrier : en anglais à 200 %, le bouton « Rappel » ne déborde plus.
- 291 tests ; `scripts/e2e-10f.py`.

## Lot 10e3 — « Autre marque / je dose moi-même » et simulation finale (19/10/2026)
Décision de Thomas (hors des 84 points), en attendant le lot 7 multi-marques. Fin de la passe de corrections 10a → 10e.
- **Nouvelle gamme « Autre marque / je dose moi-même »** dans les réglages et l'assistant : pas de recette, pas de dose, pas d'add-on.
- **Nutrition → « Mon bidon »** : volume, EC visée (facultative), produits et doses tels que tu les écris, EC et pH mesurés. Le bidon s'affiche, l'EC et le pH se suivent dans le journal et les graphiques.
- **Aucune cible inventée** : pas de cible d'EC ni de pH pour une autre marque ; les repères d'arrosage (dryback, runoff) restent. Pas d'échéance Fade ni rinçage Athena ; la carte Bonjour renvoie aux consignes de ta marque pour le rinçage. pH / Balance : une note au lieu du titrage Balance.
- Jauges sans cible en couleur neutre ; « Demander à Claude » sait que la marque est dosée par toi.
- Version locale : icône de page déclarée (plus de `/favicon.ico` en 404).
- **Simulation d'un an (fin de passe)** : 0 jour de végé jugée comme un semis (96 avant la passe), 0 fausse alerte, 28/28 anomalies signalées, graphique « Cycle » sur le cycle en cours ; 4 échéances « débit de la pompe » restent en retard de 11 jours, parce que le simulateur ne remesure la pompe que tous les 71 jours (rappel à 60 jours). Passage navigateur sur 9 dates : aucune erreur, aucun débordement.
- 288 tests ; `scripts/e2e-10e3.py` ; tous les scripts e2e repassés.

## Lot 10e2 — Textes, glossaire, assistant, ARIA (19/10/2026)
Passe de corrections, points 76 à 84 de `docs/audit-2026-10-19.md`.
- **« EC runoff », « pH runoff »** partout (plus « RO », qui se lit « eau osmosée ») ; « EC entrée ».
- **Bulles (i) et glossaire** : VPD, DLI, PPFD, dryback, runoff, EC, P0–P3, pilotage végétatif / génératif expliqués là où ils apparaissent, et tous réunis dans Outils → Repères → Glossaire.
- **Assistant** : « Copier vers les autres espaces » à l'étape Équipement (« Dupliquer » créait un espace) ; plus d'erreur affichée avant d'avoir rien tapé ; « Quitter l'assistant » au lieu de « Passer » ; aide du dosage juste en poudre.
- **Français** : vrais pluriels (« 1 espace », « 3 espaces »), espaces avant les unités, « pièce » au lieu de « room », plus de vocabulaire de développement (« version Claude », « lot 8 », « Version 0.3 »), fuseau lisible (« heure du grow (Oslo) »).
- **Anglais** : plus de deux-points à la française ; noms de pots au bon séparateur décimal.
- **Sauvegarde** : « éléments » et « emplacements du matériel », dates avec l'année.
- **Lecteurs d'écran** : onglet courant annoncé, gravité des observations lue, jours du calendrier décrits, bouton « FR » nommé.
- **Couleur d'un espace** fixée à sa création : elle ne change plus quand un autre espace est supprimé ou déplacé.
- **Calendrier** : libellés des compteurs plus coupés ; **feuille Rappel** : un seul « Note », « Fin de la répétition » titré.
- 286 tests (5 nouveaux : pluriels, dates, couleurs, assistant) ; `scripts/e2e-10e2.py` ; tous les scripts e2e repassés.

## Lot 10e1 — Accessibilité visuelle (19/10/2026)
Passe de corrections, points 71 à 75 de `docs/audit-2026-10-19.md` (le lot 10e est coupé en 10e1, 10e2 et 10e3).
- **Contraste** : vert plus foncé en thème clair (texte vert lisible, boutons verts à texte blanc), textes secondaires, orange et rouge renforcés dans les deux thèmes ; jours hors du mois lisibles dans le calendrier. 0 défaut de contraste (axe-core) sur les cinq onglets et la saisie, en clair comme en sombre.
- **Tailles de texte** en rem (elles suivent le réglage de taille du téléphone), jamais sous 12 px.
- **Zoom 200 %** : plus rien ne déborde (titres, boutons du Journal, champs de la saisie qui passent sur une colonne) ; sur écran court, barre d'onglets sans libellés et bouton « Saisie du jour » réduit à son icône : les deux prennent 27 % de la hauteur au lieu de 45 %.
- **Cibles tactiles de 44 px** pour les boutons, puces, filtres et liens (zone de toucher élargie pour les petites pilules).
- **Le bouton « Saisie du jour » se cache en faisant défiler vers le bas** et revient en remontant : il ne couvre plus les « Fait » ; barre d'onglets plus opaque.
- `scripts/e2e-10e.py` : contraste, tailles, cibles et zoom 200 % vérifiés dans le navigateur ; tous les scripts précédents repassés.

## Lot 10d2 — Journal, graphiques, rappels, nutrition (19/10/2026)
Passe de corrections, points 58 à 60, 63, 64 et 69 de `docs/audit-2026-10-19.md`.
- **Journal** : les filtres repartent de zéro quand on change d'espace en haut (ils vidaient la liste) ; chaque rangée de filtres a son libellé (Espace, Plante, Stade, Tag) ; dans une journée, la saisie de l'espace passe avant celles des plantes, et la hauteur s'affiche ; plus de « 0 » parasite ; message vide juste : « Pas encore de saisie ici » ou « Aucune saisie avec ces filtres » avec « Effacer les filtres ».
- **Graphiques** : la période « Cycle » suit le cycle en cours (plus un vieux cycle récolté de 2025) ; nouvelle période **« Tout »** ; un espace suivi par capteur montre **« Dryback capteur »** par défaut ; le sélecteur du haut remplace les espaces cochés ; une courbe **s'interrompt après plus de 7 jours sans mesure** au lieu de relier les trous.
- **Lecture** : « Superposées » montre un espace à la fois, une couleur par courbe, légende lisible ; chaque graphique a un nom et un résumé pour les lecteurs d'écran (nombre de valeurs, dates, dernière, min, max).
- **Rappel récurrent** : une seule ligne dans « À venir » (la prochaine occurrence), avec « heure passée » quand l'heure du jour est dépassée.
- **Nutrition** : le bidon enregistré reste affiché (« Dernier bidon … enregistré à l'instant », « Voir ») ; « pH avant / après Balance » ; année sur les dates des bidons de concentré.
- **Performance** : la carte Bonjour n'écrit plus ses résumés à chaque saisie (regroupés, seulement ceux qui changent, en un lot) ; les échéances d'« À venir » ne sont plus recalculées à chaque rendu.
- 281 tests (9 nouveaux : filtres et ordre du journal, périodes, coupure des courbes, résumé, rappels, résumés regroupés) ; `scripts/e2e-10d2.py` (graphiques, journal, rappel, nutrition) ; 2b, 3, 4a, 4b, 5a, 6a, 6b, 10b, 10d repassés.

## Lot 10d1 — Navigation, feuilles et saisie (19/10/2026)
Passe de corrections, points 54 à 57, 61, 62, 65 à 68 et 70 de `docs/audit-2026-10-19.md` (le lot 10d est coupé en 10d1 et 10d2).
- **Le geste retour ne quitte plus l'app** : onglets, outils et feuilles sont dans l'historique. Le retour ferme d'abord la feuille ouverte, puis revient à la liste des outils, puis à Aujourd'hui.
- **Outils** : adresses `#tools/irrigation`, `#tools/nutrition`… (les anciens liens `#irrigation` marchent encore) ; retoucher l'onglet Outils ramène à la liste ; le hash n'est plus effacé.
- **Feuilles** : bouton ✕ ; « Abandonner la saisie ? » avant de fermer une feuille modifiée (✕, glissement, retour) ; la saisie rapide passe ses valeurs à la saisie complète.
- **« Reprendre hier »** : un bouton recopie les valeurs de la veille affichées en gris dans les champs vides (elles ne sont toujours pas enregistrées sans ce geste).
- **Changer la date, la plante ou l'espace d'une saisie** garde ce qui a été tapé.
- **Saisies** : une saisie rapide vide dit « Rien à enregistrer » au lieu d'un faux succès ; une ancienne saisie réenregistrée garde son heure ; un transfert partiel demande au moins une plante cochée.
- **Équipement** : changer de type ne vide plus les champs tapés. **Langue** : en changer ne vide plus les formulaires en cours.
- **Un seul message** par transfert, duplication ou archivage (deux avant).
- **Version locale** : si le réseau ne répond pas en 3 s, l'app s'ouvre depuis le cache.
- Plus d'effet de bord dans les mises à jour d'état (réglages, préférences des graphiques), plus d'effet sans accolades.
- 272 tests (6 nouveaux, `calc/lot10d.test.ts` : routes, `planNav`, « Reprendre hier », format des champs) ; `scripts/e2e-10d.py` (retour, feuilles, saisie, langue) ; 2b, 3, 4a, 4b, 5a, 5b, 6a, 6b, 10b repassés.

## Lot 10c — Calculs Athena : aucune valeur inventée (19/10/2026)
Passe de corrections, points 40 à 53 de `docs/audit-2026-10-19.md`.
- **Fade Pro** : 51 mL / 10 L fixes en S8–S9 (p. 31), plus mis à l'échelle de l'EC (37 mL à EC 2,2 avant).
- **Doses entre deux lignes de la p. 37** (EC 2,2…) : marquées « estimation » (poudre et concentrés) ; une ligne publiée reste « Athena p. 37 ».
- **EC au-delà du tableau** (> 4,0) : plus ramenée en silence à 4,0, un avertissement le dit.
- **Balance** : rien de proposé quand le pH avant est déjà dans la cible ou au-dessus (« pas de Balance, il ne fait que monter le pH »), même sans historique par point de pH.
- **Pastilles pH** : marge absolue de 0,2 (pH 6,8 en coco est « à corriger », plus « à surveiller »).
- **pH : une seule source, le catalogue de la gamme**, pour la recette et pour les cibles du jour : Blended S8 = 5,8–6,2 en coco (6,0–6,4 seulement en S9) ; Pro S8–S9 = 6,0–6,4 avec Fade, celui du substrat si le Fade est désactivé.
- **Dose CaMg (Blended) reprise du dernier bidon** telle que tapée (enregistrée par 10 L), sans dérive d'un bidon à l'autre ; les anciens bidons sont corrigés de leur mise à l'échelle.
- **Cibles « précision »** (P0–P3) seulement en coco sur l'arrosage automatique ; sinon celles de la méthode manuelle.
- **« Prochaine étape »** juste quand l'éclairage passe minuit (lampes à 18:00 sur 12 h).
- **Dates** : « aujourd'hui » suit le fuseau du grow ; « Demander à Claude » envoie la date locale (plus la date UTC).
- **Valeurs sans source dans la fiche** étiquetées « repère de l'app » : 10–25 % de runoff en manuel, doses d'installation, nombre et espacement des doses P2.
- Recette avec un volume vide, nul ou négatif : quantités vides au lieu de calculs faux. Volume de bidon par défaut : vide (plus de 30 L inventés).
- 266 tests (12 nouveaux, `calc/lot10c.test.ts` : `nextIndex`, `interpEc`, `concMlPer10L`, `phFor` par gamme, `predictBalance` pH trop haut… ; tests 3 et 4a adaptés au Fade fixe et aux estimations) ; simulation d'un an inchangée (28/28 anomalies, 0 fausse alerte) ; 4a, 4b, 5a repassés.

## Lot 10b2 — Stades, carte Bonjour, Premiers pas, simulation d'un an (19/10/2026)
Passe de corrections, points 31 à 39 de `docs/audit-2026-10-19.md`.
- **Carte Bonjour** : rinçage en arrosage automatique affiché comme tel (eau osmosée, EC < 0,1), installation « 2 petites doses de N mL près de la tige » au lieu de « 0 doses dès — », semis en automatique expliqué (le programme démarre avec « Passer en végé »), pas de programme automatique dans un espace sans pompe ; un espace sans cycle = **une seule ligne « Vide »** ; espace de séchage = **« séchage J3/10 »** ; un nouvel utilisateur ne voit plus « pas de mesure depuis hier » (seulement « Pas encore de saisie », une fois) ; volume des pots manquant signalé au lieu de « 0 L ».
- **Résumés des jours suivants** (tâche du matin) : les échéances sont calculées avec le vrai « aujourd'hui », donc « Refaire le bidon » tombe le bon jour, et l'autonomie du réservoir décompte les jours. Plus de résumé du jour (app pas ouverte depuis plus d'une semaine) : repli sur le dernier, avec la mention de sa date.
- **Premiers pas** : pas de pots demandés pour un espace arrosé à la main ; la lampe est cochée dès que ses watts réels sont connus ; bouton **« Démarrer aujourd'hui »** pour un cycle sans date de départ.
- **Numéro de cycle** = rang par date de création (« Blue Zushi 2026 » n'est plus le cycle 2026) : l'EC de départ du cycle 1 ne s'applique qu'au premier.
- **Échéance « bidon »** sans bac enregistré : liée au dernier niveau saisi (un « Fait » ne l'éteint plus pour toujours). **Concentré presque vide** : daté du jour où un nouveau sac sera nécessaire (estimé d'après l'écart habituel entre les bacs), jamais « en retard » dès sa naissance.
- **Consommation du réservoir** : jamais calculée à travers un remplissage (deux niveaux séparés par un bac), relevés de moins de 14 jours ; les bacs de l'espace précédent d'un cycle ne comptent plus pour le nouvel espace.
- **Noms de stade** : un seul vocabulaire (« Masse » partout ; « Floraison S6 · masse » ; « Stretch · pilotage génératif » au lieu de « Génératif · Stretch »).
- **Une seule fonction « cycle d'un espace »** (`cycleOfSpace`) pour Aujourd'hui, la carte Bonjour, le calendrier, la saisie et les outils.
- **Simulation d'un an** (fin de 10b) : 0 jour de végé jugée comme un semis (96 avant), 0 fausse alerte, 28/28 anomalies signalées, 0 plantage ; 4 échéances traînent encore (12 avant), toutes « mesurer le débit de la pompe » : le simulateur ne remesure la pompe qu'aux transferts (tous les 71 jours) alors que le rappel est à 60 jours, l'app a raison de le rappeler. Passage navigateur sur les 9 dates : aucune erreur, aucun débordement.
- 254 tests (9 nouveaux ; tests 2b, 4a et 8c adaptés aux nouvelles règles) ; `e2e-10b.py` complété (Démarrer aujourd'hui, carte Bonjour).

## Lot 10b1 — Cycles : création minimale, étapes en un geste (19/10/2026)
Passe de corrections, points 24 à 30 de `docs/audit-2026-10-19.md` (le lot 10b est coupé en 10b1 et 10b2).
- **Créer un cycle** (décision de Thomas) : nom, variété(s), espace, **date de départ**. Le reste est replié : « Dates prévues (facultatif) » (12/12 prévu, semaines de floraison, séchage) et « Arrosage et matériel », **prérempli depuis l'équipement de l'espace** (pots, débit, lampes, mode : pompe présente = automatique). Sans équipement, pots et débit restent vides (« donnée manquante ») : le formulaire ne recopie plus jamais le cycle de Thomas (Cherry Limeade, 4 pots de 15 L, lampes).
- **Étapes en un geste le jour J** sur Aujourd'hui : carte « Étape suivante » avec **Passer en végé**, **Passer en 12/12**, **Récolter**, chacune avec son événement automatique et **Annuler** dans le message. La végé commence au bouton, dans n'importe quel espace (`Cycle.vegDate`) : la végé en Colonne n'est plus vue comme un semis. Les anciens cycles gardent la végé au transfert.
- **Récolte prévue ≈ …** (12/12 + semaines de floraison) affichée sur la carte et dans la fiche, jamais écrite comme récolte ; le champ réel s'appelle « Jour de la récolte ». Après « Récolter », l'espace propose « Noter la récolte (poids, séchage) ».
- **Transfert** = un déplacement le jour même (Réglages → Cycles → Transférer), plus de date de transfert à prévoir. Il amène le rappel **Great White**, coché tout seul si le transfert a noté le produit. L'ancien champ « Transfert prévu » reste visible seulement s'il était rempli.
- **Champ vidé** : une fiche existante garde sa valeur précédente ; pots et débit vides restent vides ; plus de 15 L, 4 pots, 9 semaines ou −2 inventés.
- **Événements automatiques** (végé, 12/12, rempotage, récolte) : supprimés quand la date est effacée, déplacés avec la date en gardant la note et les produits (Great White).
- **Cycle actif** : seule la création d'un cycle le rend actif ; enregistrer ou ouvrir un autre cycle ne déplace plus toute l'app.
- **Fade et rinçage** se cochent tout seuls dès que le bac de la phase (Fade dans la recette, bac de rinçage) ou l'événement est enregistré.
- Simulation d'un an (intermédiaire) : **0 jour de végé jugée comme un semis** (96 avant), 0 fausse alerte, 28/28 anomalies signalées, Fade et rinçage ne traînent plus ; 8 échéances traînent encore (débit de la pompe, concentré presque vide), traitées en 10b2.
- 245 tests (9 nouveaux, `calc/lot10b.test.ts` ; test du lot 3 adapté à la décision Great White) ; parcours `scripts/e2e-10b.py` ; `e2e-3.py` (transfert réel au lieu du transfert prévu) et `e2e-8c.py` (formulaire replié) adaptés ; 2b, 4b, 5a, 6a, 8b repassés.

## Lot 10a — Sécurité des données : rien ne doit se perdre (19/10/2026)
Passe de corrections, points 1 à 23 de `docs/audit-2026-10-19.md`.
- **Une erreur de lecture n'est plus jamais une base vide** : `list()` lève l'erreur, les abonnements appellent `onError` au lieu de rendre un état vide. Une lecture ratée affiche « Lecture des données impossible » avec **Réessayer**, et le grow de départ n'est semé qu'après des lectures réussies et vraiment vides (`grow/main`, espaces et cycles relus juste avant).
- **Version Claude sans base de données** : écran « Base de données indisponible » avec Réessayer, plus de bascule silencieuse sur un stockage local. **Ouverte par quelqu'un d'autre que le propriétaire** (`user.isOwner()`) : écran « App réservée à son propriétaire », rien n'est écrit.
- **Documents mal formés** : vérifiés par collection (`model/validate.ts`), mis de côté sans être effacés (compteur dans Sauvegarde), tris tolérants ; `grow/main` abîmé garde son nom. À l'import, les documents mal typés et les identifiants dangereux (`__proto__`…) sont ignorés et comptés. Écran de plantage : **Exporter les données brutes** et **Réinitialiser** (en deux appuis).
- **Import « Remplacer »** : confirmation, puis **copie de secours** des données actuelles téléchargée d'abord (sans copie, rien n'est remplacé) ; les écritures passent avant les suppressions. Import et réinitialisation **par lots** (une transaction et une seule mise à jour de l'écran par lot : 3 000 documents en une fraction de seconde au lieu de ~23 s). Fichier de plus de 20 Mo refusé, champ fichier vidé après Annuler, erreurs de lecture signalées.
- **Saisie vide refusée** (« Rien à enregistrer… ») : les réglages recopiés de la veille ne comptent que s'ils ont changé. **Nombre mal tapé** (« 2,4,5 », « - ») : champ en rouge « Nombre invalide » et enregistrement bloqué, dans tous les formulaires.
- **Stockage local** : une écriture est enregistrée dans IndexedDB **avant** d'apparaître (une écriture refusée ne reste plus affichée) ; IndexedDB indisponible = bandeau rouge « rien ne sera gardé » au lieu d'un chargement infini ; **plusieurs onglets / l'app installée** restent synchronisés (`BroadcastChannel`).
- **Double appui** : un bidon (Nutrition) ou une pulvérisation (IPW) n'est plus enregistré deux fois. **Suppression ratée** : message d'erreur au lieu d'une fermeture muette.
- **Photos** supprimées quand on les retire d'une saisie, quand la saisie est supprimée, quand la feuille se ferme sans enregistrer, et à la réinitialisation de l'artefact (ids repris du journal).
- **Rappel de sauvegarde** : « Copier » n'est plus compté comme une sauvegarde ; sur iPhone, l'export passe par la feuille de partage (seul moyen de savoir que le fichier est enregistré).
- **Couleur d'espace** limitée aux 8 couleurs connues. **CSV** : formules neutralisées (`= + - @`), virgule décimale en français. **.ics** : retour chariot échappé, fuseau vérifié, `UNTIL` en date-heure UTC, `EXDATE` pour les occurrences faites, rappel ponctuel reporté exporté à sa nouvelle date.
- **Netlify** : `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` dans `netlify.toml` ; **CSP** écrite au build dans `dist-local/_headers` avec le hash exact des scripts de la page (vérifiée dans Chromium : aucune violation).
- **Stockage protégé** (version locale) : demandé une fois le grow créé (et plus au démarrage), état affiché dans Sauvegarde avec un bouton, avertissement iPhone (installer l'app). **Assistant interrompu** (espaces écrits sans `grow/main`) : l'assistant se rouvre avec son brouillon et remplace les restes ; il écrit tout en une seule transaction.
- 236 tests (15 nouveaux, `calc/lot10a.test.ts`) ; nouveau parcours `scripts/e2e-10a.py` ; `e2e-6b.py` (confirmation + copie de secours, base simulée, écran sans base) et `e2e-8a.py` (une copie n'est pas une sauvegarde) adaptés ; 2b, 3, 4a, 4b, 5a, 5b, 6a, 8b, 8c, 8d, 8e repassés.

## Lot 8e — Numéro de version et bannière de mise à jour (18/10/2026)
- **Version affichée** en bas de Réglages, dans les deux versions : commit court + date et heure du build (`lib/version.ts`, injectés par `vite.config.ts` via `__HYDRO_BUILD__`). Sur Netlify le commit vient de `COMMIT_REF` ; un build fait avec des changements pas encore commités affiche « + » après le commit.
- **Nouvelle version disponible** (version locale) : le build écrit `version.json` à côté de la page ; l'app le relit au retour au premier plan (`visibilitychange`) et toutes les 30 min (pas hors ligne). Si le build en ligne est plus récent, bannière « Nouvelle version disponible — Mettre à jour » qui recharge l'app (après avoir demandé le nouveau service worker). **Jamais de rechargement automatique**, et la bannière se cache tant qu'un formulaire est ouvert (saisie, cycle…).
- `version.json` n'est jamais mis en cache : ignoré par le service worker (cache `hydro-v2`) et `Cache-Control: no-cache, no-store` dans `netlify.toml`. Un `version.json` identique, plus ancien ou abîmé ne propose rien.
- 221 tests (5 nouveaux) ; parcours `scripts/e2e-8e.py` (déploiement simulé : même build, plus ancien, plus récent, formulaire ouvert, mise à jour) ; 8a et 8b repassés.

## Lot 8d — Dryback : méthode de mesure par espace, correctif runoff (18/10/2026)
- **Correctif** : `derive` (`model/entry.ts`) recopiait l'humidité du capteur de sol (`sensorPct`) dans le % de runoff quand aucun runoff n'était saisi. Le repli est supprimé : le % de runoff ne vient que du runoff mesuré. L'ancien test qui validait ce comportement est remplacé.
- **Méthode de mesure du dryback, par espace** (Réglages de l'espace → Arrosage, mémorisée dans `space.irrigation`) : **Pesée** (par défaut, comme avant), **Capteur AC Infinity**, **Autre capteur** (avec son nom), **Aucune**. La saisie du jour n'affiche que les champs de la méthode : poids matin et pic, ou humidité du capteur matin et pic (%).
- **Dryback capteur** = (pic − matin) ÷ pic (même formule que la fiche Athena), stocké à part (`drybackSensor`) avec la méthode (`drybackMethod`, `sensorName`). Le champ `dryback` reste celui de la pesée.
- Les **cibles Athena ne jugent que la pesée** : pour un capteur, pas de pastille verte / orange / rouge ni de correction, la mention « échelle capteur, à comparer entre tes propres journées (guide Bonorum) », une jauge neutre sur Aujourd'hui et une **courbe séparée** « Dryback capteur (échelle capteur) » dans les graphiques, sans zone cible. Journal, calendrier, cartes d'espace, CSV et « Demander à Claude » affichent le dryback capteur à part.
- L'ancien champ « Capteur de sol (%) » n'est plus proposé ; une valeur déjà saisie reste visible (« ancien relevé »).
- 216 tests (5 nouveaux + correctif) ; parcours `scripts/e2e-8d.py` (pesée → AC Infinity → autre capteur nommé → aucune → pesée) ; 2b, 4b, 5a, 6a et 8c repassés.

## Lot 8c — Premiers pas (18/10/2026)
- **Guide de démarrage « Premiers pas »** (demande de Thomas ; `calc/getting-started.ts`, `screens/tools/start.tsx`, deux versions) : **ce qu'il faut rentrer**, coché d'après les données (lampe : PPF, ou watts réels et efficacité, comme l'estimation du PPFD ; pots de chaque espace arrosé ; cycle avec date de germination ou de 12/12 ; débit de la pompe si arrosage automatique ; premier bidon ; première saisie ; première sauvegarde dans la version locale). Une ligne n'apparaît que si elle s'applique ; chaque ligne ouvre le bon endroit (Équipement, fiche de l'espace à l'Arrosage, cycle, Nutrition, saisie, Sauvegarde). Puis **comment ça marche** en 9 rubriques (journée type, bidon, arrosage, cycle, calendrier, graphiques, réglages, origine des chiffres, sauvegarde).
- Carte **« Premiers pas · n / total »** sur Aujourd'hui avec la prochaine chose à rentrer, masquable (et à remettre depuis le guide). L'assistant de la version locale se termine sur le guide.
- Version locale : un nouveau cycle ne reprend plus les valeurs du grow de Thomas (Cherry Limeade, 4 pots de 15 L, lampes) ; les pots viennent de l'équipement de l'espace, sinon ils sont à saisir.
- Libellés de semis génériques (« Semis » au lieu de « Semis · colonne »).
- 211 tests (6 nouveaux) ; parcours `scripts/e2e-8c.py` (version locale et version Claude) ; 8a, 8b, 2b et 3 repassés.

## Lot 8b — Assistant de premier lancement et guides (18/10/2026)
- **Assistant de premier lancement** (version locale ; `lib/onboarding.ts`, `screens/onboarding.tsx`) : accueil (langue, « Commencer », « Passer l'assistant »), puis 7 étapes dans l'ordre du cahier des charges : nom du grow → espaces (modèle, dimensions L × l × H facultatives, **dupliquer avec l'équipement**, ajouter, retirer) → équipement rapide et facultatif (lampe, pots, réservoir, extracteur : un champ vide ne crée rien, rien n'est supposé) → modules → gamme, add-ons et méthode (Pro Line ou Blended, jamais mélangées ; aucun add-on coché au départ) → premier cycle facultatif (pots repris de l'équipement, obligatoires pour créer le cycle) → heure du résumé, récapitulatif, conseil d'installation. Tout est écrit à la fin, le grow en dernier ; le brouillon survit à un rechargement.
- **Importer une sauvegarde dès l'accueil** de l'assistant (fichier ou texte collé) : tout est repris, l'assistant se ferme.
- La version locale ne crée plus un « Mon grow » vide au premier lancement : l'assistant s'affiche (aussi après « Réinitialiser l'app »). La version Claude est inchangée (grow de départ de Thomas).
- **Installer Hydro** (iPhone / Android) : carte dans l'assistant et dans Réglages (version locale), cachée quand l'app est déjà installée.
- Rappel de sauvegarde : pas le jour même de la création du grow (sauf saisie déjà faite). Note de gamme juste quand les deux gammes sont proposées. `netlify.toml` : pas de cache aussi pour `/` et le manifeste.
- Guides : `docs/guide-amis.md` (installer, assistant, sauvegarde, changer de téléphone, réinitialiser) et `docs/guide-netlify.md` (relier Netlify à GitHub, pour Thomas).
- 205 tests (12 nouveaux) ; parcours `scripts/e2e-8b.py` (assistant complet en sombre et en clair, rechargement en cours de route, réinitialiser → coller une sauvegarde, passer l'assistant) ; `e2e-8a.py` adapté (le collage après réinitialisation passe par l'assistant) ; 2b, 3, 4b et 6b repassés sur la version Claude.

## Lot 8a — Version locale, réinitialiser, transfert entre apps (18/10/2026)
- **Version locale (amis)** : `npm run build:local` → `dist-local/` (Netlify : `netlify.toml`). Polices embarquées (plus de Google Fonts), icônes 3D incluses dans la page, **installable** (manifeste, icônes générées depuis 🪴, `apple-touch-icon`) et **hors ligne** (service worker « réseau d'abord, cache sinon » : les mises à jour arrivent dès qu'on est connecté). Stockage IndexedDB marqué persistant (`navigator.storage.persist()`). La version Claude est inchangée.
- **Réinitialiser l'app** (demande de Thomas) : Réglages → « Réinitialiser… », confirmation avec lien « Exporter une sauvegarde d'abord ». Efface toutes les collections (le grow en dernier) et les photos locales ; langue et thème gardés. Version Claude : l'app repart avec le grow de départ de Thomas ; version locale : de zéro.
- **D'une app à l'autre** (demande de Thomas) : dans Sauvegarde, « Envoyer… » (feuille de partage du téléphone, quand elle existe), « Copier la sauvegarde » et « Coller une sauvegarde » (même résumé et même confirmation que l'import de fichier). Fonctionne entre la version Claude et la version locale, ou entre deux téléphones. Les photos ne suivent pas.
- **Rappel de sauvegarde** (version locale) sur Aujourd'hui : jamais sauvegardé, ou plus de 7 jours.
- 193 tests (4 nouveaux) ; parcours `scripts/e2e-8a.py` sur la version locale servie en HTTP (service worker, rechargement hors ligne, copier → réinitialiser → coller).

## Lot 9 — Tâche du matin et passe de finition (18/10/2026)
- **Tâche du matin** : l'app (version Claude) prépare le résumé du jour et des 6 jours suivants (`digest/latest` et `digest/AAAA-MM-JJ`, en français et en anglais ; les anciens sont supprimés après 7 jours), donc le résumé existe même si l'app n'a pas été ouverte le matin. Une **tâche programmée** « Hydro — résumé du matin » le lit chaque jour à 06:51 (Europe/Oslo) et l'envoie en notification ; si le résumé a été calculé un autre jour, une ligne le précise. Testée une fois (lecture réussie en 8 s). `morningText`, `digestWeek`, `digestDocs` dans `calc/digest.ts`.
- **Réglages par espace** (demande de Thomas : trop de boutons dans les outils) : la fiche de l'espace (Réglages → l'espace) regroupe Général, Nutrition (y compris les réglages du grow quand l'espace les suit), **Arrosage** (mode, substrat, allumage, pots, doses, P0, racines pas encore aux bords ; débit affiché depuis l'Équipement), **Lumière** (photopériode, gradation de chaque lampe) et **Air** (vitesse de l'extracteur). Les outils n'affichent plus que les résultats et les actions du jour, avec un résumé des réglages et un bouton « Réglages » qui ouvre la fiche sur la bonne section (« Tous les réglages de l'espace » pour le reste). IPW s'active depuis la même fiche.
- Arrosage : le tableau d'arrosage manuel de la gamme est toujours visible (référence) ; les relevés du capteur s'enregistrent avec leur propre bouton.
- **Barre du haut** (demande de Thomas) : FR/EN et clair/système/sombre regroupés derrière une petite pastille à roue crantée (`DisplayMenu`, Radix Popover) qui montre la langue et le thème en cours ; le menu affiche « Français / English » et « Clair / Système / Sombre ». Toujours disponibles aussi dans Réglages.
- Finition : sélecteurs à libellés longs qui passent à la ligne (plus de chevauchement en anglais), texte « Heure du résumé » à jour, **build minifié** (3,0 Mo → 1,4 Mo ; `HYDRO_DEBUG=1` pour un build lisible), sélecteur ambigu du parcours 2b corrigé.
- 189 tests (3 nouveaux) ; tous les parcours Playwright repassés (2b, 3, 4a, 4b, 5a, 5b, 6a, 6b).

## Lot 6b — Sauvegarde, import et « Demander à Claude » (18/10/2026)
- Outil **Sauvegarde** (`lib/backup.ts`, `screens/tools/data.tsx`) : export JSON de tout le grow (16 collections, documents tels que stockés ; le résumé du matin n'est pas gardé, il est reconstruit chaque jour), **même format dans les deux versions**. Import avec résumé avant écriture et deux modes : **fusionner** (même identifiant remplacé, le reste gardé) ou **remplacer** (ce qui n'est pas dans le fichier est supprimé, bouton rouge). Fichiers refusés : pas du JSON, pas une sauvegarde Hydro, version plus récente. Journal en **CSV** (séparateur « ; », noms d'espaces). Les photos restent référencées par leur id.
- Outil **Demander à Claude** (`calc/ask.ts`, `lib/sample.ts`, `screens/tools/ask.tsx`, version Claude seulement) : question sur l'espace envoyée avec ce que l'app sait (gamme, stade, cibles et leur source, 7 dernières saisies, dernier bidon, équipement, données manquantes), réponse en direct, questions suggérées, suite de conversation (6 derniers échanges), arrêt. Consigne : ne jamais inventer une dose absente du Handbook, ne jamais mélanger les gammes, citer la source. Caché dans la version locale et tant que la capacité `sample` n'est pas accordée.
- Liens profonds `#ask` et `#data`. La déclaration complète des capacités est notée dans `docs/artifact-capabilities.json`.
- 186 tests (7 nouveaux, dont **export puis import JSON → données identiques**) ; parcours `scripts/e2e-6b.py` (téléchargement réel, restauration « Remplacer », « Demander à Claude » avec une capacité simulée, aucun appel réel).

## Lot 6a — Graphiques (18/10/2026)
- Onglet **Graphiques** (`calc/series.ts`, `screens/charts.tsx`, Recharts 3 via le composant Chart de shadcn) : 17 courbes au choix (dryback, EC entrée et runoff, pH entrée et runoff, Balance des bidons, volume par pot, % de runoff, température, humidité, VPD, PPFD, DLI, hauteur, levée, consommation, réservoir).
- **Un graphique par courbe** (zone cible enregistrée avec chaque saisie, donc juste même si la cible a changé ; événements en repères verticaux) ou **courbes superposées** (chaque courbe à l'échelle de sa propre plage, légende avec la plage, vraies valeurs dans l'infobulle).
- Comparaison jusqu'à **4 espaces** (couleur de l'espace), périodes **7 j, 30 j, cycle**. Choix des courbes, de la vue et de la période gardés sur l'appareil.
- Fluidité : saisies indexées par espace, recherche par dichotomie, au plus 120 points par courbe (jours moyennés par paquets au-delà). Test : 20 espaces × 2 ans (14 600 saisies), toutes les courbes de 4 espaces en moins de 250 ms.
- 179 tests (8 nouveaux) ; parcours `scripts/e2e-6a.py` (saisies de test écrites dans le stockage local).

## Lot 5b — Lumière et Climat (18/10/2026)
- Outil **Lumière** (`calc/light.ts`, `screens/tools/light.tsx`) : PPFD estimé depuis les lampes de l'espace au réglage de gradation saisi (enregistrable dans l'équipement), DLI sur la photopériode, calcul inverse (DLI visé → PPFD nécessaire et gradation estimée), W/m², PPF, hauteur libre (espace − pot − épaisseur de lampe − distance minimale, « donnée manquante » tant que ces champs sont vides). **Schéma de l'espace à l'échelle** (Floraison carré, Colonne 1 : 3) avec lampes dessinées à leur taille quand leurs dimensions sont saisies, grille 3 × 3 et **carte de PPFD mesurée** (moyenne, min, max, uniformité ; la mesure remplace l'estimation pour le DLI), enregistrée sur l'espace (`space.lightMap`). Cibles du stade avec leur source (repère courant, hors Handbook).
- Outil **Climat et air** (`calc/climate.ts`, `screens/tools/climate.tsx`) : VPD feuille (Tetens) depuis la dernière saisie ou les valeurs tapées, cible du stade (repère courant), humidité à viser à cette température, renouvellement d'air depuis l'extracteur de l'espace à la vitesse saisie (enregistrable), repère courant 1 à 3 min, avertissement filtre à charbon. Débit du Cloudline S6 : « donnée manquante » tant qu'il n'est pas saisi.
- Équipement : nouveaux champs longueur / largeur / épaisseur de lampe et hauteur du pot. Lignes de calcul : la liste « manque : … » ne déborde plus.
- Les quatre outils du lot 5 sont ouverts ; plus aucun « Arrive au lot 5 ».
- 171 tests (10 nouveaux, dont le schéma proportionnel) ; parcours `scripts/e2e-5b.py`.

## Lot 5a — pH / Balance et IPW (18/10/2026)
- Outil **pH / Balance** (`calc/balance.ts`, `screens/tools/ph-balance.tsx`) : pH visé du stade avec sa source (page du Handbook), titrage guidé par paliers de 1 mL pour 4 L (100 L → 25 mL), très gros compteur à valeur exacte, relevés de pH après chaque ajout. Prédiction apprise à partir de 2 bidons enregistrés avec leur Balance (par 10 L, ou par point de pH quand le pH avant/après est connu), **départ à 80 %**, puis paliers. Au-dessus de la cible : aucune dose proposée. Enregistrement sur le dernier bidon de l'espace (pH avant, pH après, Balance ajouté).
- Outil **Pulvérisation IPW** (`calc/ipw.ts`, `screens/tools/ipw.tsx`) : prévention 24 mL/L 2 fois par semaine, pression 32 mL/L 3 fois par semaine, restauration 32 mL/L sur 9 jours (2 jours + 1 de pause) ; dose du pulvérisateur (2 L × 24 → 48 mL) ; fenêtre végé et floraison S1–S3, **bloqué dès S4 (donc en S5)**, au rinçage et en semis ; checklist avant pulvérisation ; historique (`sprays`). IPW reste désactivé chez Thomas (pas encore acheté), un bouton permet de l'activer.
- Échéance **IPW** (`deadlines.ts`, kind `ipw`) : prochaine pulvérisation du protocole en cours, jamais après la fin de S3, seulement si IPW est activé.
- 161 tests (10 nouveaux) ; parcours `scripts/e2e-5a.py`.

## Lot 4b — Arrosage (18/10/2026)
- Outil Arrosage : volume des pots, nombre de pots et débit **tirés de l'équipement de l'espace** (`spaceIrrigation` dans `equipment/calc.ts`). Absent → « donnée manquante » (doses en mL et durées masquées, lien vers l'équipement), rien d'inventé. Débit de la pompe de Thomas : toujours à mesurer.
- **Volume du pot modifiable** (demande de Thomas, pas seulement 15 L) : volume et nombre de pots se changent dans l'outil Arrosage et sont enregistrés sur le contenant de l'espace (`withPots` ; « Pots 15 L » devient « Pots 11 L »), ou créent un contenant s'il n'y en a pas. Le programme suit immédiatement.
- Arrosage manuel **par gamme** : `dayTargets(..., { line })` lit les tableaux des catalogues (Pro p. 41, Blended p. 60) ; tableau semaine par semaine dans l'outil, ligne du stade surlignée. pH coco en floraison manuelle 5,9–6,3 (p. 41), Fade 6,0–6,4. EC de solution du Blended = programme p. 58 (jamais le 3,0 de la Pro Line).
- Les cibles du jour (Aujourd'hui, saisie) suivent la gamme de l'espace du cycle.
- 151 tests (10 nouveaux, dont manuel Blended végé → EC du runoff 3,5–4,5) ; parcours `scripts/e2e-4b.py`.

## Lot 4a — Nutrition à catalogue (18/10/2026)
- Catalogues sourcés `src/data/nutrients/` : `athena-pro.ts` (programme p. 31, dosage par EC en poudre et en concentrés 113/226/282 g/L p. 37, arrosage manuel p. 41), `athena-blended.ts` (programme p. 58 semaine par semaine, B avant A, arrosage manuel p. 60), `addons.ts` (Fade, Cleanse et rinçage, Balance par paliers de 1 mL pour 4 L, IPW, CaMg et PK réservés au Blended). Chaque dose porte sa page.
- Moteur générique `src/calc/nutrients.ts` (remplace `calc/nutrition.ts`) : phase du programme d'après le cycle, recette dans l'ordre de mélange avec la source de chaque ligne, plages publiées affichées telles quelles tant que la dose n'est pas choisie, mise à l'échelle Blended marquée « estimation ». **Fade en S8–S9 à la place du Core** (Core conservé si le Fade est désactivé), pH 6,0–6,4.
- Produits perso : écran « Saisir depuis l'étiquette » (dose min/max pour un volume, converti pour 10 L ; semaines en végé et/ou floraison de S… à S… ; texte de l'étiquette ; désactivation). **Proper reste vide tant que Thomas ne l'a pas saisi**, source « étiquette ». Great White reste sur les racines, jamais dans le bidon.
- Assistant concentré (sac entier ÷ concentration, 80 % d'eau, 15–45 min, compléter, Core à part) et stocks `concentrateStocks` : le stock baisse à chaque bidon enregistré ; un nouveau bidon de concentré clôt l'ancien.
- « Enregistrer ce bidon » : un bidon pour plusieurs espaces de la même gamme (jamais Pro + Blended), pH avant, Balance ajouté (mL), pH après, EC mesurée ; le Balance total revient en premier au bidon suivant. Fiche Bidon du Journal : pH avant et Balance ajouté, la recette est conservée à la modification.
- Échéance **concentré presque vide** (`deadlines.ts`, kind `concentrateLow`) : moins de 2 bidons comme le dernier (estimation), datée du bidon qui a fait passer sous le seuil.
- Blended : moteur et tests, menu caché dans la version de Thomas (visible en `VITE_TARGET=local`).
- 141 tests (24 nouveaux) ; parcours Playwright `scripts/e2e-4a.py`.

## Lot 3 — Calendrier (18/10/2026)
- Rappels perso (`reminders/{id}`) : intitulé, espace ou tout le grow, date et heure dans le fuseau du grow (Europe/Oslo pour Thomas), répétition (tous les N jours, jours de la semaine, chaque mois ; fin jamais / après N fois / jusqu'au), alerte, note. « Fait » et « Reporter à demain » agissent sur une seule occurrence. Les heures restent fixes au changement d'heure.
- Échéances automatiques (`src/calendar/deadlines.ts`) : 12/12 prévu, début du Fade (S8, si l'add-on est activé), rinçage (3 derniers jours), récolte prévue, bidon à refaire (autonomie du réservoir), fin de propagation et **Great White sur les racines au transfert** (nouveau champ « Transfert prévu » du cycle), fin de séchage (nouveau champ « Séchage prévu »), **mesurer le débit** de la pompe (jamais mesuré, ou plus de 60 jours). Chaque échéance cite sa source ; leur état (fait, reporté) est stocké dans `reminders/auto_{clé}`.
- Onglet Calendrier : vue mois (points journal / échéances / rappels / en retard, stats du mois), agenda (en retard + 30 jours), fiche du jour (à faire + saisies, bidons, événements), filtres, suit le sélecteur d'espace. Bouton « Rappel » aussi dans « À venir » et dans la saisie du jour (enregistre puis ouvre un rappel).
- Aujourd'hui : « À venir » branché sur le calendrier (vue Tous, vue d'un espace, même sans cycle). Carte Bonjour v2 : rappels et échéances du jour, par espace et pour tout le grow.
- Export .ics (`src/calendar/ics.ts`) : RRULE, VALARM, VTIMEZONE générée depuis les vrais décalages du fuseau, occurrences reportées en RECURRENCE-ID, UID stables (`{id}@hydro.app`, `auto-{clé}@hydro.app`). Version Claude : `hydro.zip` contenant `hydro.ics` (l'artefact n'autorise pas l'extension .ics au téléchargement) + bouton Copier ; version locale : `hydro.ics` direct.
- 117 tests (dont rappel tous les 3 jours × 5 à travers le passage à l'heure d'hiver, .ics relu par ical.js, UID stables, zip vérifié) ; parcours Playwright `scripts/e2e-3.py`.

## Lot 2b — Journal et Aujourd'hui (18/10/2026)
- Saisie quotidienne rattachée à un espace (plante en option) : n'affiche que les modules actifs (climat, propagation — graines, levées, dôme —, arrosage, runoff, nutrition, lumière avec hauteur lampe / canopée, plante), niveau du réservoir si un réservoir est affecté. Possible sans cycle (séchage, réservoir…).
- Saisie rapide multi-espaces (T°, HR, réservoir) depuis « Tous » ou le Journal ; le bouton « Saisie du jour » ouvre la saisie rapide en vue « Tous », la saisie complète sur un espace.
- Journal qui suit le sélecteur d'espace : historique filtrable par espace, plante, stade et tag ; événements et bidons de l'espace.
- Aujourd'hui : vue « Tous » (une carte par espace, groupées par room), vue d'un espace selon son type (culture, propagation, séchage), autonomie du réservoir (niveau saisi ou estimé depuis le bidon, alerte au-delà de 7 jours en drain-to-waste).
- Carte « Bonjour » v1 : `buildDailyDigest(data, date, locale)` pure (climat, arrosage prévu, dernière saisie, réservoir), FR/EN ; la version Claude l'écrit dans `digest/latest`.
- Produits racines (Great White) proposés au transfert et aux événements Rempotage / Transfert, quantité saisie depuis l'étiquette, jamais dans le bidon.
- 102 tests ; parcours Playwright `scripts/e2e-2b.py` (saisie complète en 1,4 s).

## Lot 2a — Données et équipement (18/10/2026)
- Modèle modulable : grow, rooms/sites, espaces (modèle, couleur, ordre, dimensions L × l × H → surface et volume, modules, gamme propre), cycles rattachés à un espace avec transferts historisés (complets ou partiels), groupes, plantes. Duplication d'un espace avec son équipement, archivage.
- Registre central des modules (`climate`, `light`, `irrigation`, `nutrition`, `propagation`, `drying`, `plants`) et modèles Floraison / Végé / Propagation / Mère / Séchage / Personnalisé. Désactiver un module masque ses données sans les effacer.
- Collections à plat (`grow/main`, `spaces/{id}`, `cycles/{id}`, `entries/{date}_{espace}[_{plante}]`, …) ; `reminders`, `concentrateStocks`, `sprays`, `customProducts` déclarés sans écran. Base réservée au propriétaire sur les 17 collections.
- Équipement : inventaire, affectations historisées (une lampe déplacée ne change pas le passé), stock, glisser-déposer entre espaces, duplication, bibliothèque « Mes lampes ». Les champs vides affichent « donnée manquante ».
- `equipment/calc.ts` : PPF, PPFD moyen estimé, W/m², hauteur libre, durée d'une dose, autonomie, renouvellement d'air, CFM → m³/h, g/W.
- Réglages : affichage, grow, gamme, add-ons (Fade, Cleanse, Balance, IPW), méthode de dosage (poudre ou concentré 113/226/282 g/L), espaces, rooms, cycles, transferts.
- Navigation : Aujourd'hui, Journal, Calendrier (« Arrive au lot 3 »), Graphiques, Outils (9 outils, dont pH, IPW, Lumière, Climat « Arrive au lot 5 »). Sélecteur d'espace en haut, mémorisé.
- Repères : tableau Pro en g et en mL de concentré, arrosage manuel avec dryback S1 à 30–40 %.
- Grow de Thomas pré-rempli : Floraison 90×90×180 et Colonne 30×90×180, matériel du cahier des charges, cycle 1 dans la Colonne. EVO4 à 2,8 µmol/J marqué « hypothèse ».
- Add-ons de Thomas : Fade, Cleanse, Balance activés ; IPW désactivé (pas encore acheté) ; pas de CaMg ni de PK (Pro Line). Produits perso déclarés, doses vides tant qu'elles ne sont pas saisies depuis l'étiquette (source « étiquette ») : Proper (Athena, dans le bidon) et Great White (mycorhizes, une fois sur les racines au rempotage / transfert).
- 8 nouvelles illustrations 3D (🌸 🍂 📅 ⏰ 💦 🪣 🌀 🔌). 92 tests.

## Point de sauvegarde — 18/10/2026 (avant le nouveau découpage 2a/2b)
Construit selon l'ancien découpage du cahier des charges.

### Lot 1
- Squelette, 5 onglets, barre en verre dépoli, bouton « Saisie du jour », thèmes clair/sombre/système, FR/EN.
- Design system : tokens de la maquette + getdesign supabase ; shadcn/ui, Magic UI (NumberTicker, BorderBeam, BlurFade), Motion, Lucide, Recharts.
- 22 illustrations Fluent Emoji 3D dans le stockage d'assets.

### « Lot 2 » (ancien découpage)
- Cycle unique, plantes P1–P4, saisie quotidienne préremplie, événements, bidons, récolte, historique filtrable.
- Aujourd'hui sur données réelles : stade, cibles sourcées, une seule correction, programme, rappels.
- Stockage interchangeable : artefact / local (IndexedDB) / mémoire.

### « Lot 3 » (ancien découpage)
- Outil Arrosage (P0–P3, manuel, installation, mode capteur Bonorum) repris du « Plan d'arrosage ».
- Outil Nutrition générique (gamme Athena Pro Line), concentrés 113/226/282 g/L (Handbook p. 37), enregistrement des bidons.

### Correctifs
- Page blanche dans l'app Claude (style de l'hôte), champs illisibles en sombre, plantage à l'ouverture des outils (`scrollTo`).
- Base réservée au propriétaire (règles d'accès).
