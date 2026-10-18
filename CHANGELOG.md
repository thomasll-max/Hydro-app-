# Changelog

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
