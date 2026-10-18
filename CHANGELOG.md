# Changelog

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
