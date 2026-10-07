import {
  NR,
  compareBallot,
  consensusRankMap,
  outliersForWeek,
  weekBallots,
} from "./analysis";
import {
  ballots,
  conferenceOf,
  latestWeek,
  seasonMeta,
  teamById,
  voterById,
  voters,
  weekLabel,
  type Ballot,
} from "./data";
import { voterCtx, type VoterCtx } from "./voters-meta";
import { crownTimeline, homers, volatility, wildestBallots } from "./viz";

const SKIP_CONF = new Set(["Independent", "Other"]);

export interface UnbalancedRow {
  voter: VoterCtx;
  conference: string;
  /** Negative = voter ranks the conference HIGHER than consensus. */
  avgDiff: number;
  n: number;
  week: number;
  story: string;
}

/**
 * The most unbalanced voters in a single week: per-voter, per-conference mean
 * (voter rank − consensus rank) over consensus top-25 teams, strongest lean
 * first. n >= 6 keeps single-week samples honest.
 */
export function unbalancedThisWeek(season: number, week: number, limit = 6): UnbalancedRow[] {
  const rows: UnbalancedRow[] = [];
  for (const b of weekBallots(season, week)) {
    const acc = new Map<string, { sum: number; n: number }>();
    for (const r of compareBallot(b)) {
      if (r.consensusRank === null) continue;
      const conf = conferenceOf(r.team, season);
      if (SKIP_CONF.has(conf)) continue;
      const e = acc.get(conf) ?? { sum: 0, n: 0 };
      e.sum += r.diff;
      e.n += 1;
      acc.set(conf, e);
    }
    let best: { conference: string; avgDiff: number; n: number } | null = null;
    for (const [conference, e] of acc) {
      if (e.n < 6) continue;
      const avgDiff = e.sum / e.n;
      if (!best || Math.abs(avgDiff) > Math.abs(best.avgDiff)) best = { conference, avgDiff, n: e.n };
    }
    if (best && Math.abs(best.avgDiff) >= 1.5) {
      const ctx = voterCtx(b.voter);
      const dir = best.avgDiff < 0 ? "higher" : "lower";
      rows.push({
        voter: ctx,
        conference: best.conference,
        avgDiff: best.avgDiff,
        n: best.n,
        week,
        story: `ranks the ${best.conference} ${Math.abs(best.avgDiff).toFixed(1)} spots ${dir} than consensus`,
      });
    }
  }
  return rows.sort((a, b) => Math.abs(b.avgDiff) - Math.abs(a.avgDiff)).slice(0, limit);
}

export interface WildCard {
  voter: VoterCtx;
  week: number;
  weekLabel: string;
  outlierCount: number;
  wildestTeamName: string;
  wildestDiff: number;
}

export function wildestCards(season: number, limit = 5): WildCard[] {
  return wildestBallots(season, limit).map((w) => ({
    voter: voterCtx(w.voterId),
    week: w.week,
    weekLabel: weekLabel(season, w.week),
    outlierCount: w.outlierCount,
    wildestTeamName: w.wildestTeamName,
    wildestDiff: w.wildestDiff,
  }));
}

export interface HomerCard {
  voter: VoterCtx;
  teamName: string;
  conference: string;
  avgDiff: number;
  weeks: number;
}

export function homerCards(season: number, limit = 5): HomerCard[] {
  return homers(season, limit).map((h) => ({
    voter: voterCtx(h.voterId),
    teamName: h.teamName,
    conference: h.conference,
    avgDiff: h.avgDiff,
    weeks: h.weeks,
  }));
}

export interface ChurnCard {
  voter: VoterCtx;
  volatility: number;
  ballots: number;
}

export function churnCards(season: number, limit = 5): ChurnCard[] {
  const rows: ChurnCard[] = [];
  for (const v of voters) {
    if (!v.seasons.includes(season)) continue;
    const vol = volatility(v.id, season);
    if (vol === null) continue;
    const n = ballots.filter((b: Ballot) => b.voter === v.id && b.season === season).length;
    rows.push({ voter: voterCtx(v.id), volatility: vol, ballots: n });
  }
  return rows.sort((a, b) => b.volatility - a.volatility).slice(0, limit);
}

export interface CrownCard {
  weekLabel: string;
  teamName: string;
  voterCount: number;
  unanimous: boolean;
}

/** Latest week's #1-vote split, compressed to a card. */
export function latestCrown(season: number): CrownCard | null {
  const weeks = crownTimeline(season);
  const last = weeks[weeks.length - 1];
  if (!last || last.leaders.length === 0) return null;
  const counts = new Map<string, number>();
  for (const l of last.leaders) counts.set(l.teamName, (counts.get(l.teamName) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    weekLabel: last.label,
    teamName: top[0],
    voterCount: top[1],
    unanimous: counts.size === 1,
  };
}

export interface MoverRow {
  teamName: string;
  from: number | null;
  to: number | null;
  delta: number;
}

/** Biggest consensus movers between the last two weeks — the week's narrative. */
export function biggestMovers(season: number, limit = 6): MoverRow[] {
  const weeks = seasonMeta(season).weeks.map((w) => w.week);
  if (weeks.length < 2) return [];
  const cur = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];
  const curMap = consensusRankMap(season, cur);
  const prevMap = consensusRankMap(season, prev);
  const rows: MoverRow[] = [];
  const seen = new Set<string>();
  for (const [team, to] of curMap) {
    seen.add(team);
    const from = prevMap.get(team) ?? null;
    rows.push({ teamName: teamById.get(team)?.name ?? team, from, to, delta: (from ?? NR) - to });
  }
  for (const [team, from] of prevMap) {
    if (!seen.has(team)) rows.push({ teamName: teamById.get(team)?.name ?? team, from, to: null, delta: from - NR });
  }
  return rows
    .filter((r) => Math.abs(r.delta) >= 3)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit);
}

/** Hero stat strip for the feed: ballots filed, outlier picks, most deviant voter. */
export function weekStats(season: number, week: number): {
  ballots: number;
  outliers: number;
  mostDeviant: VoterCtx | null;
  mostDeviantOutliers: number;
} {
  const bs = weekBallots(season, week);
  const { voters: dev } = outliersForWeek(season, week);
  const top = dev[0];
  return {
    ballots: bs.length,
    outliers: dev.reduce((s, v) => s + v.outliers, 0),
    mostDeviant: top ? voterCtx(top.voter) : null,
    mostDeviantOutliers: top?.outliers ?? 0,
  };
}

export function seasonWeek(season: number): { season: number; week: number; label: string } {
  const week = latestWeek(season);
  return { season, week, label: weekLabel(season, week) };
}

export interface BalancedRow {
  voter: VoterCtx;
  avgAbs: number;
  n: number;
}

/** The most balanced voters in a week: lowest mean |diff| vs consensus. */
export function balancedThisWeek(season: number, week: number, limit = 3): BalancedRow[] {
  const rows: BalancedRow[] = [];
  for (const b of weekBallots(season, week)) {
    let sum = 0;
    let n = 0;
    for (const r of compareBallot(b)) {
      if (r.consensusRank === null) continue;
      sum += Math.abs(r.diff);
      n++;
    }
    if (n >= 20) rows.push({ voter: voterCtx(b.voter), avgAbs: sum / n, n });
  }
  return rows.sort((a, b) => a.avgAbs - b.avgAbs).slice(0, limit);
}

export { voterById };
