import { Injectable } from '@nestjs/common';
import type {
  VlrMatch,
  VlrMatchMap,
  VlrPlayerStats,
  VlrTeam,
  VlrUpcomingMatches,
  VlrUpcomingMatchRes,
  VlrPlayer,
  VlrCompletedMatch,
  VlrPlayerStatsCompleted,
  VlrPlayerStatValue,
  VlrRound,
  VlrRoundOutcome,
  VlrCompletedMatchMap,
  VlrHeadToHead,
  VlrPastMatch,
} from './vlr.d';
import * as cheerio from 'cheerio';

@Injectable()
export class VlrService {
  private readonly apiUrl = 'https://vlrggapi.vercel.app';
  public readonly vlrUrl = 'https://www.vlr.gg';

  /**
   * @returns The upcoming matches from VLR.gg
   */
  async getUpcomingMatches(): Promise<VlrUpcomingMatches> {
    const res = await fetch(this.apiUrl + '/match?q=upcoming');
    const data = (await res.json()) as VlrUpcomingMatchRes;
    return data.data.segments;
  }

  /**
   * @param url The URL of the match page
   * @returns The match ID
   */
  extractIdFromUrl(url: string): string {
    const match = url.match(/\/(team\/)?(\d+)/);
    return match ? match[2] : '';
  }

  async getMatchById(matchId: string): Promise<VlrMatch | VlrCompletedMatch> {
    const res = await fetch(`${this.vlrUrl}/${matchId}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const status = $('.match-header-vs-note').first().text().trim();
    if (status.toLowerCase() === 'final') {
      return this.getCompletedMatchById(matchId, $);
    } else {
      return this.getUpcomingMatchById(matchId, $);
    }
  }

  getCompletedMatchById(
    matchId: string,
    $: cheerio.CheerioAPI,
  ): VlrCompletedMatch {
    const mainContainer = $('.col.mod-3');

    const eventNameElement = mainContainer.find(
      '.match-header-event > div > div',
    );
    const series = eventNameElement
      .find('.match-header-event-series')
      .text()
      .trim()
      .replace(/\s+/g, ' ');
    const eventName = eventNameElement
      .text()
      .trim()
      .replace(series, '')
      .replace(/\s+/g, ' ')
      .trim();

    const event = {
      name: eventName,
      series: series,
      link:
        this.vlrUrl + mainContainer.find('.match-header-event').attr('href'),
      imageUrl:
        'https:' + mainContainer.find('.match-header-event img').attr('src'),
    };

    const date = mainContainer
      .find('.match-header-date > .moment-tz-convert')
      .first()
      .text()
      .trim();
    const time = mainContainer
      .find('.match-header-date > .moment-tz-convert')
      .last()
      .text()
      .trim();
    const utcTimestamp = mainContainer
      .find('.match-header-date > .moment-tz-convert')
      .data('utc-ts') as string;

    const patch = mainContainer
      .find('.match-header-date > div > div')
      .text()
      .trim();

    const team1ScoreText = mainContainer
      .find('.match-header-vs-score .js-spoiler .match-header-vs-score-winner')
      .text()
      .trim();
    const team2ScoreText = mainContainer
      .find('.match-header-vs-score .js-spoiler .match-header-vs-score-loser')
      .text()
      .trim();

    const team1Elo = mainContainer
      .find('.match-header-link-name.mod-1 .match-header-link-name-elo')
      .text()
      .trim()
      .replace(/\[|\]/g, '');
    const team2Elo = mainContainer
      .find('.match-header-link-name.mod-2 .match-header-link-name-elo')
      .text()
      .trim()
      .replace(/\[|\]/g, '');

    const team1Data = {
      name: mainContainer
        .find('.match-header-link-name.mod-1 .wf-title-med')
        .text()
        .trim(),
      logoUrl:
        'https:' +
        mainContainer.find('.match-header-link.mod-1 img').attr('src'),
      link:
        this.vlrUrl +
        mainContainer.find('.match-header-link.mod-1').attr('href'),
      elo: team1Elo,
      score: parseInt(team1ScoreText, 10),
    };

    const team2Data = {
      name: mainContainer
        .find('.match-header-link-name.mod-2 .wf-title-med')
        .text()
        .trim(),
      logoUrl:
        'https:' +
        mainContainer.find('.match-header-link.mod-2 img').attr('src'),
      link:
        this.vlrUrl +
        mainContainer.find('.match-header-link.mod-2').attr('href'),
      elo: team2Elo,
      score: parseInt(team2ScoreText, 10),
    };

    const team1 = team1ScoreText > team2ScoreText ? team1Data : team2Data;
    const team2 = team1ScoreText > team2ScoreText ? team2Data : team1Data;

    if (
      mainContainer
        .find('.match-header-link-name.mod-1 .wf-title-med')
        .text()
        .trim() !== team1.name
    ) {
      [team1.score, team2.score] = [team2.score, team1.score];
    }

    const status = mainContainer
      .find('.match-header-vs-note')
      .first()
      .text()
      .trim() as 'final';
    const bestOf = mainContainer
      .find('.match-header-vs-note')
      .last()
      .text()
      .trim();

    const streams: { name: string; link: string }[] = [];
    $('.match-streams .match-streams-container > *').each((i, el) => {
      const $el = $(el);
      let name = '';
      let link: string | undefined = '';

      if ($el.is('a')) {
        name = $el.text().trim().replace(/\s+/g, ' ');
        link = $el.attr('href');
      } else if ($el.find('.match-streams-btn-embed').length > 0) {
        name = $el
          .find('.match-streams-btn-embed')
          .text()
          .trim()
          .replace(/\s+/g, ' ');
        link = $el.find('.match-streams-btn-external').attr('href');
      }

      if (name && link) {
        streams.push({ name, link });
      }
    });

    const vods: { name: string; link: string }[] = [];
    $('.match-vods .wf-card a').each((i, el) => {
      const $el = $(el);
      const link = $el.attr('href');
      const name = $el.text().trim();
      if (link) {
        vods.push({
          name,
          link: link.startsWith('http') ? link : 'https://' + link,
        });
      }
    });

    const maps = this.parseCompletedMatchMaps($);
    const head2head = this.parseHeadToHead($);
    const pastMatches = this.parsePastMatches($);

    const matchData: VlrCompletedMatch = {
      id: matchId,
      event,
      date,
      time,
      utcTimestamp,
      patch,
      team1,
      team2,
      status,
      bestOf,
      streams,
      vods,
      maps,
      head2head,
      pastMatchesTeam1: pastMatches.team1,
      pastMatchesTeam2: pastMatches.team2,
    };

    return matchData;
  }

  private parsePastMatches($: cheerio.CheerioAPI): {
    team1: VlrPastMatch[];
    team2: VlrPastMatch[];
  } {
    const team1Matches: VlrPastMatch[] = [];
    const team2Matches: VlrPastMatch[] = [];

    const histories = $('.match-histories');
    histories
      .first()
      .find('a.match-histories-item')
      .each((_, el) => {
        const $el = $(el);
        const opponentName = $el
          .find('.match-histories-item-opponent-name')
          .text()
          .trim();
        const opponentLogoUrl =
          'https:' +
          $el.find('.match-histories-item-opponent-logo').attr('src');
        const result = `${$el.find('.rf').text().trim()}-${$el
          .find('.ra')
          .text()
          .trim()}`;
        const link = this.vlrUrl + $el.attr('href');
        const date = $el.find('.match-histories-item-date').text().trim();
        const win = $el.hasClass('mod-win');

        team1Matches.push({
          opponentName,
          opponentLogoUrl,
          result,
          link,
          date,
          win,
        });
      });
    histories
      .last()
      .find('a.match-histories-item')
      .each((_, el) => {
        const $el = $(el);
        const opponentName = $el
          .find('.match-histories-item-opponent-name')
          .text()
          .trim();
        const opponentLogoUrl =
          'https:' +
          $el.find('.match-histories-item-opponent-logo').attr('src');
        const result = `${$el.find('.rf').text().trim()}-${$el
          .find('.ra')
          .text()
          .trim()}`;
        const link = this.vlrUrl + $el.attr('href');
        const date = $el.find('.match-histories-item-date').text().trim();
        const win = $el.hasClass('mod-win');

        team2Matches.push({
          opponentName,
          opponentLogoUrl,
          result,
          link,
          date,
          win,
        });
      });

    return { team1: team1Matches, team2: team2Matches };
  }

  private parseHeadToHead($: cheerio.CheerioAPI): VlrHeadToHead[] {
    const h2h: VlrHeadToHead[] = [];
    $('.match-h2h-matches a').each((_, el) => {
      const $el = $(el);
      const scores = $el.find('.match-h2h-matches-score .rf');
      const score1 = parseInt(scores.first().text().trim(), 10);
      const score2 = parseInt(scores.last().text().trim(), 10);
      const result = `${score1}-${score2}`;
      const date = $el.find('.match-h2h-matches-date').text().trim();
      const link = this.vlrUrl + $el.attr('href');

      const winnerImg = $el.find('.match-h2h-matches-team.mod-win').attr('src');
      const team1img =
        'https:' + $('.match-h2h-header-team').first().find('img').attr('src');

      const win = !!winnerImg && team1img.includes(winnerImg);

      h2h.push({ result, link, date, win });
    });
    return h2h;
  }

  private parseCompletedMatchMaps(
    $: cheerio.CheerioAPI,
  ): VlrCompletedMatchMap[] {
    const maps: VlrCompletedMatchMap[] = [];

    $('.vm-stats-game[data-game-id]').each((i, el) => {
      const gameId = $(el).data('game-id');
      if (gameId === 'all') {
        return;
      }

      const mapElement = $(el).find('.map > div > span');
      if (!mapElement.length) return;

      const mapName = mapElement.contents().first().text().trim();
      if (mapName.toLowerCase() === 'tbd') {
        return;
      }

      const duration = $(el).find('.map-duration').text().trim();

      const team1Score = parseInt(
        $(el).find('.team:not(.mod-right) .score').text().trim(),
        10,
      );
      const team2Score = parseInt(
        $(el).find('.team.mod-right .score').text().trim(),
        10,
      );

      const team1SideStatsSpans = $(el).find(
        '.team:not(.mod-right) span[class^="mod-"]',
      );
      const team1SideStats = {
        defense: parseInt(team1SideStatsSpans.first().text().trim(), 10),
        attack: parseInt(team1SideStatsSpans.last().text().trim(), 10),
      };

      const team2SideStatsSpans = $(el).find(
        '.team.mod-right span[class^="mod-"]',
      );
      const team2SideStats = {
        attack: parseInt(team2SideStatsSpans.first().text().trim(), 10),
        defense: parseInt(team2SideStatsSpans.last().text().trim(), 10),
      };

      const rounds = this.parseRounds($, el);

      const tables = $(el).find('table.wf-table-inset.mod-overview');
      const team1Stats: VlrPlayerStatsCompleted[] = [];
      const team2Stats: VlrPlayerStatsCompleted[] = [];

      tables
        .first()
        .find('tbody tr')
        .each((_, playerRow) => {
          const stats: VlrPlayerStatsCompleted = this.parsePlayerStatsCompleted(
            $,
            playerRow,
          );
          team1Stats.push(stats);
        });

      tables
        .last()
        .find('tbody tr')
        .each((_, playerRow) => {
          const stats: VlrPlayerStatsCompleted = this.parsePlayerStatsCompleted(
            $,
            playerRow,
          );
          team2Stats.push(stats);
        });

      maps.push({
        name: mapName,
        duration,
        team1Score,
        team2Score,
        team1SideStats,
        team2SideStats,
        rounds,
        team1Stats,
        team2Stats,
      });
    });
    return maps;
  }

  private parseRounds($: cheerio.CheerioAPI, mapContainer: any): VlrRound[] {
    const rounds: VlrRound[] = [];
    $(mapContainer)
      .find('.vlr-rounds-row-col')
      .each((i, roundEl) => {
        const roundNumText = $(roundEl).find('.rnd-num').text().trim();
        if (!roundNumText) return;

        const roundNum = parseInt(roundNumText, 10);
        const winSideEl = $(roundEl).find('.rnd-sq.mod-win');
        const winningTeamSide = winSideEl.hasClass('mod-ct') ? 'ct' : 't';

        const outcomeIcon = winSideEl.find('img').attr('src') || '';
        const outcomeMatch = outcomeIcon.match(/round\/(\w+)\.webp/);
        const outcome = (
          outcomeMatch ? outcomeMatch[1] : 'unknown'
        ) as VlrRoundOutcome;

        rounds.push({
          roundNum,
          winningTeamSide,
          outcome,
          outcomeIconUrl: this.vlrUrl + outcomeIcon,
        });
      });
    return rounds;
  }

  private parsePlayerStatsCompleted(
    $: cheerio.CheerioAPI,
    playerRow: any,
  ): VlrPlayerStatsCompleted {
    const getStat = (index: number): VlrPlayerStatValue => ({
      all: $(playerRow)
        .find('.mod-stat')
        .eq(index)
        .find('.side.mod-side.mod-both')
        .text()
        .trim(),
      attack: $(playerRow)
        .find('.mod-stat')
        .eq(index)
        .find('.side.mod-side.mod-t')
        .text()
        .trim(),
      defense: $(playerRow)
        .find('.mod-stat')
        .eq(index)
        .find('.side.mod-side.mod-ct')
        .text()
        .trim(),
    });

    const getKDAStat = (className: string): VlrPlayerStatValue => ({
      all: $(playerRow).find(className).find('.side.mod-both').text().trim(),
      attack: $(playerRow).find(className).find('.side.mod-t').text().trim(),
      defense: $(playerRow).find(className).find('.side.mod-ct').text().trim(),
    });

    return {
      name: $(playerRow).find('.mod-player .text-of').text().trim(),
      link: this.vlrUrl + $(playerRow).find('.mod-player a').attr('href'),
      agents: $(playerRow)
        .find('.mod-agents img')
        .map((_, agentEl) => ({
          name: $(agentEl).attr('title') || '',
          iconUrl: 'https:' + $(agentEl).attr('src'),
        }))
        .get(),
      rating: getStat(0),
      acs: getStat(1),
      k: getKDAStat('.mod-vlr-kills'),
      d: {
        all: $(playerRow).find('.mod-vlr-deaths .side.mod-both').text().trim(),
        attack: $(playerRow).find('.mod-vlr-deaths .side.mod-t').text().trim(),
        defense: $(playerRow)
          .find('.mod-vlr-deaths .side.mod-ct')
          .text()
          .trim(),
      },
      a: getKDAStat('.mod-vlr-assists'),
      kdDiff: getStat(4),
      kast: getStat(5),
      adr: getStat(6),
      hsPercent: getStat(7),
      fk: getKDAStat('.mod-fb'),
      fd: getKDAStat('.mod-fd'),
      fkDiff: getStat(10),
    };
  }

  /**
   * @description Get the match data from the match page
   * @param matchId The ID of the match
   * @returns The match data
   */
  getUpcomingMatchById(matchId: string, $: cheerio.CheerioAPI): VlrMatch {
    const mainContainer = $('.col.mod-3');

    const eventNameElement = mainContainer.find(
      '.match-header-event > div > div',
    );
    const series = eventNameElement
      .find('.match-header-event-series')
      .text()
      .trim()
      .replace(/\s+/g, ' ');
    const eventName = eventNameElement
      .text()
      .trim()
      .replace(series, '')
      .replace(/\s+/g, ' ')
      .trim();

    const event = {
      name: eventName,
      series: series,
    };

    const date = mainContainer
      .find('.match-header-date > .moment-tz-convert')
      .first()
      .text()
      .trim();
    const time = mainContainer
      .find('.match-header-date > .moment-tz-convert')
      .last()
      .text()
      .trim();
    const utcTimestamp = mainContainer
      .find('.match-header-date > .moment-tz-convert')
      .data('utc-ts') as string;

    const team1 = {
      name: mainContainer
        .find('.match-header-link-name.mod-1 .wf-title-med')
        .text()
        .trim(),
      logoUrl:
        'https:' +
        mainContainer.find('.match-header-link.mod-1 img').attr('src'),
      link:
        this.vlrUrl +
        mainContainer.find('.match-header-link.mod-1').attr('href'),
    };
    const team2 = {
      name: mainContainer
        .find('.match-header-link-name.mod-2 .wf-title-med')
        .text()
        .trim(),
      logoUrl:
        'https:' +
        mainContainer.find('.match-header-link.mod-2 img').attr('src'),
      link:
        this.vlrUrl +
        mainContainer.find('.match-header-link.mod-2').attr('href'),
    };

    const status = mainContainer
      .find('.match-header-vs-note')
      .first()
      .text()
      .trim();
    const bestOf = mainContainer
      .find('.match-header-vs-note')
      .last()
      .text()
      .trim();

    const streams: { name: string; link: string }[] = [];
    $('.match-streams-container > *').each((i, el) => {
      const $el = $(el);
      let name = '';
      let link: string | undefined = '';

      if ($el.is('a')) {
        name = $el.text().trim().replace(/\s+/g, ' ');
        link = $el.attr('href');
      } else {
        name = $el
          .find('.match-streams-btn-embed')
          .text()
          .trim()
          .replace(/\s+/g, ' ');
        link = $el.find('.match-streams-btn-external').attr('href');
      }

      if (name && link) {
        streams.push({ name, link });
      }
    });

    const vodsAvailable = !$('.match-vods .wf-card')
      .text()
      .includes('Not yet available');

    const maps: VlrMatchMap[] = [];

    $('.vm-stats-game[data-game-id]').each((i, el) => {
      const gameId = $(el).data('game-id');
      if (gameId === 'all') {
        return;
      }

      const mapElement = $(el).find('.map > div > span');
      if (!mapElement.length) return;

      const mapName = mapElement.contents().first().text().trim();
      if (mapName.toLowerCase() === 'tbd') {
        return;
      }

      const team1Score = $(el)
        .find('.team:not(.mod-right) .score')
        .text()
        .trim();
      const team2Score = $(el).find('.team.mod-right .score').text().trim();

      const tables = $(el).find('table.wf-table-inset.mod-overview');
      const team1Stats: VlrPlayerStats[] = [];
      const team2Stats: VlrPlayerStats[] = [];

      tables
        .first()
        .find('tbody tr')
        .each((_, playerRow) => {
          const stats: VlrPlayerStats = this.parsePlayerStats($, playerRow);
          team1Stats.push(stats);
        });

      tables
        .last()
        .find('tbody tr')
        .each((_, playerRow) => {
          const stats: VlrPlayerStats = this.parsePlayerStats($, playerRow);
          team2Stats.push(stats);
        });

      maps.push({
        name: mapName,
        team1Score,
        team2Score,
        team1Stats,
        team2Stats,
      });
    });

    const matchData: VlrMatch = {
      id: matchId,
      event,
      date,
      time,
      utcTimestamp,
      team1,
      team2,
      status,
      bestOf,
      streams,
      vodsAvailable,
      maps,
    };

    return matchData;
  }

  /**
   * @description Parse the player stats from the player row
   * @param $ The cheerio instance
   * @param playerRow The player row
   * @returns The player stats
   */
  private parsePlayerStats(
    $: cheerio.CheerioAPI,
    playerRow: any,
  ): VlrPlayerStats {
    const getStat = (index: number) =>
      $(playerRow).find('.mod-stat').eq(index).text().trim();

    return {
      name: $(playerRow).find('.mod-player .text-of').text().trim(),
      link: this.vlrUrl + $(playerRow).find('.mod-player a').attr('href'),
      agents: $(playerRow)
        .find('.mod-agents img')
        .map((_, agentEl) => ({
          iconUrl: 'https:' + $(agentEl).attr('src'),
        }))
        .get(),
      rating: getStat(0),
      acs: getStat(1),
      k: $(playerRow).find('.mod-vlr-kills').text().trim(),
      d: $(playerRow)
        .find('.mod-vlr-deaths')
        .text()
        .trim()
        .replace(/\//g, '')
        .trim(),
      a: $(playerRow).find('.mod-vlr-assists').text().trim(),
      kdDiff: $(playerRow).find('.mod-kd-diff').text().trim(),
      kast: getStat(5),
      adr: getStat(6),
      hsPercent: getStat(7),
      fk: $(playerRow).find('.mod-fb').text().trim(),
      fd: $(playerRow).find('.mod-fd').text().trim(),
      fkDiff: $(playerRow).find('.mod-fk-diff').text().trim(),
    };
  }

  /**
   * @description Get the matches from a team ID
   * @param teamId The ID of the team
   * @returns The matches from the team
   */
  public async getMatchesFromTeamId(
    teamId: string,
  ): Promise<(VlrMatch | VlrCompletedMatch)[]> {
    const allMatchIds: string[] = [];
    let page = 1;

    while (true) {
      const res = await fetch(
        `${this.vlrUrl}/team/matches/${teamId}/?page=${page}`,
      );
      const html = await res.text();
      const $ = cheerio.load(html);

      const matchLinks = $('a.wf-card.fc-flex.m-item');

      if (matchLinks.length === 0) {
        break;
      }

      matchLinks.each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
          const matchIdMatch = href.match(/\d+/);
          if (matchIdMatch && matchIdMatch[0]) {
            allMatchIds.push(matchIdMatch[0]);
          }
        }
      });

      page++;
    }

    const uniqueMatchIds = [...new Set(allMatchIds)];
    const matchDetailsPromises = uniqueMatchIds.map((id) =>
      this.getMatchById(id),
    );
    const allMatches = await Promise.all(matchDetailsPromises);

    return allMatches;
  }

  async getTeamById(teamId: string): Promise<VlrTeam> {
    const res = await fetch(`${this.vlrUrl}/team/${teamId}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const name = $('.team-header-name h1').text().trim();
    const tag = $('.team-header-name h2').text().trim();
    const logoSrc = $('.team-header-logo img').attr('src');
    const logoUrl = logoSrc
      ? 'https:' + logoSrc
      : 'https://www.vlr.gg/img/vlr/tmp/vlr.png';
    const country = $('.team-header-country').text().trim();
    const roster: VlrTeam['roster'] = [];
    const staff: VlrTeam['staff'] = [];

    const rosterElements = $('.team-roster-item');
    rosterElements.each((i, el) => {
      const $el = $(el);
      const aliasElement = $el.find('.team-roster-item-name-alias');
      const countryClass = aliasElement.find('i.flag').attr('class');
      const countryName = this.getCountryFromClass(countryClass);

      // Clone to extract name without modifying the tree for subsequent operations
      const aliasClone = aliasElement.clone();
      aliasClone.find('i.flag').remove();
      const playerName = aliasClone.text().trim();

      const playerLink = this.vlrUrl + $el.find('a').attr('href');
      const realName = $el.find('.team-roster-item-name-real').text().trim();

      const isSub =
        $el.find('.wf-tag.mod-light:contains("Sub")').length > 0 ||
        $el.find('.wf-tag.mod-light:contains("Substitute")').length > 0;

      const roleElement = $el.find(
        '.wf-tag.mod-light.team-roster-item-name-role',
      );
      const isStaff = roleElement.length > 0 && !isSub;

      const player: VlrPlayer = {
        name: playerName,
        link: playerLink,
        realName: realName || undefined,
        country: countryName,
        isSub,
        isStaff,
        role: isStaff ? roleElement.text().trim() : undefined,
      };

      if (isStaff) {
        staff.push(player);
      } else {
        roster.push(player);
      }
    });

    return {
      name,
      tag,
      logoUrl,
      country,
      roster,
      staff,
    };
  }

  private getCountryFromClass(className?: string): string {
    if (!className) return '';

    const classParts = className.split(' ');
    const modClass = classParts.find((c) => c.startsWith('mod-'));

    if (!modClass) return '';

    const countryCode = modClass.slice(4);
    const countryMap: { [key: string]: string } = {
      eg: 'Egypt',
      jo: 'Jordan',
      ru: 'Russia',
      tn: 'Tunisia',
      un: 'International',
    };

    return countryMap[countryCode] || '';
  }
}
