import { Injectable } from '@nestjs/common';
import type {
  VlrMatch,
  VlrMatchMap,
  VlrPlayerStats,
  VlrUpcomingMatches,
  VlrUpcomingMatchRes,
} from './vlr';
import * as cheerio from 'cheerio';

@Injectable()
export class VlrService {
  private readonly apiUrl = 'https://vlrggapi.vercel.app';
  private readonly vlrUrl = 'https://www.vlr.gg';

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
    const matchIdMatch = url.match(/vlr\.gg\/(\d+)/);
    return matchIdMatch ? matchIdMatch[1] : '';
  }

  /**
   * @description Get the match data from the match page
   * @param matchId The ID of the match
   * @returns The match data
   */
  async getMatchById(matchId: string): Promise<VlrMatch> {
    const res = await fetch(`${this.vlrUrl}/${matchId}`);
    const html = await res.text();
    const $ = cheerio.load(html);

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
    };
    const team2 = {
      name: mainContainer
        .find('.match-header-link-name.mod-2 .wf-title-med')
        .text()
        .trim(),
      logoUrl:
        'https:' +
        mainContainer.find('.match-header-link.mod-2 img').attr('src'),
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
  public async getMatchesFromTeamId(teamId: string): Promise<VlrMatch[]> {
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
}
