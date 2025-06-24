# Clutch

Une application pour faire des paris sur l'esport


Pour l'instant des paris gratuits. 

Déjà il faut créer l'uml. C'est à dire la manière dont on va travailler le code tout au long du projet. 

Pour commencer je vais devoir rendre le code adaptable a plusieurs jeux dans le futur. 

pour le rendre très adaptables aux différents jeux, on va utiliser une architecture comme suit : 

```
/core                       --> dossier principal
    /games                  --> dossier des jeux
        /valorant
            /teams
            /matches
            /players
            /tournaments
    /bet                    --> dossier avec les controllers pour créer un bet du style POST : /bet/{game}/{match_id}
    /elo                    --> dossier avec la logique de l'élo, calculer les côtes
    /odds                   --> 
```

Je vais déjà commencer par travailler sur valorant. 

Donc on aura des tables comme suits : 

- users
- sessions
- tfa
- bet (donc la pièce maîtresse de ce logiciel)

ensuite les tables pour chaque jeux (val pour valorant) : 

- val_matchs
- val_players
- val_teams
- val_tournaments

en gros le but c'est de fetch un endpoint qui va te donner des info sur les matchs upcoming, 
et si on a déjà la team, avec les players en bdd, alors on touche a rien, sinon on va faire l'élo etc.. 
comme ça dès qu'une nouvelle équipe va jouer, elle doit avoir son odds, et son élo grâce a notre système.

Le système se base sur les données disponibles sur vlr.gg pour valorant. 

Maintenant voici un diagramme de classe pour bien comprendre comment fonctionnerait le core de l'application


```mermaid

class Bet {}

class Elo {}

class Odds {}

class ValMatch {}

class ValTeam {}

class ValPlayer {
    name: string
}

```


## Base de donnée 



## Structure de fichiers
