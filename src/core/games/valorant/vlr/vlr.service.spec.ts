import { Test, TestingModule } from '@nestjs/testing';
import { VlrService } from './vlr.service';

describe('VlrService', () => {
  let service: VlrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VlrService],
    }).compile();

    service = module.get<VlrService>(VlrService);
  }, 15000);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUpcomingMatches', () => {
    it('should return an array of upcoming matches', async () => {
      const matches = await service.getUpcomingMatches();
      expect(Array.isArray(matches)).toBe(true);
      if (matches.length > 0) {
        expect(matches[0]).toHaveProperty('team1');
        expect(matches[0]).toHaveProperty('team2');
        expect(matches[0]).toHaveProperty('match_event');
      }
    });
  });

  describe('extractIdFromUrl', () => {
    it('should extract match id from a vlr.gg url', () => {
      const url = 'https://www.vlr.gg/11856/';
      const id = service.extractIdFromUrl(url);
      expect(id).toBe('11856');
    });
  });

  describe('getMatchById', () => {
    it('should return match details for a given id', async () => {
      // Using a real, but old, match ID to ensure the test is stable.
      const matchId = '488321';
      const match = await service.getMatchById(matchId);

      expect(match).toBeDefined();
      expect(match.event.name).toBe(
        'Challengers 2025: MENA Resilience North Africa and Levant Split 2 Group Stage: Week 2',
      );
      expect(match.team1.name).toBe('BAAM Esports');
      expect(match.team2.name).toBe('GnG Esports');
      expect(match.maps).toBeDefined();
      expect(match.maps.length).toBeGreaterThan(0);
      expect(match.maps[0].name).toBe('Split');
      expect(match.maps[0].team1Score).toBe('16');
      expect(match.maps[0].team2Score).toBe('14');
    }, 30000);
  });

  describe('getMatchesFromTeamId', () => {
    it('should return matches for a given team id', async () => {
      // Using a real team ID
      const teamId = '11856'; // GnG Esports
      const matches = await service.getMatchesFromTeamId(teamId);

      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      const firstMatch = matches[0];
      expect(firstMatch).toHaveProperty('event');
      expect(firstMatch).toHaveProperty('team1');
      expect(firstMatch).toHaveProperty('team2');
      expect(firstMatch).toHaveProperty('maps');
    }, 60000); // Increased timeout for this test
  });
});
