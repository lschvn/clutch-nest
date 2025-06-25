import { Test, TestingModule } from '@nestjs/testing';
import { VlrService } from './vlr.service';
import { VlrCompletedMatch } from './vlr.d';

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
      const match = (await service.getMatchById('239202')) as VlrCompletedMatch;

      expect(match).toBeDefined();
      expect(match.id).toBe('239202');
      expect(match.status).toBe('final');
      expect(match.team1.name).toBe('Team Heretics');
      expect(match.team1.score).toBe(2);
      expect(match.team2.name).toBe('Gentle Mates');
      expect(match.team2.score).toBe(1);
      expect(match.maps.length).toBeGreaterThan(0);
      expect(match.maps[0].name).toBe('Split');
      expect(match.maps[0].team1Score).toBe(16);
      expect(match.maps[0].team2Score).toBe(14);
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

  describe('getTeamById', () => {
    it('should return team details and roster for a given id', async () => {
      // Using Team GB as per the request
      const teamId = '17986';
      const team = await service.getTeamById(teamId);

      expect(team).toBeDefined();
      expect(team.name).toBe('Team GB');
      expect(team.tag).toBe('GB');
      expect(team.country).toBe('International');
      expect(team.roster.length).toBeGreaterThan(0);
      expect(team.staff.length).toBeGreaterThan(0);

      // Check for a specific player
      const player = team.roster.find((p) => p.name === 'Shehab');
      expect(player).toBeDefined();
      expect(player?.realName).toBe('Shehab Hussain');
      expect(player?.country).toBe('Egypt');

      // Check for a staff member
      const staffMember = team.staff.find((s) => s.name === 'ALTR0N');
      expect(staffMember).toBeDefined();
      expect(staffMember?.role).toBe('manager');
    }, 30000);
  });
});
