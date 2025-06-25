import { Injectable } from '@nestjs/common';
import {
  DECAY_LAMBDA,
  INITIAL_RATING,
  K_BASE,
  MAX_MARGIN_BONUS,
  RECENT_MATCH_BONUS,
  RECENT_WINDOW_DAYS,
} from './elo.constants';

// Tier coefficients based on tournament name analysis
const TIER_COEFF: Record<string, number> = {
  S: 2.0, // Major international events
  A: 1.5, // Top-level regional finals/playoffs
  B: 1.2, // Main stage regional events
  C: 1.0, // Qualifiers and smaller tournaments
};

export interface EloMatch {
  date: Date;
  tier: 'S' | 'A' | 'B' | 'C';
  teamA: string;
  teamB: string;
  mapsA: number;
  mapsB: number;
}

// TODO: change from last x days to last x matches

/**
 * A service that implements a dynamic Elo rating system for teams.
 * It processes a chronological list of matches to maintain and update team ratings,
 * with special weighting for recent form, match importance (tier), and margin of victory.
 */
@Injectable()
export class EloService {
  private rating = new Map<string, number>();
  private lastPlayed = new Map<string, Date>();

  /**
   * Calculates the Elo ratings for all teams based on a complete match history.
   * @param matches - A list of all matches in chronological order.
   * @param initialRatings - A map of team names to their initial Elo ratings.
   * @returns A map of team names to their new Elo ratings.
   */
  calculateElos(
    matches: EloMatch[],
    initialRatings: Map<string, number>,
  ): Map<string, number> {
    this.rating = new Map(initialRatings);
    this.lastPlayed.clear();

    // Ensure matches are processed chronologically
    const sortedMatches = matches.sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    sortedMatches.forEach((match) => this.update(match));

    return this.rating;
  }

  /**
   * Determines the tier of a tournament based on its name.
   * @param tournamentName The name of the tournament.
   * @returns The tier ('S', 'A', 'B', 'C').
   */
  getTierFromTournamentName(tournamentName: string): 'S' | 'A' | 'B' | 'C' {
    const lowerName = tournamentName.toLowerCase();
    if (/champions|masters/i.test(lowerName)) {
      return 'S';
    }
    if (
      /(playoffs|final)|(game changers.*(main stage|final))/i.test(lowerName)
    ) {
      return 'A';
    }
    if (/challengers/i.test(lowerName)) {
      return 'B';
    }
    if (/game changers/i.test(lowerName)) {
      return 'C';
    }
    return 'C';
  }

  /**
   * Gets the current rating for a team, or the initial rating if the team is new.
   * @param team - The name of the team.
   * @returns The team's current Elo rating.
   */
  private get(team: string): number {
    return this.rating.get(team) ?? INITIAL_RATING;
  }

  /**
   * Updates the Elo ratings for two teams based on the result of a single match.
   * @param match - The match data.
   */
  private update(match: EloMatch): void {
    const { teamA, teamB, mapsA, mapsB, date, tier } = match;

    const RA = this.get(teamA);
    const RB = this.get(teamB);

    const SA = mapsA > mapsB ? 1 : 0;
    const SB = (1 - SA) as 0 | 1;

    const EA = 1 / (1 + 10 ** ((RB - RA) / 400));
    const EB = 1 - EA;

    const daysSinceA = this._daysSinceLast(teamA, date);
    const daysSinceB = this._daysSinceLast(teamB, date);
    const decayA = Math.exp(-DECAY_LAMBDA * daysSinceA);
    const decayB = Math.exp(-DECAY_LAMBDA * daysSinceB);

    const recentMult = (d: number) =>
      d <= RECENT_WINDOW_DAYS ? RECENT_MATCH_BONUS : 1;

    const margin = Math.max(Math.abs(mapsA - mapsB), 1);
    const marginCoef = 1 + (margin - 1) * (MAX_MARGIN_BONUS - 1);

    const kA =
      K_BASE * TIER_COEFF[tier] * decayA * recentMult(daysSinceA) * marginCoef;

    const kB =
      K_BASE * TIER_COEFF[tier] * decayB * recentMult(daysSinceB) * marginCoef;

    this.rating.set(teamA, RA + kA * (SA - EA));
    this.rating.set(teamB, RB + kB * (SB - EB));
    this.lastPlayed.set(teamA, date);
    this.lastPlayed.set(teamB, date);
  }

  /**
   * Calculates the number of days since a team last played a match.
   * @param team - The name of the team.
   * @param date - The date of the current match.
   * @returns The number of days since the team's last match.
   */
  private _daysSinceLast(team: string, date: Date): number {
    const last = this.lastPlayed.get(team);
    return last ? (date.getTime() - last.getTime()) / 86_400_000 : 0;
  }
}
