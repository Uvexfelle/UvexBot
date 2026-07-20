#   Étape 1 :
##  Mise en place des données
* Insérer les données de base tel que le .env (infos à remplir dans le env.md)
    -https://twitchtokengenerator.com/

* Remplissage du config :
    - Commandes simple qui ce déclanche avec le premier mot du msg
        Liste des déclencheur possible :
            - {spoiltime} Permet de générer un temps proche du pb 
            - {user} Permet de @ l'utilisateurice
            - {channel} Permet de dire le nom de la chaine de streaming
            - {randomX} Permet de donner un nombre random entre 0 et X ou entre X et X si X = x:y

    - Commandes automatique, les case sont utilisé différement :
        -Name: Nom de la commande
        -Pattern: Trois valuers numéraire séparer par des virgules 'Temps minimum pour ce déclancher,Nombre de msg d'espace nécessaire, Priorité
            si 2 msg automatique doivent s'envoyer en même temps alors celui avec la priorité la plus haute seras envoyé et l'autre seras retransmis après un cooldown
        -Response: Message à dire et les déclancheur du haut sont effectife, peut dire le message d'une commande en y mettant un pattern
        -Type: Auto

    - Information Speedrun.com :
        IL FAUT REMPLIRE AU MOINS UNE ENTRÉE dans config/Src-data.js dans listeUsers
            -Name: pseudo twitch en minuscule
            -id: l'id users de speedrun.com peut être trouvé avec l'api `https://www.speedrun.com/api/v1/users/'votre pseudo src'`
* Remplissage des données via speedrun.com :
    - faire les maj npm avec "npm install"
    - Setup des données avec le setup.data "node Setup/setup-data.js" qui vas créer et remplire toutes les données trouvable sur internet et synchroniser avec les donnée remplie aux préalable dans le dossier config
        -"-current" pour skipper la recherche des jeux et des pb actuels
        -"-history" pour skipper la recherche des historiques de toutes les caté stocker

        Préférable de le faire une fois complète (prend du temps) et le refaire avec un -current

* Surnmon des jeux :
    La liste de jeux-découvert permet de pré-remplir le fichier src-data pour pouvoir y ajouter des abréviation ou des surnoms pour des jeux

#   Étape 2 :
##  Lancement et fonctiennement du bot

* Lancement du bot avec le server.js "nodemon --ignore 'Data/*'  Setup/server.js"


#   Regex :

* Les regex Permette de répondre à des questions réqurente comme "c'est quoi ton pb ?" *
    
    * 100% de botw 
        permet de donner une réponse spécifique quand aux question liée aux 100% de botw plutôt que pour les 100% en général

    * 100% généraux 
        permet de donner une réponse global quand aux faite de faire les 100% des jeux

    * Pb
        permet de comprendre les questions liée aux pb pour y répondre avant même que la commande soit taper

    * Wr
        permet de comprendre les questions liée aux wr pour y répondre avant même que la commande soit taper
    
    * Tiemr détailé LiveSplit
        explique la différence entre pb et best sur le timer détaillé de LiveSplit

    * Terminologie Pb
    
    * Explication du changement d'heure
        explique pourquoi on change l'heure en début de run de super mario odyssey

    * Explication bilingue
        explique que le runner ne comprend pas forcément la langue afficher dans la run

    * Langue du jeu
        donne la langue la plus rapide pour le jeu en cours

    * Topper first
        Il faut rétablir la vérité

    * Redondance
        répond à la question "tu en as pas marre de faire la même choses ?"

#   Commandes détaillé

- SpoilTime
    *Prend la caté de stream pour trouver le dernier pb sur le jeu ou sur la famille, fallback sur le dernier pb, pour prédir un temps plossible en fonction de son placement dans le classement sont temps et le temps des autres adversaire jusqu'au wr.

    *La génération aléatoire se fait en deux parties, la première consiste à créer un temps max et un temps minimum pour 2 cas
        - Chapeaux 1 : contient des temps qui corresponds à un temps proche du pb autant positive que négatif
        - Chapeaux 2 : contient des temps qui peuvent atteindre le wr, voir le battre si on est dans le top du classement, ou faire un temps équivalent au temps de la personne 2x plus basse dans le leaderboard ou de l'écart entre le pb et le wr en négatif
    *Ensuite ça vas tirer aux sorts 1k nombre avec un avantage à 75% sur le chapeaux 1 pour ensuite tirer le vrais temps et créer la balise spoiletime qui peut être utiliser dans les commandes simple

#   RoadMap
##  0.5
Bot fonctionnelle mais sans le dashboard web

* Bug
- spoiltime ne détecte pas le jeu via le titre....
- wr sans jeux qui ne réponds rien

  J'ai le temps chil ----
    - Auto commandes
* À implémenter
    - !delPb pour supprimer un temps et revenir sur le dernie en date

* À meditaire
    - Trouver un moyen d'harmoniser les réponses avec les templates


##  1.0
Dashboard et paramètrage complet via le site web

* Bug
    -

* À implémenter
    -intégration youtube/tik tok
    -commandes !commands
    -commandes on/off
    -intégration des ILS

##  1.+

* Bug
    -

* À implementer
    -log de 100% des message du chat 
    -pour x pts de chaine voici le premier msg de @user
    -implémentation gdoc Ben 
    -règle de la caté src
