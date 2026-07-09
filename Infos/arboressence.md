UvexBot/
├── Api/                          ♡        Lien directe avec speedrun.com
│   ├── SRC/                      ♡                    API v1
│   │   ├── src-api.js            ♡ Traitement toutes les donnée qui viennent de l'api v1
│   │   └── src-fetch.js          ♡ URL et extirpation pour l'api v1
│   ├── SRC_V2/                   ♡                    API v2
│   │   ├── src-apiV2.js          ♡ Traitement des données qui viennent de l'api v2
│   │   └── src-fetchV2.js        ♡ URL et extirpation pour l'api v2
│   └── Twitch/                   ♡        Connection directe avec Twitch
│       └── Twitch-client.js      ♡ Api de twitch
│
├── Commandes/                    ♡        Gestion des commandes
│   ├── Moteur/                   ♡    Traitement est execution des actions
│   │   ├── Cmd-basique.js        ♡ Regroupement de toutes les commandes basique ex : Spoiltime
│   │   ├── Modération.js         ♡ Toute action devant être effectué par un membre de l'équipe de modération
│   │   ├── Pb-Wr-engine.js       ♡ Recherche est mis à jour automatique des pb et wr via src
│   │   └── Utilitaire.js         ♡ Traducteur chat <-> SQL, tout utilitaire pour les commandes
│   └── Cmd-Cerveau.js            ♡ Centre de tri pour gestion par les différent moteur
│
├── config/                       ♡        Information modifiable par l'utilisateur
│   ├── Cmd-simple.js             ♡ Toutes commandes
│   ├── Game-data.js              ♡ Information "vivante" liée au jeu comme la langue etc.
│   └── Src-data.js               ♡ Information liée à la nomenclature et à la reconnaissance du jeu par src
│
├── Data/                         ♡        Information modifiable par le bot
│   ├── database.sqlite           ♡ Base de donnée des infos de base et des jeu connue
│   ├── src_bigData.sqlite        ♡ Base de donnée des infos liée au speedrun
│   └── jeux-découvert.txt        ♡ Listes des jeux découverte l'ordre de l'écriture des pb/wr des jeux
│
├── Infos/                        ♡                Infos
│   ├── arboressence.md           ♡ Vous êtes ici !!!
│   ├── README.md                 ♡ Éxpliquatif du bot
│   └── env.md                    ♡ Template pour les infos confidentielle
│
├── Setup/                        ♡        Lancement et mise en place
│   ├── Utilitaires/              ♡    Nécessaire aux lancement du bot
│   │   ├── init-db.js            ♡ Créateur des tableaux SQL
│   │   ├── loader.js             ♡ Ouverture et initialisation des utilitaire, déviation pour test
│   │   └── test.js               ♡ Inutile au possible....
│   ├── server.js                 ♡ Démarrage de lecture/réponse aux chat  
│   └── setup-data.js             ♡ Synchronisation complète des infos 
│
├── package.json                  ♡ Dépendances et configuration du projet Node
└── package-lock.json             ♡ Verrouillage des versions npm
