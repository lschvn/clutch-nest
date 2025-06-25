import { Test, TestingModule } from '@nestjs/testing';
import { EloService, EloMatch } from './elo.service';

describe('EloService', () => {
  let service: EloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EloService],
    }).compile();

    service = module.get<EloService>(EloService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTierFromTournamentName', () => {
    it('should return S for major international events', () => {
      expect(
        service.getTierFromTournamentName('VCT 2024: Masters Shanghai'),
      ).toBe('S');
      expect(service.getTierFromTournamentName('VALORANT Champions 2023')).toBe(
        'S',
      );
    });

    it('should return A for top-level regional finals', () => {
      expect(
        service.getTierFromTournamentName('VCT 2024: EMEA Stage 2 - Playoffs'),
      ).toBe('A');
      expect(
        service.getTierFromTournamentName(
          'Game Changers 2024: EMEA Stage 2 - Main Stage',
        ),
      ).toBe('A');
    });

    it('should return B for main stage regional events', () => {
      expect(
        service.getTierFromTournamentName('VCT 2024: EMEA Challengers Stage 2'),
      ).toBe('B');
    });

    it('should return C for qualifiers and smaller tournaments', () => {
      expect(
        service.getTierFromTournamentName('VCT 2024: Game Changers France'),
      ).toBe('C');
      expect(
        service.getTierFromTournamentName('Some Random Local Tournament'),
      ).toBe('C');
    });
  });

  describe('calculateElos', () => {
    let initialRatings: Map<string, number>;
    const initialElo = 1000;

    beforeEach(() => {
      initialRatings = new Map<string, number>();
    });

    it('should return initial ratings if no matches are played', () => {
      initialRatings.set('Team A', 1200);
      const newRatings = service.calculateElos([], initialRatings);
      expect(newRatings.get('Team A')).toBe(1200);
    });

    it('should update ratings for a single match between new teams', () => {
      const matches: EloMatch[] = [
        {
          date: new Date(),
          tier: 'C',
          teamA: 'Team A',
          teamB: 'Team B',
          mapsA: 2,
          mapsB: 0,
        },
      ];
      const newRatings = service.calculateElos(matches, initialRatings);
      expect(newRatings.get('Team A')!).toBeGreaterThan(initialElo);
      expect(newRatings.get('Team B')!).toBeLessThan(initialElo);
    });

    it('should give more points for an upset victory', () => {
      initialRatings.set('Strong Team', 1200);
      initialRatings.set('Weak Team', 800);

      // Strong team wins (expected outcome)
      const matches1: EloMatch[] = [
        {
          date: new Date(),
          tier: 'C',
          teamA: 'Strong Team',
          teamB: 'Weak Team',
          mapsA: 2,
          mapsB: 0,
        },
      ];
      const ratings1 = service.calculateElos(matches1, new Map(initialRatings));
      const strongWinGain = ratings1.get('Strong Team')! - 1200;

      // Weak team wins (upset)
      const matches2: EloMatch[] = [
        {
          date: new Date(),
          tier: 'C',
          teamA: 'Weak Team',
          teamB: 'Strong Team',
          mapsA: 2,
          mapsB: 0,
        },
      ];
      const ratings2 = service.calculateElos(matches2, new Map(initialRatings));
      const weakWinGain = ratings2.get('Weak Team')! - 800;

      expect(weakWinGain).toBeGreaterThan(strongWinGain);
    });

    it('should award more Elo for higher tier matches', () => {
      const matchTierC: EloMatch[] = [
        {
          date: new Date(),
          tier: 'C',
          teamA: 'Team A',
          teamB: 'Team B',
          mapsA: 2,
          mapsB: 0,
        },
      ];
      const ratingsTierC = service.calculateElos(matchTierC, initialRatings);
      const gainTierC = ratingsTierC.get('Team A')! - initialElo;

      const matchTierS: EloMatch[] = [
        {
          date: new Date(),
          tier: 'S',
          teamA: 'Team A',
          teamB: 'Team B',
          mapsA: 2,
          mapsB: 0,
        },
      ];
      const ratingsTierS = service.calculateElos(matchTierS, new Map());
      const gainTierS = ratingsTierS.get('Team A')! - initialElo;

      expect(gainTierS).toBeGreaterThan(gainTierC);
    });

    it('should award more Elo for a larger margin of victory', () => {
      const narrowWin: EloMatch[] = [
        {
          date: new Date(),
          tier: 'C',
          teamA: 'Team A',
          teamB: 'Team B',
          mapsA: 2,
          mapsB: 1,
        },
      ];
      const narrowWinRatings = service.calculateElos(narrowWin, new Map());
      const narrowWinGain = narrowWinRatings.get('Team A')! - initialElo;

      const decisiveWin: EloMatch[] = [
        {
          date: new Date(),
          tier: 'C',
          teamA: 'Team A',
          teamB: 'Team B',
          mapsA: 2,
          mapsB: 0,
        },
      ];
      const decisiveWinRatings = service.calculateElos(decisiveWin, new Map());
      const decisiveWinGain = decisiveWinRatings.get('Team A')! - initialElo;

      expect(decisiveWinGain).toBeGreaterThan(narrowWinGain);
    });

    it('should process matches chronologically', () => {
      initialRatings.set('Team A', 1000);
      initialRatings.set('Team B', 1000);
      initialRatings.set('Team C', 1000);

      const matches: EloMatch[] = [
        {
          date: new Date('2024-01-02'),
          tier: 'C',
          teamA: 'Team A',
          teamB: 'Team C',
          mapsA: 2,
          mapsB: 0,
        }, // A > C
        {
          date: new Date('2024-01-01'),
          tier: 'C',
          teamA: 'Team A',
          teamB: 'Team B',
          mapsA: 0,
          mapsB: 2,
        }, // B > A (happens first)
      ];

      const newRatings = service.calculateElos(matches, initialRatings);

      const eloA = newRatings.get('Team A')!; // Loses first, then wins.
      const eloB = newRatings.get('Team B')!; // Wins first.
      const eloC = newRatings.get('Team C')!; // Loses second.

      // After B > A, Elo A < 1000, Elo B > 1000.
      // Then A > C (who is at 1000). A will gain points back.
      // Final Elo A should be slightly below 1000.
      expect(eloA).toBeLessThan(1000);
      expect(eloB).toBeGreaterThan(1000);
      expect(eloC).toBeLessThan(1000);
    });
  });
});
