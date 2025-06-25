import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { Game } from '../games/enums/game.enum';
import { Match } from './entities/match.entity';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get(':game')
  @ApiOperation({ summary: 'Get upcoming matches for a specific game' })
  @ApiParam({
    name: 'game',
    description: 'The game to fetch upcoming matches for',
    enum: Game,
    example: Game.VALORANT,
  })
  @ApiResponse({
    status: 200,
    description: 'List of upcoming matches.',
    type: [Match],
  })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid game specified).' })
  async getUpcoming(
    @Param('game', new ParseEnumPipe(Game)) game: Game,
  ): Promise<Match[]> {
    return this.matchesService.getUpcoming(game);
  }

  @Get(':game/:id')
  @ApiOperation({ summary: 'Get a specific match by ID and game' })
  @ApiParam({
    name: 'game',
    description: 'The game of the match',
    enum: Game,
    example: Game.VALORANT,
  })
  @ApiParam({ name: 'id', description: 'The ID of the match', type: Number })
  @ApiResponse({ status: 200, description: 'The found match.', type: Match })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid game or ID).' })
  @ApiResponse({ status: 404, description: 'Match not found.' })
  async getById(
    @Param('game', new ParseEnumPipe(Game)) game: Game, // game param is not used by service, but kept for URL structure
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Match> {
    return this.matchesService.getById(id);
  }
}
