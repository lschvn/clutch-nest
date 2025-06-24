export type VlrUpcomingMatch = {
  team1: string;
  team2: string;
  flag1: string;
  flag2: string;
  time_until_match: string;
  match_series: string;
  match_event: string;
  unix_timestamp: string;
  match_page: string;
};

export type VlrUpcomingMatches = VlrUpcomingMatch[];

export type VlrUpcomingMatchRes = {
  data: {
    status: number;
    segments: VlrUpcomingMatches;
  };
};

export type VlrPlayerStats = {
  name: string;
  link: string;
  agents: {
    iconUrl: string;
  }[];
  rating: string;
  acs: string;
  k: string;
  d: string;
  a: string;
  kdDiff: string;
  kast: string;
  adr: string;
  hsPercent: string;
  fk: string;
  fd: string;
  fkDiff: string;
};

export type VlrMatchMap = {
  name: string;
  team1Score: string;
  team2Score: string;
  team1Stats: VlrPlayerStats[];
  team2Stats: VlrPlayerStats[];
};

export type VlrMatch = {
  id: string;
  event: {
    name: string;
    series: string;
  };
  date: string;
  time: string;
  utcTimestamp: string;
  team1: {
    name: string;
    logoUrl: string;
    link: string;
  };
  team2: {
    name: string;
    logoUrl: string;
    link: string;
  };
  status: string;
  bestOf: string;
  streams: {
    name: string;
    link: string;
  }[];
  vodsAvailable: boolean;
  maps: VlrMatchMap[];
};

export type VlrPlayer = {
  name: string;
  link: string;
  realName?: string;
  country: string;
  isSub: boolean;
  isStaff: boolean;
  role?: string;
};

export type VlrTeam = {
  name: string;
  tag: string;
  logoUrl: string;
  country: string;
  roster: VlrPlayer[];
  staff: VlrPlayer[];
};

export type VlrTeamInfoCompleted = {
  name: string;
  logoUrl: string;
  link: string;
  elo: string;
  score: number;
};

export type VlrPlayerStatValue = {
  all: string;
  attack: string;
  defense: string;
};

export type VlrPlayerStatsCompleted = {
  name: string;
  link: string;
  agents: { iconUrl: string; name: string }[];
  rating: VlrPlayerStatValue;
  acs: VlrPlayerStatValue;
  k: VlrPlayerStatValue;
  d: VlrPlayerStatValue;
  a: VlrPlayerStatValue;
  kdDiff: VlrPlayerStatValue;
  kast: VlrPlayerStatValue;
  adr: VlrPlayerStatValue;
  hsPercent: VlrPlayerStatValue;
  fk: VlrPlayerStatValue;
  fd: VlrPlayerStatValue;
  fkDiff: VlrPlayerStatValue;
};

export type VlrRoundOutcome = 'defuse' | 'elim' | 'boom' | 'time' | 'unknown';

export type VlrRound = {
  roundNum: number;
  winningTeamSide: 't' | 'ct';
  outcome: VlrRoundOutcome;
  outcomeIconUrl: string;
};

export type VlrCompletedMatchMap = {
  name: string;
  duration: string;
  team1Score: number;
  team2Score: number;
  team1SideStats: { attack: number; defense: number };
  team2SideStats: { attack: number; defense: number };
  rounds: VlrRound[];
  team1Stats: VlrPlayerStatsCompleted[];
  team2Stats: VlrPlayerStatsCompleted[];
};

export type VlrEventInfo = {
  name: string;
  series: string;
  link: string;
  imageUrl: string;
};

export type VlrPastMatch = {
  opponentName: string;
  opponentLogoUrl: string;
  result: string; // e.g. "1-2"
  link: string;
  date: string;
  win: boolean;
};

export type VlrHeadToHead = {
  result: string; // e.g. "2-1"
  link: string;
  date: string;
  win: boolean;
};

export type VlrCompletedMatch = {
  id: string;
  event: VlrEventInfo;
  date: string;
  time: string;
  utcTimestamp: string;
  patch: string;
  team1: VlrTeamInfoCompleted;
  team2: VlrTeamInfoCompleted;
  status: 'final';
  bestOf: string;
  streams: { name: string; link: string }[];
  vods: { name: string; link: string }[];
  maps: VlrCompletedMatchMap[];
  head2head: VlrHeadToHead[];
  pastMatchesTeam1: VlrPastMatch[];
  pastMatchesTeam2: VlrPastMatch[];
};
