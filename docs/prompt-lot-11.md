# Prompt lot 11 : saisie vocale (« dicter le journal à Claude »)

À lancer dans Claude Code **après les lots 10k et 10l** (cochés), une seule session à la fois. Si le lot est trop gros, le couper en 11a (dictée + extraction + enregistrement) et 11b (version Netlify sans IA).

Demande de Thomas : « Si je peux lâcher toutes les infos à Claude en lisant mes résultats et qu'il complète tout seul le journal, ce serait top. »

---

0. Vérifie que 10k et 10l sont cochés dans `docs/etat-du-build.md`. Puis `git pull`, `npm ci`, `npm test`. Ajoute la ligne « [ ] Lot 11 » dans l'état du build.

1. **Point d'entrée**
   - Dans la feuille « Saisie du jour », en haut : un bouton secondaire « Dicter » (icône micro).
   - Il ouvre un panneau avec une grande zone de texte et, si le navigateur le permet, un bouton micro.
   - Micro : reconnaissance vocale du navigateur (`SpeechRecognition` / `webkitSpeechRecognition`), dans la langue de l'app (fr-FR, en-US, de-DE), en continu, avec le texte qui s'affiche au fur et à mesure. Si l'API est absente (Brave, Firefox) ou si le micro est refusé, le bouton micro disparaît et un message court dit d'utiliser le micro du clavier du téléphone dans la zone de texte. La zone de texte marche toujours, au clavier ou en collant du texte.
   - Dans l'artefact claude.ai, vérifier si le micro est autorisé dans le cadre de la page. Sinon, rester sur la dictée au clavier. **Ne pas redéclarer les capacités de l'artefact** sans l'accord de Thomas : si une capacité « micro » est nécessaire, le noter dans l'état du build et lui demander.

2. **Extraction par Claude** (version claude.ai seulement, avec le même mécanisme que « Demander à Claude », `src/calc/ask.ts`)
   - Bouton « Remplir le journal ». Le texte dicté part à Claude avec :
     - la liste exacte des champs de la saisie du jour de l'espace choisi, avec leurs unités (selon sa méthode de dryback, la nutrition de l'espace, les plantes du cycle) ;
     - la date du jour et les espaces existants (nom, id) ;
     - la consigne de répondre **uniquement en JSON** selon un schéma fixe.
   - Règles données à Claude, à tester :
     - ne remplir **que** ce que Thomas a dit, sans rien déduire, calculer ni compléter. Les champs calculés (VPD, DLI, dryback, % runoff) restent calculés par l'app, pas par Claude ;
     - nombres à la française compris (« deux virgule huit », « 5,9 », « cinq neuf » pour un pH) ;
     - si un espace ou une plante est nommé, l'utiliser. Sinon, l'espace ouvert. S'il y a doute, ne pas choisir et le signaler ;
     - observations et actions : seulement les étiquettes qui existent déjà (`ObsTag`, `ActionTag`), sinon le texte va dans la note ;
     - tout ce qui n'entre dans aucun champ va dans la note, avec les mots de Thomas ;
     - un champ `doutes` liste ce qui est ambigu (mot mal compris, unité absente, valeur hors plage).
   - Côté app, valider la réponse : schéma strict, champs inconnus ignorés, nombres dans des **plages de plausibilité** (pH 3–9, EC 0–6, T° 5–40, HR 10–100, poids 0–50 kg, runoff 0–100 %, hauteur 0–400 cm…). Une valeur hors plage n'est jamais enregistrée et devient un doute.

3. **Enregistrement « tout seul »** (choix de Thomas)
   - Si **aucun doute** : la saisie est enregistrée directement, fusionnée avec la saisie du jour si elle existe (les champs dictés remplacent, les autres restent). Un toast « Journal rempli : 7 valeurs · Annuler » reste 10 secondes ; « Annuler » remet la saisie exactement comme avant.
   - S'il y a **des doutes** : rien n'est enregistré. La feuille de saisie s'ouvre pré-remplie, les champs douteux sont marqués « à surveiller » avec la phrase entendue dessous. Thomas corrige et enregistre.
   - Réglage « Relire avant d'enregistrer » (désactivé par défaut) : s'il est activé, on passe toujours par la feuille pré-remplie.
   - La saisie garde la trace : `source: "voice"` et le texte dicté dans un champ à part (pas dans la note), visible dans le détail du jour. Pas de nouvel identifiant de stockage ; `schemaVersion` et la migration si le type change.
   - Un mélange (« bidon de 40 L, EC 2,9, pH 5,8 ») crée ou complète le bidon du jour seulement si Thomas parle clairement d'un bidon. Sinon, ce sont les valeurs de la solution dans la saisie.

4. **Version Netlify (11b)** : pas d'IA, pas de clé API. Même panneau. Un analyseur à règles reconnaît les formes simples (« EC 2,8 », « pH 5,9 », « runoff 15 % », « température 25 », « humidité 60 », « poids matin 4,2 ») en FR, EN et DE. Tout le reste va dans la note. Ici, **toujours** la feuille pré-remplie, jamais d'enregistrement direct.

5. **Tests**
   - Validation du JSON : schéma, plages, champs inconnus, doutes.
   - Fusion avec une saisie existante et annulation.
   - Analyseur à règles : au moins 20 phrases en FR, 10 en EN, 10 en DE, dont des pièges (« pH 59 », « EC deux huit », valeurs sans unité).
   - Le prompt envoyé à Claude ne contient aucune valeur inventée (test sur le texte généré, comme pour `ask.ts`).

6. **Fin de lot** (règles de `CLAUDE.md`)
   - Tests verts.
   - Captures : panneau de dictée, toast, feuille pré-remplie avec doutes.
   - README, CHANGELOG et état du build dans le même commit.
   - Push sur `main` **sans** `[deploy]`.
   - Republication de l'artefact sans redéclarer les capacités.

Rappels :
- n'invente aucune valeur ;
- ne mélange jamais Pro Line et Blended ;
- ne renomme aucun identifiant technique (base `hydro`, clés `hydro.*`, format `hydro-backup`) ;
- pas de mise en ligne Netlify sans demande de Thomas.
