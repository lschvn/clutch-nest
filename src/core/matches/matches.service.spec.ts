import { Test, TestingModule } from '@nestjs/testing';
import { MatchesService } from './matches.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Game } from '../games/enums/game.enum';
import { MatchStatus } from './enums/matches.enum';
import { EntityNotFoundError } from 'typeorm/error/EntityNotFoundError';

describe('MatchesService', () => {
  let service: MatchesService;

  const mockMatchRepository = {
    find: jest.fn(),
    findOneByOrFail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        {
          provide: getRepositoryToken(Match),
          useValue: mockMatchRepository,
        },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUpcoming', () => {
    it('should return an array of upcoming matches for a given game', async () => {
      const mockMatches = [{ id: 1 }, { id: 2 }] as Match[];
      mockMatchRepository.find.mockResolvedValue(mockMatches);

      const result = await service.getUpcoming(Game.VALORANT);

      expect(result).toEqual(mockMatches);
      expect(mockMatchRepository.find).toHaveBeenCalledWith({
        where: {
          game: Game.VALORANT,
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
    });
  });

  describe('getById', () => {
    it('should return a match when a valid id is provided', async () => {
      const mockMatch = { id: 1 } as Match;
      mockMatchRepository.findOneByOrFail.mockResolvedValue(mockMatch);

      const result = await service.getById(1);

      expect(result).toEqual(mockMatch);
      expect(mockMatchRepository.findOneByOrFail).toHaveBeenCalledWith({
        id: 1,
      });
    });

    it('should throw EntityNotFoundError if match is not found', async () => {
      mockMatchRepository.findOneByOrFail.mockRejectedValue(
        new EntityNotFoundError(Match, { id: 999 }),
      );

      await expect(service.getById(999)).rejects.toThrow(EntityNotFoundError);
    });
  });
});
