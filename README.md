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

Menu latéral en bois, en trois groupes : **ta grenouille** (Camp, Personnage, La Voie, Boutique, Skins), **les aventures**
(Carte du monde, Tour des Sages, Donjons, Cascade des duels, Clans, le Titan) et **la collection** (Album, Classement). En bas : les touches
du clavier, la sauvegarde, le son (touche M). Les barres de défilement sont cachées sur petit écran et tactile, fines et
aux couleurs du jeu ailleurs ; les chiffres sont en Silkscreen (le 5 et le 8 ne se confondent plus).
Les **lucioles** sont la monnaie du jeu, les **éclats de jade** le métal de la forge ; les deux s’affichent sous la
grenouille, avec l’événement en cours (le week-end double XP).

- **Camp** : grande scène en trois couches (profondeur à la souris), la grenouille au centre ; le décor prend
  l’ambiance du biome en cours (lagune, saules d’automne, grotte, ruines englouties, sommet enneigé),
  et un panneau « Aventure » pour reprendre le monde en cours. **Méditation** : la grenouille s’assoit sur un nénuphar,
  les yeux fermés, et gagne un peu d’XP et de lucioles même quand on n’est pas là (par heure, environ la moitié
  de l’XP d’un combat de son niveau ; 10 h au plus). On récolte en la faisant se lever ou en revenant (elle continue
  alors de méditer) ; un combat ou une mission la fait se lever.
- **Personnage** : la grenouille dans un cadre simple (sans décor, juste son ombre), ses 5 emplacements autour
  (tête, arme, écharpe, **ceinture**, anneau : l'écharpe et la ceinture changent de couleur sur le sprite),
  les caractéristiques en cartes détaillées (base de la voie, points répartis × la voie, dalles du Temple, objets ;
  ce que la stat donne et la règle, « + » pour répartir les points), la fiche **En combat** en petites tuiles (PV,
  dégâts, critique, esquive, initiative, puissance et relance des sorts, dégâts reçus ; le calcul de chaque chiffre
  en infobulle, et les passifs sur une ligne), et l'inventaire sur toute la hauteur (filtres Corps à corps / Distance). « **Vendre en masse** » : on coche
  les objets (ou par rareté : communs, rares, tout), le total s'affiche et on vend d'un coup ; les objets équipés restent.
  Les cartes des caractéristiques mettent l’**attribut principal** en tête (en or), puis la **Vitalité** ; le reste est
  un bonus. « **Répartir pour moi** » place les points libres : 60 % dans l’attribut principal, 40 % en Vitalité.
  « **Répartir à nouveau** » rend gratuitement tous les points de caractéristique déjà placés (confirmé d’un second clic).
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

  On commence **à mains nues** : l’arme de départ vient avec le choix de la voie et de l’arme.
  Une voie ne manie que sa famille d’armes, et on y **choisit son arme** au Temple (Armes : bâton, harpon, katana ou masse ;
  Lancer : kunaï ou shuriken ; changer coûte 40 lucioles) : ensuite, on ne manie, ne trouve (butin, boutique) et ne voit
  (inventaire) plus que celle-là ; les icônes des sorts et les lancers (kunaïs ou shurikens) suivent l’arme choisie. L’Ermite ne trouve plus d’armes du tout. L’album ne compte que les objets qu’on peut
  avoir, et un trésor de la tour qui n’est pas ton arme est remplacé par sa valeur en lucioles. Elle offre **trois branches de 10 dalles** (sorts aux étapes 1, 4, 7, 10 ;
  caractéristiques aux étapes 2, 5, 8 ; passifs aux étapes 3, 6, 9) qui **se rejoignent sur la dalle-sommet** (niveau 90,
  15 points : un sort ultime et un grand passif) :
  - Armes : Onde de jade (ondes, étourdissements, garde), Lames (entailles, saignement, iaï, critiques), Colosse
    (fracas, séisme, cri de guerre, croissance, bouclier) → sommet **Maître d’armes** (Tempête d’acier) ;
  - Lancer : Rafales (lancers en rafale, marque, pluie de lames), Shuriken d’eau (étoile d’eau, prison d’eau, shuriken géant,
    tourbillon), Ombre (poison, pas de l’ombre, nuage toxique, clone d’ombre) → sommet **Œil du tireur** (Déluge de lames) ;
  - Ermite : Paume (paumes d’énergie, coassement, paume géante, orbe), Pieds et tête (coup de pied, coup de boule,
    pied retourné, chute du crapaud), Crapaud sage (langue, soins, peau de rosée, huile du mont Kaeru) → sommet
    **Mode Sage** (Kumite du Sage).

  L’étape n coûte n points (niveau 1 à 75) ; la grenouille avance de dalle en dalle et l’eau des branches apprises prend
  la couleur de la voie. Un **deck** de 4 sorts accompagne l’attaque de base de l’arme (Coup de bâton, Estoc,
  Entaille, Coup de masse, Lancer de kunaï, Lancer de shurikens, Frappe du crapaud).
  **Les Maîtrises** : une fois toutes les dalles de sa voie apprises, les points de voie vont dans quatre maîtrises
  sans fin — Force (+2 % de dégâts par rang), Carapace (+2 % de PV), Instinct (+1 % de critique), Souffle (+3 % de
  puissance des sorts) ; le rang r coûte 1 + r/4 points. Tous les 10 rangs, un sort du deck **s’éveille** (au choix,
  ✦) : un coup de plus s’il frappe plusieurs fois, sinon un tour de relance en moins (ou +30 % de puissance). Les
  Maîtrises et les éveils restent pour toujours, même après une mutation. Niveau maximum : 300.
- **Carte du monde** : une carte détaillée par île (arbres, rochers, cristaux, monuments), une région par biome. **L’Île
  du départ** (Marais-Brume, Lagune des Lucioles, Forêt des Saules, Grottes Luisantes, Temple Englouti, Sommet du
  Héron), puis, une fois le Héron vaincu, **le Continent**, et une fois le Dragon-Tempête vaincu, **l’Île des Colosses**
  (voir plus bas) ; une bascule passe de l’une à l’autre. Chaque île s’ouvre sur son film d’arrivée.
  Un **sentier** traverse chaque région avec ses 10 étapes (réussies, prochaine, gardiens, boss) ;
  la grenouille avance dessus à chaque victoire. Les terres fermées sont sous la **brume** : on ne voit qu’un bout de la suivante.
  La carte s’ouvre **centrée sur l’étape en cours** ; on la **promène** en la glissant (souris ou doigt), un bouton
  ramène à sa grenouille, et autour, la haute mer se répète à l’infini, en pixels : près du cadre, chaque carte
  redevient haute mer (les terres qui le touchaient y gagnent une côte qui serpente, les nuages de la brume s’effilochent
  avant le bord), pour s’y fondre sans coupure. Chaque région a 10 étapes (gardiens aux étapes 4 et 7, boss à la 10e) ; battre le
  boss ouvre la région suivante. Un clic sur une étape ouvre son panneau, directement sur la carte : un **combat** (XP, lucioles, chance d’objet) ou une **expédition** en temps réel
  (30 s, 1 min 30 ou 4 min) qui rapporte sans combattre, mais bloque les combats pendant ce temps.
- **Boutique** : l’intérieur de la cabane de l’Aïeule Gamako, en plein écran. Ses objets sont posés
  sur l’étal du comptoir ; la fiche de l’objet choisi se pose en bas, sur les planches du comptoir (stats comparées à ton
  équipement). Gamako parle en **animalese**, comme dans Animal Crossing (une petite syllabe chantée par lettre, la bulle
  s’écrit en même temps) ; un clic sur elle lui fait raconter autre chose. Elle vend 5 objets
  et le **Thé de l’oubli**, qui rend tous les points de voie. L’étal se renouvelle **chaque jour** ; on peut le relancer
  **5 fois par jour** au plus, et chaque relance coûte le double de la précédente (le prix de départ suit le niveau).
- **Skins** : une cabane en plein écran (planches, fenêtre ronde sous la lune, lanternes, portants de kimonos) ; la
  grenouille est **au milieu**, sur son tapis, et **essaie** le skin choisi (de face, de profil ou de dos, avec son
  équipement). **Trois skins par jour** sont en vente, tirés parmi les 30 et les mêmes pour tout le monde (renouvelés
  à minuit) : Gloupoison, Écumette, Pousse-Mare, Cogneur, Ombre-Lame, Grignote, Rouquin, Rempart, Maître Mousse,
  Parrain Vasard, et vingt de plus (Braise, Givrette, Nénuphette, Tourbe, Orchidée, Cuivre, Nuit étoilée, Citronnelle,
  Corsaire, Rōnin des Joncs, Lavande, Cendrillard, Arlequin, Dune, Moussaillon, Écorce, Perle des mers, Dard noir,
  Feu follet, Tonnerre), de 35 000 à 60 000 lucioles. Chacun a ses signes : le masque, les joues gonflées et les doigts luisants
  de Gloupoison, la collerette d’écume d’Écumette, la vrille de Pousse-Mare, les gants rouges et la ceinture de
  Cogneur, le masque de nuit et le foulard violet d’Ombre-Lame, les gilets de Grignote et de Rouquin, les cornes, l’obi
  et le bouclier de Rempart, la touffe et la cape de Maître Mousse, la pipe et la cicatrice du Parrain… Les skins achetés et les
  6 couleurs de départ se portent depuis la garde-robe. Le skin se voit partout, jusqu’au classement et aux clans.
  En mode Ermite, pour l’instant, la grenouille garde sa peau d’Ermite : elle voit les skins mais ne peut ni en
  acheter ni en changer. Les anciennes peaux ont été remboursées.
- **Tour des Sages** : **la Tour des Cent Sages**, « les Épreuves des Anciens Sages », au sommet du mont Kaeru.
  La tour est une **pagode dessinée en pixel art** étage par étage (toits de tuiles de jade aux coins relevés, murs
  de papier aux fenêtres allumées, piliers laqués, balcons et lanternes ; toit d’or pour les Grands Sages), posée
  dans un bassin entre deux falaises d’où tombent des **cascades animées** ; le ciel change tous les dix étages et
  les étages du haut se perdent dans les nuages. La molette fait monter et descendre la vue ; chaque
  étage montre son sage devant la porte, et un repère « TU ES ICI » désigne l’étage à conquérir. La fiche de
  l’étage choisi donne le sage (force comparée à la tienne, sorts, récompense) et tout ce que la tour a déjà rapporté
  (lucioles, XP, et les dix trésors, obtenus ou à gagner).
  Chaque étage est gardé par un **ancien sage grenouille**, un vrai combattant (niveau, points, voie, dalles du
  temple, sorts, équipement), de plus en plus fort (niveau 3 au 1er étage, 145 au 100e). Au-dessus, une fois les Cent
  Sages conquis : **la Tour des Ancêtres**, 500 étages de plus (101 à 600), **de nuit** (quatre ciels d’encre, de lune
  rouge ou d’aurore, pagode laquée de noir et de violet aux fenêtres d’esprits, cascades spectrales). Ses Ancêtres
  montent jusqu’au niveau 300 et frappent de plus en plus fort (+0,4 % par étage) ; bien plus de lucioles et d’XP ;
  tous les 10 étages un Ancêtre majeur, tous les 50 un **Grand Ancêtre** qui garde une **Relique** (dix Légendaires
  qu’on ne trouve que là : bandeaux, capes, anneaux, ceintures) ; au 600e, **le Premier Crapaud**, et sa peau d’obsidienne
  striée d’or (le skin « Premier Crapaud », jamais en boutique). Une bascule passe d’une tour à l’autre. Tous les 10 étages, un
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
- **Clans** (avec un compte) : les guildes du marais. Le chef donne des **rôles** : deux **bras droits** (ils excluent
  les membres, déclarent la guerre, dépensent le trésor et changent le blason) et trois **vétérans** (un titre
  d’honneur) ; il peut aussi **passer la main** (il devient bras droit), et si le chef part, un bras droit prend la
  suite. **Chaque assaut** contre l’Alpha rapporte des lucioles, de l’XP (plus on fait mal, plus il en rapporte) et
  une chance d’objet. Une fois le Savoir (XP) et la Bourse (lucioles) au plus haut, trois **bonus avancés** s’ouvrent :
  le Flair (+2 % de chances d’objet par niveau), la Force (+1 % de dégâts) et la Carapace (+1 % de PV) du clan. On **fonde** un clan (300 lucioles, un nom et un **blason** :
  5 icônes — grenouille, nénuphar, shuriken, katanas, lune —, 8 fonds et 6 couleurs de motif ; le chef peut le changer)
  ou on en **rejoint** un, jusqu’à **10 grenouilles** ; un chef qui part laisse sa place, un clan vide disparaît.
  Le **chef** peut **exclure** une grenouille (deux clics) : elle l’apprend en revenant et ne peut pas revenir avant 3 jours.
  - **L’Alpha** : une créature géante (Limon Alpha, Frelon Alpha, Champi Titan, Chauve-souris Alpha, Héron Alpha,
    puis leurs versions II, III…) aux **PV partagés** par tout le clan (20 000, puis ×1,6 à chaque Alpha abattu).
    Chaque grenouille l’attaque **2 fois par jour**, pendant **10 tours** : ses dégâts comptent, même à terre ou en
    fuyant. Sa force de frappe suit le niveau de celle qui l’attaque (un clan mêle petits et grands niveaux), un peu
    plus à chaque Alpha, et il s’enrage sous la moitié de ses PV. Quand il tombe, **chaque grenouille du clan qui l’a
    attaqué** reçoit sa part (300 lucioles, +200 par Alpha, et 30 % d’un niveau d’XP) : rejoindre un clan juste avant
    la chute, sans combattre, ne rapporte rien. Le clan gagne de la renommée, et un Alpha plus fort arrive.
  - **La guerre** : il faut **au moins 5 grenouilles** dans le clan ; son chef la déclare à un autre clan qui en a
    autant (et qui n’est pas déjà en guerre). Pendant **24 h**, chaque grenouille des deux camps (celles du jour de la
    déclaration) a **3 combats** contre les grenouilles d’en face, jouées par l’ordinateur avec leur vrai équipement.
    Une première victoire sur une grenouille vaut 3 points si elle est au moins de ton niveau, 2 sinon ; les suivantes,
    1 point. À la fin, le clan qui a le plus de points gagne 30 renommée (10 chacun en cas d’égalité) ; ses combattants
    reçoivent 400 lucioles et de l’XP, ceux d’en face 100 lucioles. Deux clans attendent 3 jours avant de se refaire la
    guerre ; quitter un combat, c’est le perdre.
  - **Le butin du clan** : un trésor, rempli par les **dons** des membres (100, 1 000 ou 10 000 lucioles d’un clic) et
    par une part du butin (chaque Alpha abattu y verse 500 lucioles, +300 par Alpha ; une guerre gagnée 2 000, une
    égalité 500). Le chef s’en sert pour améliorer **deux bonus** : le **Savoir du clan** (XP) et la **Bourse du clan**
    (lucioles), +2 % par niveau, 10 niveaux (+20 % au plus) ; un niveau coûte 2 000, puis 6 000, 12 000… 110 000.
    Les bonus s’appliquent à tous les membres : combats, expéditions, tour, méditation, et l’XP des duels et des guerres.
  - La page montre le clan (membres, leurs dégâts sur l’Alpha en cours, qui a sa part), la guerre (le score, le temps
    qui reste, les grenouilles d’en face, son journal) ou les clans à défier, l’Alpha, le classement des clans par
    renommée et le journal.
- **Album** : un grand **livre** à feuilleter : la page tourne vraiment autour de la reliure (flèches, touches ← →, ou les
  marque-pages en ruban de cuir sur la tranche : Sommaire, Bestiaire, Objets, Hauts faits). La dernière double page,
  **les Médailles**, range tous les hauts faits par catégorie (niveaux, combats, voie, objets ; boss et conquêtes) :
  en couleur ceux qu'on a gagnés, en silhouette (« ??? ») ceux qui restent, avec ce qu'il faut faire.
  Le sommaire donne les chapitres et les **récompenses** à réclamer (paliers de découvertes : lucioles, XP, et au
  bout l’Anneau du naturaliste et l’Écharpe du collectionneur). Puis une double page par **famille** : Limons,
  Moustiques, Champis, Chauves-souris, Boss des terres, Grands Sages ; Bâtons, Harpons, Katanas, Masses, Kunaïs, Shurikens, Couvre-chefs,
  Écharpes, Ceintures, Anneaux, Trésors. Chaque créature (dans ses trois raretés) et chaque objet y est une
  **carte à collectionner** au cadre de sa rareté ; une carte pas encore trouvée montre son dos et un indice.
- **Classement** : une liste simple et sobre, aux couleurs du jeu : les **50 premières** grenouilles puis « Afficher la suite »
  (et « Aller à ma place »). Tri par Aventure, Niveau, Succès, Tour, **Saison** ou Duels (avec les cadeaux du lundi), filtre par
  voie ; un clic sur une ligne déplie sa fiche (voie, dalles, sorts, terres, équipement).

## Le Continent, l’Île des Colosses, les cycles et la mutation

- **Le Grand Plongeon** : une fois le Héron Ancestral vaincu, une cinématique de 17 secondes (qu’on peut passer :
  bouton, Échap, Espace) : la grenouille au sommet à l’aube, au-dessus d’une mer de nuages, face au soleil qui se lève
  sur une terre inconnue ; elle bondit, tombe à travers les nuages, plonge (gerbe d’eau, cercles), coule entre les
  rayons, les poissons et les algues vers un tourbillon de lumière qui l’emporte, jaillit sur une plage, puis on
  s’élève au-dessus du **Continent** entier, et son nom s’écrit lettre après lettre (`src/cinematic.js`).
- **Le Continent** : **16 terres** de plus, loin des marais — Plaine des Vents, Champ de Bataille, Forêt d’Épines,
  Désert des Os, Canyon Rouge, Toundra Gelée, Volcan de Braise, Cimetière des Rois, Bois Féerique, Îles Célestes,
  Jungle Carnivore, Mines Noires, Forteresse de Fer, Marches de l’Abysse, Terres des Dragons et Trône de l’Orage — avec
  leurs décors (haies, palissades, grès, glace, lave, tombes, nuages, vide…), leur ambiance au camp et **14 nouvelles
  espèces** (rats, corbeaux, scarabées, serpents, scorpions, squelettes, fantômes, golems, salamandres, fées, plantes
  carnivores, loups, araignées, chevaliers) et un **dragon** pour les deux derniers boss. Niveaux 49 à 178.
- **Un rythme rapide** : l’XP d’un combat est une part d’un niveau du monstre (un ordinaire à ton niveau ≈ un quart
  de niveau, gardien ×1,8, boss ×3) : finir une terre fait gagner ~3,5 niveaux, une vingtaine de combats de plus font
  le reste (au lieu de heures de farm). Les objets du Continent montent fort de terre en terre, et le Rare (×1,5) et
  l’Épique (×2,1) pèsent : une trouvaille se sent (un boss passé à 34 % en commun l’est à ~80 % en rare).
- **Les Donjons**, comme dans Shakes & Fidget : trente donjons, un tous les dix niveaux de la grenouille (10 à 300),
  qu’on ouvre l’un après l’autre (le suivant s’ouvre quand le précédent est vidé et qu’on a son niveau). Une grande
  carte illustrée par donjon (sa salle, sa porte et son boss qui attend), qu’on fait glisser de l’une à l’autre ; à
  droite, le monstre de la prochaine salle et sa force comparée à la tienne. Dix salles, un gardien à la 5e, un boss au
  fond. Leurs **douze créatures n’existent nulle part ailleurs** (gargouille, mimique, spectre, liche, golem runique,
  minotaure, chimère, basilic, feu-follet, crâne flottant, hydre, œil flottant), et leurs **objets Uniques** non plus :
  dix modèles par donjon, à ses couleurs et à ses noms (« Couperet des Gargouilles »), une rareté vert rayonnant plus
  forte qu’un Épique (10 % par salle, 25 % au boss). Coriaces (réglés au simulateur : à leur niveau, il faut de bons
  objets pour la fin et le boss) ; une salle rapporte un peu plus d’un dixième de niveau, le boss la moitié d’un ; un
  donjon vidé, son boss se redéfie une fois par jour.
- **Une difficulté qui monte en pente douce** (réglée au simulateur, grenouille au niveau de l’étape, objets communs
  de sa terre) : sur l’île, les ordinaires restent du gibier, mais gardiens et boss demandent **un peu de farm** —
  boss gagnés ~100 % au Marais-Brume, puis 92, 80, 71, 60 et ~50 % pour le Héron (77 à 100 % avec 3 niveaux de plus).
  Le Continent prend la suite sans mur : sa force part de 80 % à la Plaine des Vents (un répit après le Héron) et monte
  jusqu’au boss de la Forêt d’Épines, puis un peu plus à chaque terre ; ses gardiens et ses boss demandent du butin
  rare ou épique, ou quelques niveaux.
- **Pas de raccourci en farmant trop bas** : l’XP fond quand on a plus de 5 niveaux d’avance sur le monstre (−12 % par
  niveau, 10 % au plus bas), et l’écran de victoire le dit.
- **Farm** : dans une terre terminée, le bouton **Farm** du combat enchaîne les étapes tout seul (en auto), avec un
  bilan (victoires, XP, lucioles, objets) ; une défaite ou « Arrêter » le coupe. Il continue même quand l’onglet
  n’est plus au premier plan (un petit worker bat la mesure à la place des animations, que le navigateur endort).
- **160 objets du Continent**, dix par terre (les six armes, écharpe, ceinture, anneau, kasa ou heaume à cornes), avec
  **leurs propres formes** (trident, morgenstern, lame courbe, kriss, étoile en X, écharpe à franges, ceinture à gemme,
  anneau serti…). Leur force part de celle des meilleurs objets de l’île (une arme à ~13 à la Plaine des Vents) et
  monte en douceur jusqu’à ~130 au Trône de l’Orage — fini le saut de 12 à 100. Les exemplaires tirés avec l’ancienne
  courbe sont recalculés au chargement. Sur le Continent, le butin tombe surtout au rang de la terre en cours ; l’étal
  propose ce rang-là.
- **Les Légendaires** : une rareté **orange**, **ultra rare** (≈ 0,3 % par victoire sur le Continent, 0,8 % contre un boss
  ou un monstre rare, 2 % contre un épique) : quatre **bandeaux** noués sur la tête et quatre **capes** qui flottent
  dans le dos, qui se voient sur la grenouille et **flottent au vent** (les pans du bandeau et la cape ondulent, une
  image sur deux, au camp, en combat, partout). Leurs stats suivent la terre où ils tombent.
- **L’Île des Colosses** : une fois le Dragon-Tempête vaincu, un second film, **la Traversée** : le dragon s’effondre
  dans l’orage ; à l’aube, des titans marchent sur la mer dans la brume, une tortue vieille comme le monde se soulève et
  prend la grenouille sur son dos, un léviathan passe dessous ; sur le rivage, des arbres hauts comme le ciel, et le pied
  d’un titan qui s’abat. Puis **trois terres immenses** (niveaux 177 à 202) : la **Forêt des Géants**, la **Forge des
  Titans** et l’**Abîme des Léviathans**, sur leur propre carte. Tout y est géant : **sept nouvelles espèces** en 32 × 32
  (sylvain, cerf-titan, ours des cimes, cyclope forgeron, kraken, crabe-titan, léviathan), sculptées en code
  (`src/colosses.js`), qui font deux fois la taille des monstres de l’île en combat, et des boss très durs (le
  Roi-Chêne, le Titan de Braise, le Léviathan Ancestral). Leur butin a ses propres armes et ses propres formes (Bourdon,
  Trident, Ōdachi, Marteau, Coutelas, Étoile, Mante, Baudrier, Chevalière, Heaume de titan).
- **L’Archipel des Brumes** : une fois le Léviathan Ancestral vaincu, un troisième film, **le Passage des Brumes** :
  le Léviathan sombre dans le noir ; à l’aube, une barque à lanterne glisse sur une mer de brume entre des portes
  rouges, sous des pétales ; elle accoste dans une bambouseraie où une renarde regarde. Puis **six terres de légende**
  (niveaux 201 à 250), sur une carte d’îles reliées par des ponts : la Bambouseraie des Brumes, les Rizières en
  terrasses, le Chemin des Mille Portes, les Sources fumantes, le Jardin de Pierre et le Mont aux Mille Tempêtes.
  **Dix nouvelles créatures** sculptées en code (`src/archipel.js`) : tanuki, renarde, mante, carpe koï, épouvantail,
  lanterne hantée, oni, macaque des neiges, tengu et le **Ryū des Brumes**, son dernier boss. Leur butin a ses propres
  armes et formes (Bō, Naginata, Tachi, Kanabō, Tantō, Senban, Haori, Obi, Bague, Kabuto). Un répit après les
  Colosses : ses ordinaires se gagnent bien, ses boss demandent du butin.
- **Le Royaume sous la Terre** : une fois le Ryū des Brumes vaincu, un quatrième film, **la Descente** : le dragon
  s’enroule dans les nuages, la montagne se fend, la grenouille tombe dans le noir entre des champignons qui s’allument
  un à un, et se pose au bord d’un lac noir où une petite lumière l’attend. Puis **six terres sous le monde** (niveaux
  249 à 298), sur une carte de cavernes reliées par des tunnels, au-dessus d’un gouffre : les Cavernes Murmurantes, la
  Forêt de Champignons géants, le Lac sans Soleil, les Mines de Cristal, la Cité Engloutie et le Cœur de la Terre.
  **Dix nouvelles créatures** (`src/royaume.js`) : la taupe mineuse et son casque, le ver des galeries, le champignon
  errant, l’escargot luisant, l’axolotl, la baudroie et sa lumière, le golem de cristal, le scarabée-rhinocéros, la statue
  gardienne, et le **Ver du Cœur du Monde**, le dernier boss. Leur butin a ses propres armes et formes (Pic, Trident, Lame,
  Marteau, Poinçon, Disque, Cape, Baudrier, Chevalière, Casque de mineur). Une pente douce, comme l’Archipel.
- **Les cycles (NG+)** : une fois le dernier boss du monde vaincu (aujourd’hui le Ver du Cœur du Monde, au fond du
  Royaume sous la Terre), on peut entrer dans le **cycle suivant** : tout recommence
  au Marais-Brume, mais les monstres **se mettent à ton niveau** (jamais sous celui de leur étape), toutes les terres
  partent de la force du milieu du Continent, et tout a 25 % de PV et de dégâts en plus par cycle (cumulés). En
  échange, le butin et l’étal sont du **plus haut rang**, « +1 », « +2 »… (+20 % de stats par +). On garde son niveau,
  ses objets et ses lucioles. Sans fin ; le classement Aventure compte les cycles.
- **La mutation** : dès le **niveau 100**, la grenouille peut muter. Elle repart au niveau 1 (points et dalles remis à
  zéro ; elle garde sa voie, ses objets, ses lucioles et sa progression), mais gagne pour toujours +3 à chaque
  caractéristique, +10 % d’XP et **un trait au choix parmi trois** (Peau d’écorce +8 % PV, Crocs +8 % dégâts, Œil de
  nuit, Pattes-ressorts, Troisième œil, Mémoire ancestrale, Flair, Trèfle de mare). Les mutations se cumulent, et des
  **marques lumineuses** apparaissent sur sa peau, de plus en plus nombreuses (leur couleur change avec le nombre).
- Hauts faits en plus : niveau 100, première et cinquième mutation, cycles II et V, premier Légendaire, l’Île des
  Colosses et le Léviathan Ancestral, la Tour des Ancêtres et ses 600 étages, la première Maîtrise et le premier éveil.

## Chaque jour : quêtes, forge, compagnons, Titan et saisons

- **Les quêtes du jour**, au camp : trois quêtes chaque jour (une de combat, une d’objets, une à part : missions,
  méditation, duels, le Titan, l’Alpha du clan…), tirées d’après la date. Chacune rapporte des lucioles, un peu d’XP et
  des éclats de jade ; les trois faites, le **coffre du jour** s’ouvre (un objet Rare ou Épique de sa terre, et plus
  d’éclats). Un badge sur « Camp » dit quand une récompense attend (`src/quetes.js`).
- **Les événements** : le **week-end double XP** (samedi et dimanche, tout ce qui rapporte de l’XP en rapporte deux fois
  plus) et le **mercredi du butin** (+50 % de chances d’objet). Le camp annonce le prochain.
- **La forge** (`src/forge.js`), une page à elle : l’atelier, son four et son enclume. À gauche, les objets à forger
  (ceux qu’on porte d’abord) ; au milieu, l’objet sur l’enclume, ce que donne le niveau suivant, son prix et ses chances ;
  à droite, le **recyclage en masse** (par rareté, ou objet par objet) en éclats de jade. Renforcer un objet de +1 à
  **+10** (+5 % de stats par niveau) coûte de plus en plus d’éclats et de lucioles, et **peut rater à partir de +4**
  (90 %, puis 80 %… 30 % pour +10 : les éclats sont perdus, l’objet garde son niveau).
- **Les panoplies d’Uniques** : les Uniques d’un même donjon forment une panoplie ; en porter 2, 3 puis 4 donne un bonus
  de plus à chaque palier. Six sortes, une par donjon à tour de rôle : du Colosse (PV, dégâts reçus), du Fauve (dégâts,
  critique), de l’Ombre (esquive), du Sage (sorts), de Fortune (XP, lucioles, objets) et du Sang (vol de vie).
- **Les compagnons** : au fond de chaque donjon, le petit du boss peut suivre la grenouille (50 % la première fois,
  20 % au boss du jour) ; le retrouver le fait grandir, jusqu’au niveau 10. Il donne un petit bonus (PV, dégâts,
  objets, XP ou lucioles), se tient à côté d’elle au camp, et en combat il bondit sur l’ennemi tous les deux tours
  (sauf en duel et à la guerre). Trente compagnons, un par donjon (case « Compagnon » de la fiche du personnage).
- **Le Titan de la semaine** (avec un compte) : un boss mondial, le même pour toutes les grenouilles de tous les joueurs
  (le Kraken des Tempêtes, le Léviathan d’Écume, le Cyclope Sans-Sommeil, le Ryū Céleste, le Sylvain Colérique, à tour
  de rôle). Ses PV sont partagés ; chaque grenouille l’attaque **3 fois par jour** pendant 10 tours, et chaque attaque
  rapporte lucioles, XP et éclats. Quand il tombe, chacune de celles qui l’ont frappé reçoit sa part, et un Titan plus
  fort se dresse. Le lundi, les dix plus grands coups de la semaine reçoivent un cadeau, toutes les autres une part ;
  ses PV s’ajustent d’une semaine à l’autre selon qu’il est tombé ou non. Les coups sont comptés sur des compteurs
  atomiques (HINCRBY) : quand beaucoup de joueurs frappent au même instant, aucun ne se perd, et un seul coup l’abat.
  Les écritures des clans (dons, messages, assauts, arrivées, fin de guerre) et des cadeaux passent sous un verrou
  court (`SET NX EX`), pour la même raison.
- **Les saisons de classement** : un mois chacune. Chaque exploit rapporte des points (quêtes, coffre, boss, salles de
  donjon, étages de la tour, attaques du Titan, duels, assauts du clan) ; l’onglet **Saison** du classement les compare.
  (Le classement des clans est aussi dans la page Classement, onglet **Clans** ; sur la page du clan, il a laissé sa place
  au **chat du clan**, et le journal est passé sous l’Alpha.) Le premier du mois, les dix premières reçoivent un cadeau (lucioles, éclats, XP), et les trois premières une peau qu’on
  ne trouve nulle part ailleurs : **Champion d’or**, **d’argent** et **de bronze**.

## Objets et raretés

- **3 raretés**, reconnaissables à leur bordure : **Commun** (gris), **Rare** (bleu), **Épique** (violet). Les trésors
  (tour, dojo, album) ont des stats fixes et comptent comme épiques.
- Chaque objet trouvé ou acheté est un **exemplaire unique** : ses stats sont **tirées au hasard** selon sa rareté
  (Rare : environ +35 % et parfois une stat en plus ; Épique : environ +75 % et deux stats en plus). Deux Bâtons de
  jade épiques n’ont donc pas les mêmes jets. On peut en avoir plusieurs, et vendre les autres.
- **Plus de 80 modèles** (bâtons, harpons, katanas, masses, kunaïs, shurikens, chapeaux, écharpes, ceintures, anneaux), rangés par biome :
  plus on avance, plus les modèles sont forts. Butin : 72 % commun, 24 % rare, 4 % épique (bien mieux sur un boss
  ou un monstre rare). L’étal de l’Aïeule Gamako tire aussi ses objets dans les trois raretés.
- **Monstres rares et épiques** : un combat normal peut tomber sur une variante rare (16 %) ou épique (4 %),
  recolorée et entourée d’une aura, plus coriace et bien mieux récompensée.

## Le combat

L’arène fait 400×225 pixels et remplit tout l’écran (sans jamais couper les deux combattants) ; les secousses restent douces.

Duel 1 contre 1 au tour par tour, en plein écran. L’Agilité donne plus de chances de jouer en premier (la plus agile
commence plus souvent, pas toujours).

- Plus de réserve à gérer : chaque sort a son **temps de relance** en tours (l’attaque de base n’en a pas), que
  l’**Esprit** raccourcit.
- Les sorts posent des effets : **saignement**, **poison**, **marque** (+30 % de dégâts reçus), **étourdissement**,
  **affaiblissement** (−30 % de dégâts), **garde** (et riposte), **ombre** (esquive sûre puis critique), **bouclier**,
  soins, vol de vie. Les passifs du Temple ajoutent riposte, flux (une relance qui saute), enchaînement, coup de grâce…
- Au corps à corps, l’arme est **dessinée dans la main** (katana, bâton, masse, harpon) : elle se lève, s’abat et laisse
  une traînée de lumière ; les entailles sont de grands croissants lumineux.
- Chaque sort a son **animation** : entailles et iaï du katana, séisme, moulinet, étoiles d’eau qui éclaboussent, bulle
  d’eau, tourbillon de shurikens, clone d’ombre, pluie de kunaïs, paume géante, orbe d’énergie, coup de pied sauté,
  coup de boule, langue fouet…
- Les ennemis ont leurs tactiques : charges préparées, vol de vie, englue (les sorts en relance prennent un tour de plus),
  rage des boss sous la moitié de leur vie. Les grenouilles adverses (duels, tour) jouent leurs sorts avec les mêmes règles.
- **Auto** ; vitesse **×1 / ×2 / ×4** ; **Farm** dans une terre terminée. **Touches du clavier** réglables (bouton
  clavier, en bas du menu ou en combat) : disposition **QWERTY** (Q W E R T, A pour l’auto) ou **AZERTY** (A Z E R T,
  Q pour l’auto), devinée d’après le clavier, et chaque touche se change à la main ; les chiffres 1 à 5 marchent aussi,
  sur tous les claviers. Sur écran tactile, ni lettres ni bouton clavier.
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
- `src/donjons.js` : les Donjons (leurs salles, leurs boss, les objets Uniques, les portes en pixel art)
- `src/forge.js` : la forge (éclats, recyclage, renforcement), les panoplies d’Uniques et les compagnons ;
  `src/quetes.js` : les événements de la semaine, les quêtes du jour et les saisons ; le Titan est dans `src/worlds.js`
  et `src/hub.js` (et `/api/titan` côté serveur)
- `src/tower.js` : la Tour des Cent Sages (les sages, leurs récompenses, la pagode et ses cascades, l’arène) ; `src/album.js` : le bestiaire, les objets, les chapitres du livre et les paliers
- `src/cascade.js` : le décor de la Cascade des duels (page et arène, eau animée) ; les duels eux-mêmes sont dans `src/hub.js` et `src/battle.js` (et côté serveur, les routes `/api/dojo`) ; les Clans sont dans `src/hub.js` (et `/api/clans` côté serveur), leurs Alphas dans `src/worlds.js`
- `src/audio.js` : musique lo-fi générée en continu (plus rythmée en combat), musique 8 bits de la cinématique, bruitages et ambiance du marais, le tout synthétisé en Web Audio
- `src/sprites.js` : Kawazu et ses animations, repris de la maquette Claude Design
- `src/looks.js` : équipement visible, signes des skins (paintSkin), ondes de choc, kunaï lancé, espèces de monstres
- `src/biomes.js` : les biomes (les 6 de l’île, les 16 du Continent : décor, monstres, boss) et la liste des îles (`ISLES`) ;
  `src/colosses.js` : l’Île des Colosses (l’outil de sculpture des sprites, ses espèces, ses 3 terres, son butin) ;
  `src/archipel.js` : l’Archipel des Brumes (ses 10 espèces, ses 6 terres, son butin) ; `src/royaume.js` : le Royaume
  sous la Terre (ses 10 espèces, ses 6 terres, son butin)
- `src/skills.js` : les voies, leurs sorts, le Temple (3 branches et la dalle-sommet) et le deck
- `src/feats.js` : hauts faits et leurs médailles
- `src/items.js` : objets, couleurs, stats, niveaux, prix, sauvegarde
- `src/worlds.js` : étapes des mondes, ennemis, météo, expéditions, boutique
- `src/tiles.js` : dessin des tuiles
- `src/map.js` : les cartes du monde (l’Île et le Continent, fabriquées par makeWorldMap) et leur brume
- `src/shop.js` : décor animé de la boutique et Gamako
- `src/scene.js` : décor animé du camp et logo
- `src/battle.js` : le duel au tour par tour (`BattleScene.start`), le farm ; `src/keys.js` : les touches du combat
- `src/cinematic.js` : les cinématiques en pixel art (le lecteur, et le Grand Plongeon)
- `src/hub.js` : écran titre, création, menu et pages
