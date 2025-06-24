import { Module } from '@nestjs/common';
import { ValorantModule } from './valorant/valorant.module';

/**
 * -  pas besoin d'entité game, faut juste que le game_id ce soit unique et un enum des jeux donc val, lol, cs etc..
 * - donc ensuite on créé les match,
 *      les match ont un game_id, tournament_id, team_a_id, team_b_id, winner_team_id, odds_team_a, odds_team_b, starts_at
 * - ensuite on va créer un service pour valorant par exemple le ValorantIntegrationService et en gros on va ajouter des méthodes
 *      getUpcomingMatches, getMatchById, getHistoryByTeamId etc..
 * - ensuite on créer un ValorantService qui va appeler le ValorantIntegrationService et qui va contenir la business logic complète
 * - ensuite on va créer l'orchestrateur odds qui va appeler les services d'intégration pour récupérer les données et les transformer en match
 * Je sais pas encore si le elo service doit être appelé par le odds service ou par le valorant service.
 * - ensuite on va créer un EloService qui va calculer les elo des équipes et les cotes des matchs
 * - ensuite on créer un oddsController qui va créer deux routes :
 *      - /{game}/odds/{match_id}
 *      - /{game}/odds/all
 * enfaîte je sais pas si faut récupérer les données des odds depuis un endpoints ou simplement en mettant dans les matchs tu vois ?
 * et genre après quand tu fais /{game}/matches tu récupères les données des matchs et les odds, c'est peut être plus simple
 *
 * donc en gros si je reprends :
 *  le OddsService va juste être appeler toutes les 5 minutes et ensuite il va faire son rôles d'orchestrateur
 *  et les odds seront indiqué dans les matchs.
 *
 * mais pour créer l'élo il faut l'attribué aux équipes et donc il faut créer un EloService qui va calculer les elo des équipes et les cotes des matchs
 * faut aussi que les entités match, team et tournament puissent contenir des données du jeu qui sont spécifique a chaque jeu,
 * comment faire ça ?
 *
 *
 * pour plus de simplicité j'ai créé le vlrService (le service que je fetch). au lieu de valorantIntegrationService
 *
 *
 */

@Module({
  imports: [ValorantModule],
})
export class GamesModule {}
