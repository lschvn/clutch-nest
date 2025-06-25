import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { Game } from '../games/enums/game.enum';
import { MatchStatus } from './enums/matches.enum';

/**
 * Service responsible for handling business logic related to matches.
 */
@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  /**
   * Retrieves all upcoming matches for a specific game, sorted chronologically.
   * @param game The game to filter matches by.
   * @returns A promise that resolves to an array of upcoming Match entities.
   */
  async getUpcoming(game: Game): Promise<Match[]> {
    return this.matchRepository.find({
      where: {
        game,
        status: MatchStatus.UPCOMING,
      },
      order: {
        startsAt: 'ASC',
      },
      relations: {
        teamA: {
          players: true,
        },
        teamB: {
          players: true,
        },
        tournament: true,
        winnerTeam: true,
      },
    });
  }

  /**
   * Retrieves a match by its ID.
   * @param id The ID of the match to retrieve.
   * @returns A promise that resolves to the Match entity.
   */
  async getById(id: number): Promise<Match> {
    return this.matchRepository.findOneByOrFail({ id });
  }
}
