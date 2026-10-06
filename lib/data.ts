import ballotsJson from "@/data/ballots.json";
import metaJson from "@/data/meta.json";
import teamsJson from "@/data/teams.json";
import votersJson from "@/data/voters.json";

export interface Voter {
  id: string;
  name: string;
  outlet: string;
  seasons: number[];
}
export interface Team {
  id: string;
  name: string;
  conference: string;
  conferenceBySeason?: Record<string, string>;
}
export interface Ballot {
  voter: string;
  season: number;
  week: number;
  /** Team ids, index 0 = rank 1. */
  rankings: string[];
}
export interface SeasonMeta {
  year: number;
  complete: boolean;
  weeks: { week: number; label: string }[];
}

export const voters = votersJson as Voter[];
export const teams = teamsJson as Team[];
export const ballots = ballotsJson as Ballot[];
export const meta = metaJson as { generatedAt: string; seasons: SeasonMeta[] };

export const seasons = meta.seasons;
export const voterById = new Map(voters.map((v) => [v.id, v]));
export const teamById = new Map(teams.map((t) => [t.id, t]));

export function seasonMeta(year: number): SeasonMeta {
  const s = seasons.find((s) => s.year === year);
  if (!s) throw new Error(`Unknown season ${year}`);
  return s;
}

export function weekLabel(season: number, week: number): string {
  return seasonMeta(season).weeks.find((w) => w.week === week)?.label ?? `Week ${week}`;
}

export function latestWeek(season: number): number {
  const w = seasonMeta(season).weeks;
  return w[w.length - 1].week;
}

export function conferenceOf(teamId: string, season: number): string {
  const t = teamById.get(teamId);
  if (!t) return "Other";
  return t.conferenceBySeason?.[String(season)] ?? t.conference;
}
