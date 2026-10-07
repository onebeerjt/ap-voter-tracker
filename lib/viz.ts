import {
  NR,
  compareBallot,
  conferenceBias,
  consensusFor,
  consensusRankMap,
  voterFit,
  weekBallots,
} from "./analysis";
import { ballots, conferenceOf, seasonMeta, teamById, teams, voterById, voters, type Ballot } from "./data";

export interface ScatterPoint {
  team: string;
  teamName: string;
  voterRank: number | null;
  consensusRank: number | null;
  diff: number;
  conference: string;
}

/** Every (team) comparison row for one voter's one ballot, for the scatter plot. */
export function scatterFor(voterId: string, season: number, week: number): ScatterPoint[] {
  const b = ballots.find((x) => x.voter === voterId && x.season === season && x.week === week);
  if (!b) return [];
  return compareBallot(b).map((r) => ({
    team: r.team,
    teamName: teamById.get(r.team)?.name ?? r.team,
    voterRank: r.voterRank,
    consensusRank: r.consensusRank,
    diff: r.diff,
    conference: conferenceOf(r.team, season),
  }));
}

export interface BiasArrow {
  conference: string;
  avgDiff: number;
  n: number;
  teams: number;
  /** Human story line, e.g. "ranks the SEC 3.2 spots higher than everyone else". */
  story: string;
}

/** Conference bias rows with narrative lines attached, strongest lean first. */
export function biasArrows(voterId: string, season: number): BiasArrow[] {
  return conferenceBias(voterId, season)
    .filter((r) => r.n >= 15)
    .map((r) => {
      const dir = r.avgDiff < -0.5 ? "higher" : r.avgDiff > 0.5 ? "lower" : "about even with";
      const mag = Math.abs(r.avgDiff).toFixed(1);
      const story =
        r.avgDiff < -0.5
          ? `ranks the ${r.conference} ${mag} spots higher than consensus`
          : r.avgDiff > 0.5
            ? `ranks the ${r.conference} ${mag} spots lower than consensus`
            : `sees the ${r.conference} about like everyone else`;
      return { conference: r.conference, avgDiff: r.avgDiff, n: r.n, teams: r.teams, story };
    })
    .sort((a, b) => Math.abs(b.avgDiff) - Math.abs(a.avgDiff));
}

export interface Fingerprint {
  voterId: string;
  name: string;
  outlet: string;
  fit: number | null;
  ballots: number;
  outliers: number;
  topLeans: BiasArrow[];
  volatility: number | null;
}

/** One-card profile of a voter: fit, outliers, leans, churn. */
export function fingerprint(voterId: string, season: number): Fingerprint | null {
  const v = voterById.get(voterId);
  if (!v) return null;
  const fit = voterFit(voterId, season);
  const seasonBallots = ballots
    .filter((b) => b.voter === voterId && b.season === season)
    .sort((a, b) => a.week - b.week);
  let outliers = 0;
  for (const b of seasonBallots) {
    for (const r of compareBallot(b)) {
      if (r.consensusRank !== null && Math.abs(r.diff) >= 5) outliers++;
    }
  }
  const vol = volatility(voterId, season);
  return {
    voterId,
    name: v.name,
    outlet: v.outlet,
    fit: fit?.fit ?? null,
    ballots: seasonBallots.length,
    outliers,
    topLeans: biasArrows(voterId, season).slice(0, 3),
    volatility: vol,
  };
}

const volCache = new Map<string, number | null>();
/** Mean absolute rank movement per team between consecutive ballots (churn). */
export function volatility(voterId: string, season: number): number | null {
  const key = `${voterId}-${season}`;
  const hit = volCache.get(key);
  if (hit !== undefined) return hit;
  const bs = ballots
    .filter((b) => b.voter === voterId && b.season === season)
    .sort((a, b) => a.week - b.week);
  if (bs.length < 2) {
    volCache.set(key, null);
    return null;
  }
  let sum = 0;
  let n = 0;
  for (let i = 1; i < bs.length; i++) {
    const prev = new Map(bs[i - 1].rankings.map((t, idx) => [t, idx + 1]));
    for (const [t, idx] of bs[i].rankings.map((tt, j) => [tt, j + 1] as const)) {
      const p = prev.get(t) ?? NR;
      sum += Math.abs(idx - p);
      n++;
    }
  }
  const v = n ? sum / n : null;
  volCache.set(key, v);
  return v;
}

export interface HeatCell {
  voterId: string;
  conference: string;
  avgDiff: number;
  n: number;
}

/** Voter x conference matrix of average rank deltas. */
export function conferenceHeatmap(season: number): { cells: HeatCell[]; conferences: string[]; voterIds: string[] } {
  const cells: HeatCell[] = [];
  const confSet = new Set<string>();
  const voterIds = [...new Set(ballots.filter((b: Ballot) => b.season === season).map((b: Ballot) => b.voter))];
  for (const vid of voterIds) {
    for (const r of conferenceBias(vid, season)) {
      if (r.n < 15) continue;
      confSet.add(r.conference);
      cells.push({ voterId: vid, conference: r.conference, avgDiff: r.avgDiff, n: r.n });
    }
  }
  const conferences = [...confSet].sort();
  // order voters by their max absolute lean (most opinionated first)
  const maxLean = new Map<string, number>();
  for (const c of cells) {
    maxLean.set(c.voterId, Math.max(maxLean.get(c.voterId) ?? 0, Math.abs(c.avgDiff)));
  }
  voterIds.sort((a, b) => (maxLean.get(b) ?? 0) - (maxLean.get(a) ?? 0));
  return { cells, conferences, voterIds };
}

export interface DriftPoint {
  week: number;
  voterRank: number | null;
  consensusRank: number | null;
}

/** Week-by-week rank trajectory for one voter + team vs consensus. */
export function drift(voterId: string, teamId: string, season: number): DriftPoint[] {
  const weeks = seasonMeta(season).weeks.map((w) => w.week);
  return weeks.map((week) => {
    const b = ballots.find((x) => x.voter === voterId && x.season === season && x.week === week);
    const cons = consensusRankMap(season, week);
    if (!b) return { week, voterRank: null, consensusRank: cons.get(teamId) ?? null };
    const idx = b.rankings.indexOf(teamId);
    return { week, voterRank: idx >= 0 ? idx + 1 : null, consensusRank: cons.get(teamId) ?? null };
  });
}

export interface WildBallot {
  voterId: string;
  voterName: string;
  outlet: string;
  season: number;
  week: number;
  outlierCount: number;
  maxDiff: number;
  wildestTeam: string;
  wildestTeamName: string;
  wildestDiff: number;
}

/** Ballots ranked by outlier count — the wildest ones of a season. */
export function wildestBallots(season: number, limit = 12): WildBallot[] {
  const rows: WildBallot[] = [];
  for (const b of ballots.filter((x: Ballot) => x.season === season)) {
    let outliers = 0;
    let maxDiff = 0;
    let wildestTeam = "";
    let wildestDiff = 0;
    for (const r of compareBallot(b)) {
      if (r.consensusRank === null) continue;
      const ad = Math.abs(r.diff);
      if (ad >= 5) outliers++;
      if (ad > maxDiff) {
        maxDiff = ad;
        wildestTeam = r.team;
        wildestDiff = r.diff;
      }
    }
    if (outliers > 0) {
      const v = voterById.get(b.voter);
      rows.push({
        voterId: b.voter,
        voterName: v?.name ?? b.voter,
        outlet: v?.outlet ?? "",
        season: b.season,
        week: b.week,
        outlierCount: outliers,
        maxDiff,
        wildestTeam,
        wildestTeamName: teamById.get(wildestTeam)?.name ?? wildestTeam,
        wildestDiff,
      });
    }
  }
  return rows.sort((a, b) => b.outlierCount - a.outlierCount || b.maxDiff - a.maxDiff).slice(0, limit);
}

export interface HomerRow {
  voterId: string;
  voterName: string;
  outlet: string;
  team: string;
  teamName: string;
  conference: string;
  avgDiff: number;
  weeks: number;
}

/** Biggest per-team systematic leans: voter always ranks team X high/low. */
export function homers(season: number, limit = 15): HomerRow[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const b of ballots.filter((x: Ballot) => x.season === season)) {
    for (const r of compareBallot(b)) {
      if (r.consensusRank === null) continue;
      const key = `${b.voter}|${r.team}`;
      const e = acc.get(key) ?? { sum: 0, n: 0 };
      e.sum += r.diff;
      e.n++;
      acc.set(key, e);
    }
  }
  const rows: HomerRow[] = [];
  for (const [key, e] of acc) {
    if (e.n < 6) continue;
    const avg = e.sum / e.n;
    if (Math.abs(avg) < 2.5) continue;
    const [voterId, team] = key.split("|");
    const v = voterById.get(voterId);
    rows.push({
      voterId,
      voterName: v?.name ?? voterId,
      outlet: v?.outlet ?? "",
      team,
      teamName: teamById.get(team)?.name ?? team,
      conference: conferenceOf(team, season),
      avgDiff: avg,
      weeks: e.n,
    });
  }
  return rows.sort((a, b) => Math.abs(b.avgDiff) - Math.abs(a.avgDiff)).slice(0, limit);
}

export interface CrownWeek {
  week: number;
  label: string;
  leaders: { voterName: string; team: string; teamName: string }[];
}

/** Who gave #1 votes to whom, week by week — the title race through voters' eyes. */
export function crownTimeline(season: number): CrownWeek[] {
  return seasonMeta(season).weeks.map((w) => {
    const leaders: CrownWeek["leaders"] = [];
    for (const b of weekBallots(season, w.week)) {
      const top = b.rankings[0];
      if (!top) continue;
      leaders.push({
        voterName: voterById.get(b.voter)?.name ?? b.voter,
        team: top,
        teamName: teamById.get(top)?.name ?? top,
      });
    }
    return { week: w.week, label: w.label, leaders };
  });
}

export interface VoterOption {
  id: string;
  name: string;
  outlet: string;
}

export function voterOptions(season: number): VoterOption[] {
  const ids = [...new Set(ballots.filter((b: Ballot) => b.season === season).map((b: Ballot) => b.voter))];
  return ids
    .map((id) => ({ id, name: voterById.get(id)?.name ?? id, outlet: voterById.get(id)?.outlet ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function teamOptions(season: number): { id: string; name: string }[] {
  const ids = new Set<string>();
  for (const b of ballots.filter((x: Ballot) => x.season === season)) {
    for (const t of (b.rankings as string[])) ids.add(t);
  }
  return [...ids]
    .map((id) => ({ id, name: teamById.get(id)?.name ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function topTeams(season: number, week: number, limit = 10): { id: string; name: string }[] {
  return consensusFor(season, week)
    .slice(0, limit)
    .map((r) => ({ id: r.team, name: teamById.get(r.team)?.name ?? r.team }));
}

/** Pretty team name helper for components. */
export function teamName(id: string): string {
  return teamById.get(id)?.name ?? id;
}

export function voterName(id: string): string {
  return voterById.get(id)?.name ?? id;
}
