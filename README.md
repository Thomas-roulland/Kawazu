# Kawazu — Ninja du marais

RPG navigateur en pixel art (HTML, Canvas et JavaScript, sans dépendance), inspiré de Shakes & Fidget :
on crée sa grenouille, on la prépare au camp, puis on avance monde par monde en duels au tour par tour
ou en expéditions en temps réel.

## Lancer

Avec les comptes (il faut [Node.js](https://nodejs.org) 18 ou plus, aucune installation de paquet) :

```bash
node server/server.js
```

puis ouvrir http://localhost:8765. Le port se change avec la variable `PORT`.

Sans serveur, pour jouer seul en local : double-cliquer sur `jeu.html`.

## Page d’accueil et comptes

- `index.html` : une **cinématique** en pixel art (les vrais décors du jeu) qui raconte l’histoire de la
  grenouille, puis l’écran titre. Un seul bouton, en haut à droite : **Connexion / Inscription**.
  Les phrases de la cinématique sont provisoires, en attendant le lore.
- Un compte = un pseudo et un mot de passe, et jusqu’à **5 grenouilles**. On choisit sa grenouille, on
  joue (`jeu.html?grenouille=…`) et la partie est **sauvegardée sur le serveur** après chaque changement :
  on la retrouve depuis n’importe quel appareil.
- L’API des comptes (`server/api.js`, Node pur) range tout dans un magasin clé → valeur : des fichiers
  JSON dans `server/data/kv/` en local, **Upstash Redis** en ligne. Les mots de passe n’y sont jamais en
  clair (scrypt + sel), la session tient dans un cookie `HttpOnly`, et les essais de mot de passe sont
  freinés. Derrière HTTPS en local, lancer avec `COOKIE_SECURE=1`.
- `server/data/` est exclu de git (`.gitignore`) : les comptes des joueurs ne partent jamais sur GitHub.

### Mettre le jeu en ligne (gratuit : Vercel + Upstash)

Vercel sert les pages et fait tourner l’API en fonctions (`api/index.js`, qui appelle `server/api.js`) ;
Upstash Redis garde les comptes et les parties. Les deux ont une offre gratuite qui ne se met pas en veille
(Vercel Hobby : usage personnel, non commercial). Chaque `git push` sur `main` redéploie le jeu.

1. Sur [vercel.com](https://vercel.com), se connecter avec GitHub, puis **Add New… → Project** et importer
   le dépôt `Kawazu`. Réglages par défaut (pas de framework, pas de commande de build) → **Deploy**.
2. Dans le projet : **Storage → Create Database → Upstash for Redis** (offre gratuite), puis la relier au
   projet. Vercel ajoute tout seul les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
3. **Deployments → … → Redeploy** pour que l’API voie la base. Le jeu est en ligne à l’adresse
   `https://<projet>.vercel.app` : c’est ce lien qu’on partage.

Sans la base, l’API répond « La base de données du jeu n’est pas branchée ». Pour tester l’API en local avec
Upstash, définir `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` avant `node server/server.js`.

## Création et sauvegarde (hors ligne)

- Dans `jeu.html` sans compte : choix du **nom** et de la **couleur** de la grenouille (6 teintes).
- La partie est enregistrée automatiquement dans le navigateur (`localStorage`, clé `kawazu.save`).
  Chaque adresse a sa propre sauvegarde : `file://` et `localhost` ne la partagent pas.
- Bouton disquette du menu : **exporter** la partie dans un fichier `.json`, l’**importer** ailleurs,
  ou recommencer une nouvelle partie. Les anciennes sauvegardes sont migrées.

## Le menu

Menu latéral en bois, en trois groupes : **ta grenouille** (Camp, Personnage, La Voie, Boutique), **les aventures**
(Carte du monde, Tour des Sages, Cascade des duels) et **la collection** (Album, Classement). En bas : sauvegarde, son (touche M).
Les **lucioles** sont la monnaie du jeu.

- **Camp** : grande scène en trois couches (profondeur à la souris), la grenouille au centre ; le décor prend
  l’ambiance du biome en cours (lagune, saules d’automne, grotte, ruines englouties, sommet enneigé),
  et un panneau « Aventure » pour reprendre le monde en cours. **Méditation** : la grenouille s’assoit sur un nénuphar,
  les yeux fermés, et gagne un peu d’XP et de lucioles même quand on n’est pas là (par heure, environ la moitié
  de l’XP d’un combat de son niveau ; 10 h au plus). On récolte en la faisant se lever ou en revenant (elle continue
  alors de méditer) ; un combat ou une mission la fait se lever.
- **Personnage** : la grenouille dans un cadre simple (sans décor, juste son ombre), ses 5 emplacements autour
  (tête, arme, écharpe, **ceinture**, anneau : l'écharpe et la ceinture changent de couleur sur le sprite),
  les caractéristiques en cartes détaillées (base de la voie, points répartis × la voie, dalles du Temple, objets ;
  ce que la stat donne et la règle, « + » pour répartir les points), la fiche **En combat** (PV, dégâts, critique,
  esquive, initiative, puissance et relance des sorts, passifs : chaque chiffre avec son calcul), les **hauts faits**
  et les **passifs** débloqués, et l'inventaire (filtres Corps à corps / Distance).
- **La Voie** : le **Temple des voies**, en plein écran. On choisit d’abord sa voie en **plongeant** dans l’une des trois
  flaques : c’est **définitif** (« Changer de voie » ou le Thé de l’oubli font tout oublier et rendent les points,
  contre 80 lucioles). Chaque voie a ses **caractéristiques de départ**, un **attribut principal** (celui qui fait les
  dégâts, compté ×2 quand on y met un point ; la Vitalité compte ×1,5) et ses traits :
  - **Voie des Armes** (corps à corps : bâtons, harpons, **katanas**, **masses**) : Force ; endurance ×1,1 et une armure
    qui grandit avec le niveau ;
  - **Voie du Lancer** (distance : kunaïs, **shurikens**, qui donnent de l’Agilité) : Agilité ; critique, esquive et
    initiative, des lancers qui ne ratent jamais ;
  - **Voie de l’Ermite** (mains nues, qui donnent de l’Esprit) : Esprit ; sorts plus puissants qui reviennent plus vite,
    une petite armure. Mode Ermite : peau orange, yeux de crapaud, plus d’arme ; paumes, **coups de pied** et **coups de boule**.

  Une voie ne manie que sa famille d’armes. Elle offre **trois branches de 10 dalles** (sorts aux étapes 1, 4, 7, 10 ;
  caractéristiques aux étapes 2, 5, 8 ; passifs aux étapes 3, 6, 9) qui **se rejoignent sur la dalle-sommet** (niveau 90,
  15 points : un sort ultime et un grand passif) :
  - Armes : Bâton de jade (ondes, étourdissements, garde), Katana (entailles, saignement, iaï, critiques), Colosse
    (fracas, séisme, cri de guerre, croissance, bouclier) → sommet **Maître d’armes** (Tempête d’acier) ;
  - Lancer : Kunaï (rafales, marque, pluie de kunaïs), Shuriken d’eau (étoile d’eau, prison d’eau, shuriken géant,
    tourbillon), Ombre (poison, pas de l’ombre, nuage toxique, clone d’ombre) → sommet **Œil du tireur** (Déluge de lames) ;
  - Ermite : Paume (paumes d’énergie, coassement, paume géante, orbe), Pieds et tête (coup de pied, coup de boule,
    pied retourné, chute du crapaud), Crapaud sage (langue, soins, peau de rosée, huile du mont Kaeru) → sommet
    **Mode Sage** (Kumite du Sage).

  L’étape n coûte n points (niveau 1 à 75) ; la grenouille avance de dalle en dalle et l’eau des branches apprises prend
  la couleur de la voie. Un **deck** de 4 sorts accompagne l’attaque de base de l’arme (Coup de bâton, Estoc,
  Entaille, Coup de masse, Lancer de kunaï, Lancer de shurikens, Frappe du crapaud).
- **Carte du monde** : un continent détaillé (arbres, rochers, cristaux, monuments), une région par biome (Marais-Brume, Lagune
  des Lucioles, Forêt des Saules, Grottes Luisantes, Temple Englouti, Sommet du Héron).
  Un **sentier** traverse chaque région avec ses 10 étapes (réussies, prochaine, gardiens, boss) ;
  la grenouille avance dessus à chaque victoire. Les terres fermées sont sous la **brume** : on ne voit qu’un bout de la suivante, et la vue se recadre
  sur ce qui est découvert. Chaque région a 10 étapes (gardiens aux étapes 4 et 7, boss à la 10e) ; battre le
  boss ouvre la région suivante. Un clic sur une étape ouvre son panneau, directement sur la carte : un **combat** (XP, lucioles, chance d’objet) ou une **expédition** en temps réel
  (30 s, 1 min 30 ou 4 min) qui rapporte sans combattre, mais bloque les combats pendant ce temps.
- **Boutique** : l’intérieur de la cabane de l’Aïeule Gamako, en plein écran. Ses objets sont posés
  sur l’étal du comptoir ; la fiche de l’objet choisi se pose en bas, sur les planches du comptoir (stats comparées à ton
  équipement). Gamako parle en **animalese**, comme dans Animal Crossing (une petite syllabe chantée par lettre, la bulle
  s’écrit en même temps) ; un clic sur elle lui fait raconter autre chose. Elle vend 5 objets (nouvel étal pour
  25 lucioles) et le **Thé de l’oubli**, qui rend tous les points de voie.
- **Tour des Sages** : **la Tour des Cent Sages**, « les Épreuves des Anciens Sages », au sommet du mont Kaeru.
  La tour est une **pagode dessinée en pixel art** étage par étage (toits de tuiles de jade aux coins relevés, murs
  de papier aux fenêtres allumées, piliers laqués, balcons et lanternes ; toit d’or pour les Grands Sages), posée
  dans un bassin entre deux falaises d’où tombent des **cascades animées** ; le ciel change tous les dix étages et
  les étages du haut se perdent dans les nuages. La molette fait monter et descendre la vue ; chaque
  étage montre son sage devant la porte, et un repère « TU ES ICI » désigne l’étage à conquérir. La fiche de
  l’étage choisi donne le sage (force comparée à la tienne, sorts, récompense) et tout ce que la tour a déjà rapporté
  (lucioles, XP, et les dix trésors, obtenus ou à gagner).
  Chaque étage est gardé par un **ancien sage grenouille**, un vrai combattant (niveau, points, voie, dalles du
  temple, sorts, équipement), de plus en plus fort (niveau 3 au 1er étage, 145 au 100e). Tous les 10 étages, un
  **Grand Sage** (Doyenne Hasuno, Maître Iwagama… jusqu’au Premier Sage) garde un **trésor** : 10 objets exclusifs.
  Première victoire sur un étage : lucioles et XP ; on peut rejouer les étages conquis, sans récompense.
- **Cascade des duels** (avec un compte, sauf l’entraînement) : deux rochers de part et d’autre d’une grande
  cascade, dans une gorge de jade : ta grenouille sur le rocher de gauche, l’adversaire choisi sur celui d’en face,
  animées, chacune avec sa plaque. En bas, ta fiche et celle de l’adversaire (◀ ▶ pour en changer), avec le
  face-à-face des stats (PV, dégâts, agilité, critique, esquive) ; le journal est en haut. Deux onglets.
  - **Duels** : trois adversaires proches en réputation, qui sont les grenouilles des autres joueurs, avec leur
    vrai équipement (stats tirées comprises), leurs points, leur voie et leur deck, joués par l’ordinateur. On peut
    aussi affronter **ses propres autres grenouilles, chacune une fois par jour**. Une victoire rapporte de 4 à 30
    points de **réputation** et un peu d’XP ; une défaite en coûte un peu, jamais sous zéro. La grenouille défiée
    gagne ou perd la moitié en défense, et le **journal** raconte les défis lancés et reçus. **10 duels par jour** ;
    quitter un duel, c’est le perdre. **Cadeaux du lundi** (minuit, heure de Paris) pour les dix premières :
    400 lucioles et la **Ceinture du champion** pour la 1re, 250 lucioles et la **Ceinture de la cascade** pour les
    2e et 3e, puis 150 et 100 lucioles. Le classement des duels est dans la page Classement (onglet Duels).
  - **Entraînement** : l’**arbre d’entraînement**, 10 tours pour tester équipement, points et sorts, immobile ou
    qui riposte, puis le bilan (dégâts, par tour, meilleur coup, critiques, dégâts reçus). Sans récompense ni limite.
- **Album** : un grand **livre** à feuilleter : la page tourne vraiment autour de la reliure (flèches, touches ← →, ou les
  marque-pages en ruban de cuir sur la tranche : Sommaire, Bestiaire, Objets).
  Le sommaire donne les chapitres et les **récompenses** à réclamer (paliers de découvertes : lucioles, XP, et au
  bout l’Anneau du naturaliste et l’Écharpe du collectionneur). Puis une double page par **famille** : Limons,
  Moustiques, Champis, Chauves-souris, Boss des terres, Grands Sages ; Bâtons, Harpons, Katanas, Masses, Kunaïs, Shurikens, Couvre-chefs,
  Écharpes, Ceintures, Anneaux, Trésors. Chaque créature (dans ses trois raretés) et chaque objet y est une
  **carte à collectionner** au cadre de sa rareté ; une carte pas encore trouvée montre son dos et un indice.
- **Classement** : une liste simple et sobre, aux couleurs du jeu : les **50 premières** grenouilles puis « Afficher la suite »
  (et « Aller à ma place »). Tri par Aventure, Niveau, Succès, Tour ou Duels (avec les cadeaux du lundi), filtre par
  voie ; un clic sur une ligne déplie sa fiche (voie, dalles, sorts, terres, équipement).

## Objets et raretés

- **3 raretés**, reconnaissables à leur bordure : **Commun** (gris), **Rare** (bleu), **Épique** (violet). Les trésors
  (tour, dojo, album) ont des stats fixes et comptent comme épiques.
- Chaque objet trouvé ou acheté est un **exemplaire unique** : ses stats sont **tirées au hasard** selon sa rareté
  (Rare : environ +35 % et parfois une stat en plus ; Épique : environ +75 % et deux stats en plus). Deux Bâtons de
  jade épiques n’ont donc pas les mêmes jets. On peut en avoir plusieurs, et vendre les autres.
- **Près de 80 modèles** (bâtons, harpons, katanas, masses, kunaïs, shurikens, chapeaux, écharpes, ceintures, anneaux), rangés par biome :
  plus on avance, plus les modèles sont forts. Butin : 72 % commun, 24 % rare, 4 % épique (bien mieux sur un boss
  ou un monstre rare). L’étal de l’Aïeule Gamako tire aussi ses objets dans les trois raretés.
- **Monstres rares et épiques** : un combat normal peut tomber sur une variante rare (16 %) ou épique (4 %),
  recolorée et entourée d’une aura, plus coriace et bien mieux récompensée.

## Le combat

L’arène fait 400×225 pixels et ne remplit pas tout l’écran : elle est cadrée au centre, entourée de son propre décor
flouté. Les combattants paraissent moins gros, les secousses restent douces.

Duel 1 contre 1 au tour par tour, en plein écran. L’Agilité donne plus de chances de jouer en premier (la plus agile
commence plus souvent, pas toujours).

- Plus de réserve à gérer : chaque sort a son **temps de relance** en tours (l’attaque de base n’en a pas), que
  l’**Esprit** raccourcit.
- Les sorts posent des effets : **saignement**, **poison**, **marque** (+30 % de dégâts reçus), **étourdissement**,
  **affaiblissement** (−30 % de dégâts), **garde** (et riposte), **ombre** (esquive sûre puis critique), **bouclier**,
  soins, vol de vie. Les passifs du Temple ajoutent riposte, flux (une relance qui saute), enchaînement, coup de grâce…
- Chaque sort a son **animation** : entailles et iaï du katana, séisme, moulinet, étoiles d’eau qui éclaboussent, bulle
  d’eau, tourbillon de shurikens, clone d’ombre, pluie de kunaïs, paume géante, orbe d’énergie, coup de pied sauté,
  coup de boule, langue fouet…
- Les ennemis ont leurs tactiques : charges préparées, vol de vie, englue (les sorts en relance prennent un tour de plus),
  rage des boss sous la moitié de leur vie. Les grenouilles adverses (duels, tour) jouent leurs sorts avec les mêmes règles.
- **Auto** (touche A) ; vitesse **×1 / ×2 / ×4** ; touches 1-5 pour l’attaque de base et les sorts.
- **Météo** selon l’étape : Pleine lune, Brume épaisse, Averse (relances plus rapides), Nuit sans lune, Canicule
  (sorts en relance au départ).
- Montée de niveau : +3 points de caractéristique, +1 point de voie.

Caractéristiques : **Vitalité** → PV (40 + 14 par point) ; l’**attribut principal** → dégâts (2 + 0,9 par point ; hors
Voie des Armes, la Force ajoute 0,4 par point) ; **Agilité** → critique, esquive et initiative, à rendement décroissant
(il en faut plus à mesure que le niveau monte) ; **Esprit** → puissance des sorts (jusqu’à +40 %) et relance (−1 tour à 60
et à 200 ; un soin ne gagne qu’un tour, et ne profite pas de la puissance des sorts). Après un étourdissement, on ne peut
plus être étourdi au tour suivant.

**Équilibrage** : les voies ont été réglées avec un simulateur qui rejoue les règles du combat (des milliers de duels
par niveau, de 5 à 200) : entre voies, chaque duel tombe à peu près entre 35 et 65 % de victoires. Les sages de la
tour choisissent leurs 4 meilleurs sorts, et les monstres ont été renforcés (×2,2 PV, ×2,6 dégâts) pour suivre la
puissance des voies.

## Structure

- `index.html`, `src/accueil.js`, `src/accueil.css` : la page d’accueil (cinématique, compte, grenouilles)
- `jeu.html`, `src/style.css` : le jeu, ses pages et son style (bois, dorures, parchemin)
- `server/api.js` : l’API des comptes et des sauvegardes (fichiers en local, Upstash Redis en ligne) ; `server/server.js` : le serveur local ; `api/index.js` et `vercel.json` : la même API sur Vercel ; `src/cloud.js` : la liaison du jeu avec elle
- `docs/codex-kawazu.html` : l’état des lieux de l’univers, pour le lore
- `src/tower.js` : la Tour des Cent Sages (les sages, leurs récompenses, la pagode et ses cascades, l’arène) ; `src/album.js` : le bestiaire, les objets, les chapitres du livre et les paliers
- `src/cascade.js` : le décor de la Cascade des duels (page et arène, eau animée) ; les duels eux-mêmes sont dans `src/hub.js` et `src/battle.js` (et côté serveur, les routes `/api/dojo`)
- `src/audio.js` : musique lo-fi générée en continu (plus rythmée en combat), musique 8 bits de la cinématique, bruitages et ambiance du marais, le tout synthétisé en Web Audio
- `src/sprites.js` : Kawazu et ses animations, repris de la maquette Claude Design
- `src/looks.js` : équipement visible, ondes de choc, kunaï lancé, espèces de monstres
- `src/biomes.js` : les 6 biomes (décor, monstres, boss)
- `src/skills.js` : les voies, leurs sorts, le Temple (3 branches et la dalle-sommet) et le deck
- `src/feats.js` : hauts faits et leurs médailles
- `src/items.js` : objets, couleurs, stats, niveaux, prix, sauvegarde
- `src/worlds.js` : étapes des mondes, ennemis, météo, expéditions, boutique
- `src/tiles.js` : dessin des tuiles
- `src/map.js` : carte du monde et brume
- `src/shop.js` : décor animé de la boutique et Gamako
- `src/scene.js` : décor animé du camp et logo
- `src/battle.js` : le duel au tour par tour (`BattleScene.start`)
- `src/hub.js` : écran titre, création, menu et pages
