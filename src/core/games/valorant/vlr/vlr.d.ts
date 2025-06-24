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
