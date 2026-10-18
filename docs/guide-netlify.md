# Relier Netlify à GitHub (version des amis)

À faire **une seule fois** par Thomas. Ensuite, chaque push sur `main` republie la version des amis toute seule. La session Claude n'a pas accès à Netlify : ces étapes se font à la main.

## Ce qui est déjà prêt dans le dépôt
- `netlify.toml` : commande `npm run build:local`, dossier publié `dist-local`, Node 22, en-têtes « pas de cache » pour la page (`/`, `index.html`), `sw.js` et le manifeste (les mises à jour arrivent tout de suite).
- `pwa/` : manifeste, service worker (réseau d'abord, cache si hors ligne), icônes.
- La version locale garde tout dans le téléphone (IndexedDB) : Netlify ne sert que des fichiers, il ne voit aucune donnée.

## Étapes
1. Va sur https://app.netlify.com et connecte-toi avec ton compte GitHub.
2. **Add new site → Import an existing project → GitHub**.
3. Autorise l'app Netlify sur GitHub. Le dépôt est **privé** : dans la fenêtre GitHub, donne-lui l'accès à `thomasll-max/Hydro-app-` (« Only select repositories »).
4. Choisis le dépôt `thomasll-max/Hydro-app-`, branche **`main`**.
5. Réglages de build : Netlify lit `netlify.toml`, rien à changer (commande `npm run build:local`, dossier `dist-local`). Laisse les variables d'environnement vides.
6. **Deploy**. Le premier build prend 1 à 2 minutes.
7. **Site configuration → Change site name** : par exemple `hydro-thomas` → l'adresse devient `https://hydro-thomas.netlify.app`.
8. Ouvre l'adresse sur ton téléphone : l'assistant de premier lancement doit s'afficher. Installe-la (Partager → Sur l'écran d'accueil) et vérifie qu'elle s'ouvre en mode avion.
9. Envoie l'adresse et `docs/guide-amis.md` à tes amis.

## Ensuite
- **Mises à jour** : chaque commit sur `main` relance un build ; les amis l'ont à la prochaine ouverture avec du réseau.
- **Build en échec** : Netlify → Deploys → le build rouge → « Deploy log ». La même commande se lance en local avec `npm run build:local`.
- **Revenir en arrière** : Deploys → un ancien déploiement → « Publish deploy ».
- **Domaine perso** (facultatif) : Domain management → Add a domain.
- L'adresse est publique (qui a le lien peut ouvrir l'app), mais chaque téléphone a ses propres données : personne ne voit le grow des autres.
