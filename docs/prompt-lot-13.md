# Prompt lot 13 : sources discrètes et page « À propos »

À lancer dans Claude Code après le lot 12 (coché), une seule session à la fois. Un seul commit si possible ; sinon 13a (page À propos et icône source) puis 13b (nettoyage des textes).

Décision de Thomas (20/10/2026) : les sources restent citées, mais **beaucoup plus discrètement** qu'aujourd'hui (plus de lignes « Sources : … » sous chaque outil ou écran). Toutes les mentions complètes (ce sur quoi l'app s'appuie, quelles données viennent d'où, licences) vont dans une page **« À propos »**, plus complète qu'aujourd'hui mais moins en vue.

Principe à garder : l'app **n'invente toujours aucune valeur**, et chaque chiffre reste traçable. On change l'endroit où la source s'affiche, pas la règle.

---

1. `git pull`, `npm ci`, `npm test`. Ajoute « [ ] Lot 13 » dans l'état du build et note la décision ci-dessus.

2. **Retirer les lignes « Sources : … »** visibles en bas des outils et écrans (Arrosage, pH, Pulvérisation, Lumière, Climat, Nutrition, page d'un espace, calendrier, etc.).
   - À la place, une **petite icône ⓘ** discrète (16 px, couleur discrète, cible tactile de 44 px) à côté du titre de l'outil ou du chiffre concerné. La toucher ouvre une petite feuille : la source exacte de ce chiffre ou de cet outil (par exemple « Athena Handbook FR V8, p. 37 », « repère courant », « estimation : formule … », « donnée saisie par toi »), et un lien « Toutes les sources → » vers la page À propos.
   - Les mentions qui changent la **lecture** d'un chiffre restent visibles en petit, parce qu'elles évitent une erreur : « estimation », « donnée manquante », « perso, non vérifié », « échelle capteur, sans cible Athena ». Ce ne sont pas des crédits, ce sont des avertissements.

3. **Page « À propos »**, dans Réglages (dernière ligne) et dans le menu de l'engrenage, sous « Tous les réglages » :
   - version de l'app et date ;
   - **Sur quoi Hydro s'appuie**, une section par source, avec ce qui en est tiré et où :
     - **Athena Ag, Handbook FR V8** : recettes Pro Line et Blended (tables d'EC, doses, Balance, Fade, Cleanse), cibles par stade, méthode manuelle, protocole IPW. Pages citées. Mention : « Athena est une marque d'Athena Ag. Hydro n'est pas affiliée à Athena. »
     - **Méthode capteur** : « d'après le guide *Crop Steering Light* de Bonorum », avec ce qui en est tiré (logique P1/P2 déclenchée par le capteur, pause, arrêt avant l'extinction, seuils base / pic − 2). Lien vers leur guide si une URL officielle est déjà dans le dépôt ou le cahier des charges ; sinon pas de lien.
     - **Formules** : VPD (Tetens), DLI, durée d'une dose (volume ÷ débit), dryback, runoff.
     - **Repères courants** (hors Handbook) : VPD par stade, PPFD/DLI, renouvellement d'air, avec la mention qu'il ne s'agit pas d'une source officielle.
     - **Données saisies par l'utilisateur** : équipement, produits perso, mélanges de pulvérisation.
   - **Crédits techniques** : polices (Geologica, Figtree, Fraunces, licences OFL), dessins 3D (Microsoft Fluent Emoji, MIT), icônes (Lucide, ISC), bibliothèques principales, avec leurs licences.
   - **Avertissement** court : Hydro aide à suivre une culture ; les doses viennent des fabricants ; l'utilisateur reste responsable de ce qu'il fait et de respecter la loi de son pays.
   - **Vie privée** : les données restent sur l'appareil ; pas de compte ; ce qui part vers Claude (version claude.ai) et quand.
   - Outils → Repères garde les tableaux Athena (c'est un outil, pas un crédit) ; il renvoie vers À propos pour les sources.

4. **Bonorum : retirer les phrases qui disent que leur tableau est faux.**
   - Supprimer en FR, EN et DE `sNote3`, `note4` et toute mention « faux d'un facteur 10 » / « off by a factor of 10 » / « liegt um den Faktor 10 daneben ». Les remplacer, là où une explication reste utile, par une phrase neutre : « Durées calculées avec la formule volume ÷ débit. »
   - Le calcul ne change pas (on garde la formule). Le commentaire dans le code peut rester, formulé de façon neutre.
   - Les libellés « Méthode Bonorum » dans l'interface deviennent « Mode capteur » ; le nom Bonorum n'apparaît plus que dans l'ⓘ et dans la page À propos.

5. Même traitement pour les autres noms dans les libellés : l'interface dit ce que fait l'outil (« Recette du bidon », « Méthode manuelle »), le nom de la source est dans l'ⓘ et dans À propos. **Exception** : le nom des produits Athena (Pro Core, Fade, Balance…) reste visible partout, puisque c'est ce que l'utilisateur achète et verse.

6. Tests : plus aucune chaîne « Sources : » visible hors de la page À propos ; plus de « facteur 10 » dans les trois langues ; chaque outil qui affichait une source a une ⓘ ; parité des clés i18n.

7. **Fin de lot** (règles de `CLAUDE.md`) : tests verts, captures FR/EN/DE (un outil avec son ⓘ ouvert, la page À propos), README, CHANGELOG et état du build dans le même commit, push sur `main` **sans** `[deploy]`, republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
