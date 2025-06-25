import { Test, TestingModule } from '@nestjs/testing';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { Game } from '../games/enums/game.enum';
import { Match } from './entities/match.entity';

describe('MatchesController', () => {
  let controller: MatchesController;
  let service: MatchesService;

  const mockMatchesService = {
    getUpcoming: jest.fn(),
    getById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        {
          provide: MatchesService,
          useValue: mockMatchesService,
        },
      ],
    }).compile();

    controller = module.get<MatchesController>(MatchesController);
    service = module.get<MatchesService>(MatchesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUpcoming', () => {
    it('should call the service to get upcoming matches for a game', async () => {
      const mockMatches = [{ id: 1 }] as Match[];
      mockMatchesService.getUpcoming.mockResolvedValue(mockMatches);

      const result = await controller.getUpcoming(Game.VALORANT);

      expect(result).toEqual(mockMatches);
      expect(mockMatchesService.getUpcoming).toHaveBeenCalledWith(
        Game.VALORANT,
      );
    });
  });

  describe('getById', () => {
    it('should call the service to get a match by its ID', async () => {
      const mockMatch = { id: 1 } as Match;
      mockMatchesService.getById.mockResolvedValue(mockMatch);

      const result = await controller.getById(Game.VALORANT, 1);

      expect(result).toEqual(mockMatch);
      expect(mockMatchesService.getById).toHaveBeenCalledWith(1);
    });

    it('should ignore the game parameter and still call the service', async () => {
      const mockMatch = { id: 2 } as Match;
      mockMatchesService.getById.mockResolvedValue(mockMatch);

      // The 'game' param is used for routing but not in the getById service method itself
      const result = await controller.getById(Game.CS_GO, 2);

      expect(result).toEqual(mockMatch);
      expect(mockMatchesService.getById).toHaveBeenCalledWith(2);
      expect(mockMatchesService.getById).not.toHaveBeenCalledWith(
        expect.stringContaining('csgo'),
      );
    });
  });
});
