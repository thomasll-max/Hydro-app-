# Prompt lot 15 : corrections après la mise en ligne du 20/10 (parcours d'un nouvel utilisateur)

À lancer dans Claude Code **tout de suite**, une seule session à la fois. Priorité haute : Thomas et ses amis sont bloqués dans la version en ligne. Un commit par correctif (15a, 15b…).

Retour de Thomas (20/10/2026, sur hydrotom.netlify.app) : « beaucoup de bugs », « je ne peux pas aller plus loin que la création du cycle ».

Reproduit le 20/10 sur `dist-local` (même code que la mise en ligne `3387094`), Chromium mobile 390 px, profil vide. Les scripts sont à refaire dans `scripts/e2e-15.py` (même style que les autres `e2e-*.py`).

---

## 15a : création du cycle (bloquant)

**Bug 1 : en passant l'assistant, on tourne en rond.**
1. Profil vide → « Passer l'assistant (je règle tout moi-même) ».
2. Aujourd'hui affiche « Aucun espace pour l'instant » et un bouton **« Créer le cycle »**.
3. La feuille « Nouveau cycle » ne demande **aucun espace**. Enregistrer → toast « Enregistré », Premiers pas passe à 1/3…
4. … mais Aujourd'hui affiche toujours « Aucun espace pour l'instant · Créer le cycle ». Le cycle existe sans espace et n'apparaît nulle part. L'utilisateur recrée un cycle, encore et encore.

À corriger :
- Sans espace, l'état vide propose d'abord **« Créer un espace »** (nom + modèle, comme l'étape 2 de l'assistant), puis seulement le cycle.
- La feuille « Nouveau cycle » contient un **choix d'espace** (pré-rempli avec l'espace ouvert, ou le seul espace). S'il n'y a aucun espace, elle propose d'en créer un dans la même feuille. Un cycle ne peut plus être enregistré sans espace.
- **Données déjà créées** : un cycle sans `spaceId` s'affiche sur Aujourd'hui dans une ligne « Cycle sans espace : choisir son espace » qui ouvre le choix. Aucune donnée perdue, aucun identifiant renommé.

**Bug 2 : dans l'assistant, l'étape « Premier cycle » bloque sans le dire clairement.**
1. Assistant → étape 6 « Premier cycle » → « Créer le premier cycle » → remplir le nom, laisser les pots vides → « Suivant ».
2. Rien ne se passe en apparence : le message « Indique le volume et le nombre de pots du cycle » s'affiche **en bas de la page**, sous le texte d'arrosage, souvent hors de l'écran sur téléphone (clavier ouvert).
3. À l'inverse, la date de germination peut rester vide sans erreur, alors que la feuille « Nouveau cycle » la dit **obligatoire**.

À corriger, selon la décision du lot 10b (« création de cycle minimale : nom, variété(s), espace, date de départ ; le reste est facultatif ») :
- **Pots facultatifs** dans l'assistant comme dans la feuille. Sans pots : « donnée manquante » là où ils servent (arrosage), et la ligne « Tes pots » reste dans Premiers pas.
- **Date de départ obligatoire** partout, avec la même règle et le même texte.
- Toute erreur de formulaire s'affiche **sous le champ concerné**, en couleur « à surveiller », la page **défile jusqu'au champ** et lui donne le focus. Jamais de message seulement en bas de page.
- Tester les deux chemins (assistant et feuille) avec : champs vides, virgule décimale (« 15,5 »), date vide, date dans le futur.

## 15b : valeurs absurdes acceptées dans la saisie du jour

Reproduit : saisie avec pot matin 24 kg et pot pic 20 kg, pH runoff 13,1, T° jour 400 →
- dryback **−20 %** enregistré et tracé ;
- pH runoff **13,1** enregistré (le message « Maintenant » propose même d'en tenir compte) ;
- VPD **28 654,56** affiché dans le Journal.

À corriger :
- Réutiliser les **plages de plausibilité** du lot 11 (pH 3–9, EC 0–6, T° 5–40, HR 10–100, poids 0–50 kg, runoff 0–100 %, hauteur 0–400 cm…) pour **toute** saisie, pas seulement la dictée.
- Hors plage : message sous le champ, enregistrement bloqué tant que la valeur n'est pas corrigée (pas de case « forcer »).
- **Pot pic plus léger que pot matin** : message sous les deux champs (« le pic doit être plus lourd que le matin : inversés ? »), dryback non calculé.
- Les valeurs dérivées (dryback, VPD, DLI, runoff %) ne s'affichent jamais hors de leur plage possible : sinon « — » et un repère.
- Données déjà enregistrées hors plage : elles restent (rien n'est effacé), mais sont marquées « valeur douteuse » dans le Journal et exclues des moyennes, des verdicts de semaine, des bilans et du bloc « Maintenant ».

## 15c : petits défauts vus pendant le tour

- **Bandeau Premiers pas** : le texte de l'étape est passé en minuscules (« ta lampe : watts réels (et ppf ou efficacité… ») → garder la casse d'origine (« PPF »), ne mettre en minuscule que la première lettre si besoin.
- **Premiers pas après l'assistant** : vérifier que chaque ligne se coche quand l'info a été saisie dans l'assistant (cycle, pots, lampe, réservoir…). Au 20/10, avec un cycle et des pots saisis dans l'assistant, le compteur restait à 1/7 et « Tes pots » n'était pas coché.
- Après « Terminer », l'assistant ouvre **Outils → Premiers pas**. Vérifier que c'est voulu ; sinon ouvrir **Aujourd'hui** (le bandeau Premiers pas y est déjà).

## 15d : parcours complet d'un nouvel utilisateur (test de non-régression)

Écrire `scripts/e2e-15.py` qui joue, sur profil vide, en FR puis en EN, à 390 px, **sans erreur console** :
1. assistant complet (avec cycle, sans pots) → Aujourd'hui montre l'espace et le cycle ;
2. assistant passé → créer un espace → créer un cycle → le cycle apparaît ;
3. saisie du jour valide → Journal (semaine, page de la semaine), Graphiques, bloc « Maintenant » cohérents ;
4. saisie avec valeurs absurdes → refusée avec message sous le champ ;
5. nouveau bidon (Pro Line puis Blended dans un autre espace) ;
6. calendrier, rappel, Réglages, À propos, sauvegarde export puis import ;
7. rechargement de la page : tout est toujours là.

Le lancer avant chaque mise en ligne (à noter dans `CLAUDE.md`, section fin de lot).

## Fin de lot

- Tests verts + `scripts/e2e-15.py` vert + simulation d'un an sans plantage.
- README, CHANGELOG et état du build dans le même commit.
- Push sur `main`. **Thomas demande une mise en ligne Netlify une fois 15a et 15b faits** : `git commit --allow-empty -m "Mise en ligne [deploy]"` puis push, et le noter dans l'état du build.
- Republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`).
