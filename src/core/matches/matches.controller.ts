import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { Game } from '../games/enums/game.enum';
import { Match } from './entities/match.entity';

/**
 * Controller for handling match-related API requests.
 */
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  /**
   * GET /matches/:game
   * Retrieves all upcoming matches for a specific game.
   * @param game The game to fetch upcoming matches for (e.g., 'valorant').
   * @returns A promise that resolves to an array of upcoming Match entities.
   */
  @Get(':game')
  async getUpcoming(
    @Param('game', new ParseEnumPipe(Game)) game: Game,
  ): Promise<Match[]> {
    return this.matchesService.getUpcoming(game);
  }

  /**
   * GET /matches/:game/:id
   * Retrieves a match by its ID.
   * @param game The game to fetch the match for (e.g., 'valorant').
   * @param id The ID of the match to retrieve.
   * @returns A promise that resolves to the Match entity.
   */
  @Get(':game/:id')
  async getById(
    @Param('game', new ParseEnumPipe(Game)) game: Game,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Match> {
    return this.matchesService.getById(id);
  }
}
