import { ballots, conferenceOf, seasonMeta, voters, type Ballot } from "./data";

/** Rank used for a team a voter left off their ballot ("NR"), as in the AP convention of 26. */
export const NR = 26;
/** A ballot position is an outlier when it is this many spots or more from consensus. */
export const OUTLIER_THRESHOLD = 5;
/** Minimum number of (week, team) observations before a conference lean is reported. */
export const MIN_BIAS_SAMPLE = 15;
/** Conference groups that are not real conferences; excluded from the bias leaderboard. */
const NOT_A_CONFERENCE = new Set(["Independent", "Other"]);

// ---------- Borda consensus ----------

export interface ConsensusRow {
  rank: number;
  team: string;
  /** Borda points: 25 for a #1 vote down to 1 for a #25 vote. */
  points: number;
  firstPlaceVotes: number;
  /** Number of ballots that ranked this team. */
  ballots: number;
}

const ballotIndex = new Map<string, Ballot[]>();
for (const b of ballots) {
  const key = `${b.season}-${b.week}`;
  const list = ballotIndex.get(key);
  if (list) list.push(b);
  else ballotIndex.set(key, [b]);
}

export function weekBallots(season: number, week: number): Ballot[] {
  return ballotIndex.get(`${season}-${week}`) ?? [];
}

const consensusCache = new Map<string, ConsensusRow[]>();

/**
 * Weekly consensus top 25 computed from the ballots with a Borda count.
 * Rows are ordered by points, then first-place votes, then number of ballots
 * ranking the team, then alphabetically by team id (so the order is
 * deterministic). Teams equal on points, first-place votes and ballots share a
 * rank (standard competition ranking: 1, 2, 2, 4); the alphabetical order only
 * decides display order within a tie.
 */
export function consensusFor(season: number, week: number): ConsensusRow[] {
  const key = `${season}-${week}`;
  const hit = consensusCache.get(key);
  if (hit) return hit;
  const acc = new Map<string, Omit<ConsensusRow, "rank">>();
  for (const b of weekBallots(season, week)) {
    b.rankings.forEach((team, i) => {
      const rank = i + 1;
      const row = acc.get(team) ?? { team, points: 0, firstPlaceVotes: 0, ballots: 0 };
      row.points += 26 - rank;
      row.ballots += 1;
      if (rank === 1) row.firstPlaceVotes += 1;
      acc.set(team, row);
    });
  }
  const rows = [...acc.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.firstPlaceVotes - a.firstPlaceVotes ||
        b.ballots - a.ballots ||
        a.team.localeCompare(b.team),
    )
    .slice(0, 25)
    .map((r, i, all) => {
      const first = all.findIndex(
        (o) => o.points === r.points && o.firstPlaceVotes === r.firstPlaceVotes && o.ballots === r.ballots,
      );
      return { ...r, rank: first + 1 };
    });
  consensusCache.set(key, rows);
  return rows;
}

export function consensusRankMap(season: number, week: number): Map<string, number> {
  return new Map(consensusFor(season, week).map((r) => [r.team, r.rank]));
}

// ---------- ballot vs consensus ----------

export interface PickComparison {
  team: string;
  /** null = voter left the team off their ballot. */
  voterRank: number | null;
  /** null = team is not in the consensus top 25. */
  consensusRank: number | null;
  /** voterRank - consensusRank with NR = 26. Negative = voter ranks the team higher than consensus. */
  diff: number;
}

/**
 * Every team on the ballot, plus every consensus top-25 team the voter omitted.
 * Missing ranks count as NR (26) when computing the difference.
 */
export function compareBallot(ballot: Ballot): PickComparison[] {
  const cons = consensusRankMap(ballot.season, ballot.week);
  const out: PickComparison[] = ballot.rankings.map((team, i) => {
    const voterRank = i + 1;
    const consensusRank = cons.get(team) ?? null;
    return { team, voterRank, consensusRank, diff: voterRank - (consensusRank ?? NR) };
  });
  const onBallot = new Set(ballot.rankings);
  for (const [team, consensusRank] of cons) {
    if (!onBallot.has(team)) out.push({ team, voterRank: null, consensusRank, diff: NR - consensusRank });
  }
  return out;
}

/** Comparison rows for teams in the consensus top 25 only (ballot or omitted). */
const consensusTeamsOnly = (rows: PickComparison[]) => rows.filter((r) => r.consensusRank !== null);

/** Consensus fit: 100 - 10 x average |diff| across consensus top-25 teams. */
export function fitFromAvgAbs(avgAbs: number): number {
  return 100 - 10 * avgAbs;
}

export interface VoterFit {
  avgAbsDiff: number;
  fit: number;
  ballots: number;
}

const fitCache = new Map<string, VoterFit | null>();

/** Consensus-fit for a voter in one season, or across all seasons if `season` is omitted. */
export function voterFit(voterId: string, season?: number): VoterFit | null {
  const key = `${voterId}-${season ?? "all"}`;
  if (fitCache.has(key)) return fitCache.get(key)!;
  let sum = 0;
  let n = 0;
  let count = 0;
  for (const b of ballots) {
    if (b.voter !== voterId || (season !== undefined && b.season !== season)) continue;
    count++;
    for (const r of consensusTeamsOnly(compareBallot(b))) {
      sum += Math.abs(r.diff);
      n++;
    }
  }
  const result = n === 0 ? null : { avgAbsDiff: sum / n, fit: fitFromAvgAbs(sum / n), ballots: count };
  fitCache.set(key, result);
  return result;
}

// ---------- conference bias ----------

export interface ConferenceBias {
  conference: string;
  /** Mean of (voter rank - consensus rank). Negative = conference ranked HIGHER than consensus. */
  avgDiff: number;
  /** Number of (week, team) observations behind the mean. */
  n: number;
  teams: number;
}

const biasCache = new Map<string, ConferenceBias[]>();

/**
 * Per-conference bias for one voter in one season: the average of
 * (voter rank - consensus rank) over every (week, team) where the team was in
 * that week's consensus top 25. A consensus team the voter omitted counts as 26.
 */
export function conferenceBias(voterId: string, season: number): ConferenceBias[] {
  const key = `${voterId}-${season}`;
  const hit = biasCache.get(key);
  if (hit) return hit;
  const acc = new Map<string, { sum: number; n: number; teams: Set<string> }>();
  for (const b of ballots) {
    if (b.voter !== voterId || b.season !== season) continue;
    for (const r of consensusTeamsOnly(compareBallot(b))) {
      const conf = conferenceOf(r.team, season);
      const e = acc.get(conf) ?? { sum: 0, n: 0, teams: new Set<string>() };
      e.sum += r.diff;
      e.n += 1;
      e.teams.add(r.team);
      acc.set(conf, e);
    }
  }
  const rows = [...acc.entries()]
    .map(([conference, e]) => ({ conference, avgDiff: e.sum / e.n, n: e.n, teams: e.teams.size }))
    .sort((a, b) => a.avgDiff - b.avgDiff);
  biasCache.set(key, rows);
  return rows;
}

export interface BiasLeaderboardRow {
  voter: string;
  conference: string;
  avgDiff: number;
  n: number;
}

/** Each voter's strongest conference lean (either direction) in a season, strongest first. */
export function biasLeaderboard(season: number, limit = 15): BiasLeaderboardRow[] {
  const rows: BiasLeaderboardRow[] = [];
  for (const v of voters) {
    if (!v.seasons.includes(season)) continue;
    const eligible = conferenceBias(v.id, season).filter(
      (c) => c.n >= MIN_BIAS_SAMPLE && !NOT_A_CONFERENCE.has(c.conference),
    );
    if (!eligible.length) continue;
    const top = eligible.reduce((a, b) => (Math.abs(b.avgDiff) > Math.abs(a.avgDiff) ? b : a));
    rows.push({ voter: v.id, conference: top.conference, avgDiff: top.avgDiff, n: top.n });
  }
  return rows.sort((a, b) => Math.abs(b.avgDiff) - Math.abs(a.avgDiff)).slice(0, limit);
}

// ---------- outliers ----------

export interface Outlier extends PickComparison {
  voter: string;
  season: number;
  week: number;
}

export interface VoterWeekDeviance {
  voter: string;
  /** Sum of |diff| over consensus top-25 teams. */
  totalAbsDiff: number;
  avgAbsDiff: number;
  outliers: number;
}

export interface WeekOutliers {
  /** Every flagged pick that week, largest deviation first. */
  outliers: Outlier[];
  /** Voters ranked from most to least deviant. */
  voters: VoterWeekDeviance[];
}

const outlierCache = new Map<string, WeekOutliers>();

/**
 * Flag every ballot position that is 5+ spots from consensus (either direction,
 * including consensus teams a voter omitted and non-consensus teams they ranked).
 * Voters are ranked by their total absolute deviation across consensus teams.
 */
export function outliersForWeek(season: number, week: number): WeekOutliers {
  const key = `${season}-${week}`;
  const hit = outlierCache.get(key);
  if (hit) return hit;
  const outliers: Outlier[] = [];
  const perVoter: VoterWeekDeviance[] = [];
  for (const b of weekBallots(season, week)) {
    const rows = compareBallot(b);
    const flagged = rows.filter((r) => Math.abs(r.diff) >= OUTLIER_THRESHOLD);
    for (const r of flagged) outliers.push({ ...r, voter: b.voter, season, week });
    const cons = consensusTeamsOnly(rows);
    const total = cons.reduce((s, r) => s + Math.abs(r.diff), 0);
    perVoter.push({
      voter: b.voter,
      totalAbsDiff: total,
      avgAbsDiff: cons.length ? total / cons.length : 0,
      outliers: flagged.length,
    });
  }
  outliers.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || a.voter.localeCompare(b.voter));
  perVoter.sort((a, b) => b.totalAbsDiff - a.totalAbsDiff || b.outliers - a.outliers);
  const result = { outliers, voters: perVoter };
  outlierCache.set(key, result);
  return result;
}

/** A voter's flagged picks across all weeks, biggest deviation first. */
export function voterOutlierPicks(voterId: string, limit = 15): Outlier[] {
  const out: Outlier[] = [];
  for (const b of ballots) {
    if (b.voter !== voterId) continue;
    for (const r of compareBallot(b)) {
      if (Math.abs(r.diff) >= OUTLIER_THRESHOLD) out.push({ ...r, voter: voterId, season: b.season, week: b.week });
    }
  }
  return out
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.season - a.season || b.week - a.week)
    .slice(0, limit);
}

// ---------- week-over-week movement ----------

/** Previous week's consensus rank by team, for movement arrows (null for the first week). */
export function previousConsensusRanks(season: number, week: number): Map<string, number> | null {
  const weeks = seasonMeta(season).weeks.map((w) => w.week);
  const i = weeks.indexOf(week);
  return i > 0 ? consensusRankMap(season, weeks[i - 1]) : null;
}
