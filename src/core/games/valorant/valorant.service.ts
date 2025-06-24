import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VlrService } from './vlr/vlr.service';
import { MatchStatus } from 'src/core/matches/enums/matches.enum';
import { In, Repository } from 'typeorm';
import { Match } from 'src/core/matches/entities/match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Game } from '../enums/game.enum';
import { Team } from 'src/core/teams/entities/team.entity';
import { Tournament } from 'src/core/tournaments/entities/tournament.entity';
import { VlrCompletedMatch, VlrMatch, VlrUpcomingMatch } from './vlr/vlr.d';
import { Player } from 'src/core/players/entities/player.entity';
import { EloService } from 'src/core/elo/elo.service';

function isVlrCompletedMatch(
  match: VlrMatch | VlrCompletedMatch,
): match is VlrCompletedMatch {
  return (match as VlrCompletedMatch).status === 'final';
}

/**
 * Service responsible for all Valorant game-related logic,
 * including fetching match data, managing teams, and calculating Elo ratings.
 */
@Injectable()
export class ValorantService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ValorantService.name);

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    private readonly vlrService: VlrService,
    private readonly eloService: EloService,
  ) {}

  /**
   * Lifecycle hook that runs once the application has started.
   * Triggers the initial fetching of upcoming matches and calculates Elo ratings.
   */
  async onApplicationBootstrap() {
    this.logger.log('Running upcoming matches on startup...');
    await this.handleUpcomingMatches();
    await this.calculateElosAndOdds();
  }

  /**
   * Fetches upcoming matches from VLR.gg, filters out existing ones,
   * and saves new matches to the database.
   * This method is scheduled to run every hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleUpcomingMatches() {
    this.logger.log('Fetching upcoming matches...');
    const upcomingMatches = await this.vlrService.getUpcomingMatches();
    const newUpcomingMatches = await this._filterNewMatches(upcomingMatches);

    if (newUpcomingMatches.length === 0) {
      this.logger.log('No new upcoming matches found.');
      return;
    }

    const newMatchesDetails = (
      await Promise.all(
        newUpcomingMatches.map((match) =>
          this.vlrService.getMatchById(
            this.vlrService.extractIdFromUrl(match.match_page),
          ),
        ),
      )
    ).filter((m): m is VlrMatch => !isVlrCompletedMatch(m));

    const teamsMap = await this._findOrCreateTeamsAndPlayers(newMatchesDetails);
    const tournamentsMap =
      await this._findOrCreateTournaments(newMatchesDetails);

    const matchesToSave = newMatchesDetails
      .map((matchDetail) => {
        const startsAt = new Date(matchDetail.utcTimestamp);
        if (!matchDetail.utcTimestamp || isNaN(startsAt.getTime())) {
          this.logger.warn(
            `Upcoming match with VLR ID ${matchDetail.id} has an invalid timestamp: "${matchDetail.utcTimestamp}". Skipping.`,
          );
          return null;
        }

        const teamA = teamsMap.get(matchDetail.team1.name);
        const teamB = teamsMap.get(matchDetail.team2.name);
        const tournament = tournamentsMap.get(matchDetail.event.name);

        const originalUpcomingMatch = newUpcomingMatches.find(
          (m) =>
            this.vlrService.extractIdFromUrl(m.match_page) === matchDetail.id,
        );

        if (!originalUpcomingMatch) {
          this.logger.error(
            `Could not find original upcoming match for detail ${matchDetail.id}`,
          );
          return null;
        }

        return this.matchRepository.create({
          game: Game.VALORANT,
          startsAt,
          status: MatchStatus.UPCOMING,
          teamA,
          teamB,
          tournament,
          metadata: {
            vlrId: matchDetail.id,
            vlrUrl: originalUpcomingMatch.match_page,
            team1Name: matchDetail.team1.name,
            team2Name: matchDetail.team2.name,
            team1Logo: matchDetail.team1.logoUrl,
            team2Logo: matchDetail.team2.logoUrl,
            eventName: matchDetail.event.name,
            eventSeries: matchDetail.event.series,
            bestOf: matchDetail.bestOf,
            streams: matchDetail.streams,
          },
        });
      })
      .filter((match): match is Match => match !== null);

    await this.matchRepository.save(matchesToSave);
    this.logger.log(`Added ${matchesToSave.length} new matches.`);

    // And calculate the Elo rating for each team

    // Then calculate the odds for the match

    // And save it in database

    // Then log the result in console
  }

  /**
   * Calculates Elo ratings for all teams based on their match history
   * and then calculates and saves the odds for all upcoming matches.
   * This method is scheduled to run every 2 hours.
   */
  @Cron(CronExpression.EVERY_2_HOURS)
  async calculateElosAndOdds() {
    this.logger.log('Calculating Elo ratings and odds...');
    const allTeams = await this.teamRepository.find();
    const allFinishedMatches = await this.matchRepository.find({
      where: { status: MatchStatus.FINISHED, game: Game.VALORANT },
      relations: ['teamA', 'teamB', 'tournament'],
      order: { startsAt: 'ASC' },
    });

    const initialRatings = new Map(
      allTeams.map((team) => [team.name, team.elo]),
    );

    const eloMatches = allFinishedMatches.map((m) => ({
      date: m.startsAt,
      tier: this.eloService.getTierFromTournamentName(m.tournament.name),
      teamA: m.teamA.name,
      teamB: m.teamB.name,
      mapsA: Number(m.metadata.team1Score),
      mapsB: Number(m.metadata.team2Score),
    }));

    const newRatings = this.eloService.calculateElos(
      eloMatches,
      initialRatings,
    );

    const updatePromises = Array.from(newRatings.entries()).map(
      ([teamName, newElo]) => {
        const team = allTeams.find((t) => t.name === teamName);
        if (team) {
          team.elo = Math.round(newElo);
          return this.teamRepository.save(team);
        }
        return Promise.resolve();
      },
    );
    await Promise.all(updatePromises);
    this.logger.log(`Updated Elo ratings for ${newRatings.size} teams.`);

    // Re-fetch teams to ensure we have the latest Elo values
    const updatedTeams = await this.teamRepository.find();
    const teamsMap = new Map(updatedTeams.map((team) => [team.id, team]));

    const upcomingMatches = await this.matchRepository.find({
      where: { status: MatchStatus.UPCOMING, game: Game.VALORANT },
      relations: ['teamA', 'teamB'],
    });

    let updatedCount = 0;
    for (const match of upcomingMatches) {
      if (!match.teamA || !match.teamB) {
        this.logger.warn(
          `Match with ID ${match.id} has a null team associated, skipping odds calculation.`,
        );
        continue;
      }
      const teamA = teamsMap.get(match.teamA.id);
      const teamB = teamsMap.get(match.teamB.id);

      if (teamA && teamB) {
        const probA = 1 / (1 + 10 ** ((teamB.elo - teamA.elo) / 400));
        match.oddsTeamA = 1 / probA;
        match.oddsTeamB = 1 / (1 - probA);
        await this.matchRepository.save(match);
        updatedCount++;
      } else {
        this.logger.warn(
          `Could not find one or both teams for match ${match.id} (TeamA: ${match.teamA.name}, TeamB: ${match.teamB.name}) in our teams list. Skipping odds calculation.`,
        );
      }
    }
    this.logger.log(
      `Updated odds for ${updatedCount} out of ${upcomingMatches.length} upcoming matches.`,
    );
  }

  /**
   * @description Filters out matches that are already in the database.
   * @param upcomingMatches The list of upcoming matches from VLR.gg
   * @returns A list of matches that are not yet in the database.
   */
  private async _filterNewMatches(
    upcomingMatches: VlrUpcomingMatch[],
  ): Promise<VlrUpcomingMatch[]> {
    const existingMatches = await this.matchRepository.find({
      where: { status: MatchStatus.UPCOMING },
    });
    this.logger.log(
      `Found ${existingMatches.length} existing upcoming matches in DB.`,
    );

    const newMatches = upcomingMatches.filter((upcomingMatch) => {
      const isExisting = existingMatches.some(
        (existingMatch) =>
          existingMatch.metadata.vlrUrl === upcomingMatch.match_page,
      );
      if (isExisting) {
        this.logger.log(
          `Match ${upcomingMatch.match_page} already exists. Filtering out.`,
        );
      }
      return !isExisting;
    });

    this.logger.log(`Found ${newMatches.length} new matches to process.`);
    return newMatches;
  }

  /**
   * Finds existing teams or creates new ones, including their players.
   * It orchestrates fetching match history for all involved teams.
   * @param newMatchesDetails - The detailed data of the new matches.
   * @param options - Configuration options, e.g., to control recursive history fetching.
   * @returns A map of team names to Team entities.
   */
  private async _findOrCreateTeamsAndPlayers(
    newMatchesDetails: (VlrMatch | VlrCompletedMatch)[],
    options: { fetchHistory?: boolean } = { fetchHistory: true },
  ): Promise<Map<string, Team>> {
    const allTeamNames = newMatchesDetails.flatMap((match) => [
      match.team1.name,
      match.team2.name,
    ]);
    const uniqueTeamNames = [...new Set(allTeamNames)];
    if (uniqueTeamNames.length === 0) return new Map();
    this.logger.log(`Processing teams: ${uniqueTeamNames.join(', ')}`);

    const existingTeams = await this.teamRepository.find({
      where: { name: In(uniqueTeamNames) },
      relations: ['players'],
    });
    const teamsMap = new Map(existingTeams.map((t) => [t.name, t]));
    this.logger.log(`Found ${existingTeams.length} existing teams in DB.`);

    const newTeamNames = uniqueTeamNames.filter(
      (name) => !teamsMap.has(name) && name !== 'TBD',
    );

    if (newTeamNames.length > 0) {
      this.logger.log(
        `Found ${newTeamNames.length} new teams to create: ${newTeamNames.join(
          ', ',
        )}`,
      );
      const teamCreationPromises = newTeamNames.map(async (name) => {
        const match = newMatchesDetails.find(
          (m) => m.team1.name === name || m.team2.name === name,
        );
        if (!match) return;

        const teamLink =
          match.team1.name === name ? match.team1.link : match.team2.link;
        const teamVlrId = this.vlrService.extractIdFromUrl(teamLink);
        if (!teamVlrId) {
          this.logger.warn(`Could not extract VLR ID for team: ${name}`);
          return;
        }
        this.logger.log(
          `Fetching details for new team: ${name} (VLR ID: ${teamVlrId})`,
        );

        const teamDetails = await this.vlrService.getTeamById(teamVlrId);
        this.logger.debug(`Team details: ${JSON.stringify(teamDetails)}`);
        const newTeam = this.teamRepository.create({
          name,
          game: Game.VALORANT,
          metadata: { logo: teamDetails.logoUrl, vlrId: teamVlrId },
        });

        const savedTeam = await this.teamRepository.save(newTeam);
        this.logger.log(
          `Saved new team: ${savedTeam.name} (ID: ${savedTeam.id})`,
        );

        if (teamDetails.roster && teamDetails.roster.length > 0) {
          this.logger.log(
            `Creating ${teamDetails.roster.length} players for team ${savedTeam.name}.`,
          );
          const playerCreations = teamDetails.roster.map((player) =>
            this.playerRepository.create({
              name: player.name,
              game: Game.VALORANT,
              team: savedTeam,
              metadata: {
                realName: player.realName,
                country: player.country,
                vlrLink: player.link,
              },
            }),
          );
          await this.playerRepository.save(playerCreations);
          this.logger.log(
            `Saved ${playerCreations.length} players for team ${savedTeam.name}.`,
          );
        }
        teamsMap.set(name, savedTeam);
      });

      await Promise.all(teamCreationPromises);
      this.logger.log(
        `Successfully added ${newTeamNames.length} new teams and their players.`,
      );
    }

    if (options.fetchHistory) {
      const allTeams = Array.from(teamsMap.values());
      for (const team of allTeams) {
        await this._storeMatchHistory(team);
      }
    }

    return teamsMap;
  }

  /**
   * Fetches and stores the entire match history for a given team.
   * @param team - The team entity to fetch history for.
   */
  private async _storeMatchHistory(team: Team) {
    const vlrMatches = await this.vlrService.getMatchesFromTeamId(
      team.metadata.vlrId,
    );

    const completedMatches = vlrMatches.filter(isVlrCompletedMatch);

    if (completedMatches.length === 0) {
      this.logger.log(`No completed matches found for team ${team.name}`);
      return;
    }

    this.logger.log(
      `Found ${completedMatches.length} completed matches for team ${team.name}`,
    );

    const existingMatches = await this.matchRepository.find({
      where: {
        metadata: { vlrId: In(completedMatches.map((m) => m.id)) },
        game: Game.VALORANT,
      },
    });

    const newMatches = completedMatches.filter(
      (match) =>
        !existingMatches.some(
          (existing) => existing.metadata.vlrId === match.id,
        ),
    );

    if (newMatches.length === 0) {
      this.logger.log(`No new matches to store for team ${team.name}.`);
      return;
    }

    const teamsMap = await this._findOrCreateTeamsAndPlayers(newMatches, {
      fetchHistory: false,
    });
    const tournamentsMap = await this._findOrCreateTournaments(newMatches);

    const matchesToSave = newMatches
      .map((matchDetail) => {
        if (!isVlrCompletedMatch(matchDetail)) return null;

        const startsAt = new Date(matchDetail.utcTimestamp);
        if (!matchDetail.utcTimestamp || isNaN(startsAt.getTime())) {
          this.logger.warn(
            `Completed match with VLR ID ${matchDetail.id} has an invalid timestamp: "${matchDetail.utcTimestamp}". Skipping.`,
          );
          return null;
        }

        const teamA = teamsMap.get(matchDetail.team1.name);
        const teamB = teamsMap.get(matchDetail.team2.name);
        const tournament = tournamentsMap.get(matchDetail.event.name);

        if (!teamA || !teamB || !tournament) {
          this.logger.error(
            `Could not find team or tournament for match ${matchDetail.id}`,
          );
          return null;
        }

        let winnerTeam: Team | undefined;
        if (matchDetail.team1.score > matchDetail.team2.score) {
          winnerTeam = teamA;
        } else if (matchDetail.team2.score > matchDetail.team1.score) {
          winnerTeam = teamB;
        }

        return this.matchRepository.create({
          game: Game.VALORANT,
          startsAt,
          status: MatchStatus.FINISHED,
          teamA,
          teamB,
          tournament,
          winnerTeam,
          metadata: {
            vlrId: matchDetail.id,
            vlrUrl: `${this.vlrService.vlrUrl}/${matchDetail.id}`,
            team1Name: matchDetail.team1.name,
            team2Name: matchDetail.team2.name,
            team1Logo: matchDetail.team1.logoUrl,
            team2Logo: matchDetail.team2.logoUrl,
            team1Score: matchDetail.team1.score,
            team2Score: matchDetail.team2.score,
            eventName: matchDetail.event.name,
            eventSeries: matchDetail.event.series,
            bestOf: matchDetail.bestOf,
            streams: matchDetail.streams,
            maps: matchDetail.maps,
            patch: matchDetail.patch,
            head2head: matchDetail.head2head,
            pastMatchesTeam1: matchDetail.pastMatchesTeam1,
            pastMatchesTeam2: matchDetail.pastMatchesTeam2,
          },
        });
      })
      .filter((match): match is Match => match !== null);

    await this.matchRepository.save(matchesToSave);
    this.logger.log(
      `Added ${matchesToSave.length} new completed matches for team ${team.name}.`,
    );
  }

  /**
   * Maps a VLR.gg match status string to the internal `MatchStatus` enum.
   * @param vlrStatus - The status string from VLR.gg.
   * @returns The corresponding `MatchStatus`.
   */
  private mapVlrStatusToMatchStatus(vlrStatus: string): MatchStatus {
    const lowerStatus = vlrStatus.toLowerCase();
    if (lowerStatus.includes('live')) {
      return MatchStatus.LIVE;
    }
    if (
      lowerStatus.includes('final') ||
      lowerStatus.includes('completed') ||
      /\d+\s*-\s*\d+/.test(lowerStatus)
    ) {
      return MatchStatus.FINISHED;
    }
    return MatchStatus.UPCOMING;
  }

  /**
   * Finds existing tournaments or creates new ones.
   * @param newMatchesDetails - The detailed data of the new matches.
   * @returns A map of tournament names to Tournament entities.
   */
  private async _findOrCreateTournaments(
    newMatchesDetails: (VlrMatch | VlrCompletedMatch)[],
  ): Promise<Map<string, Tournament>> {
    const allTournamentNames = newMatchesDetails.map(
      (match) => match.event.name,
    );
    const uniqueTournamentNames = [...new Set(allTournamentNames)];
    this.logger.log(
      `Processing tournaments: ${uniqueTournamentNames.join(', ')}`,
    );

    const existingTournaments = await this.tournamentRepository.find({
      where: { name: In(uniqueTournamentNames) },
    });
    const tournamentsMap = new Map(existingTournaments.map((t) => [t.name, t]));
    this.logger.log(
      `Found ${existingTournaments.length} existing tournaments in DB.`,
    );

    const newTournamentNames = uniqueTournamentNames.filter(
      (name) => !tournamentsMap.has(name),
    );

    if (newTournamentNames.length > 0) {
      this.logger.log(
        `Creating ${newTournamentNames.length} new tournaments: ${newTournamentNames.join(', ')}`,
      );
      const newTournaments = newTournamentNames.map((name) =>
        this.tournamentRepository.create({
          name,
          game: Game.VALORANT,
        }),
      );
      const savedTournaments =
        await this.tournamentRepository.save(newTournaments);
      savedTournaments.forEach((t) => tournamentsMap.set(t.name, t));
      this.logger.log(`Added ${savedTournaments.length} new tournaments.`);
    }
    return tournamentsMap;
  }
}
