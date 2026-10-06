/**
 * Ingest AP Top 25 per-voter ballots into static JSON under data/.
 *
 *   node scripts/ingest.ts            # Node 24+ runs TypeScript directly
 *   node scripts/ingest.ts --offline  # rebuild from the local cache only
 *
 * Source: the ballots published by collegepolltracker.com (AP poll data
 * credited to The Associated Press). The collegepolltracker.com per-voter
 * pages (/football/pollster/<slug>/<year>/<week>) are HTML, not JSON, so this
 * script reads the same data as static JSON from the Iron app mirror
 * (ironfootball.app/data/ap-polls/*):
 *   - 2025: voter-history/<slug>.json (all weeks for one voter, with team slugs)
 *   - 2026: <year>-<week>.json (all voters for one week, with AP uuids)
 *
 * Requests are sequential with a delay, and every response is cached on disk
 * (.cache/ingest, git-ignored) with its ETag so re-runs use conditional GETs.
 * Failures are logged and skipped; partial data is fine.
 *
 * The weekly consensus is NOT read from the source. It is computed from the
 * ballots by Borda count in lib/analysis.ts.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://ironfootball.app/data/ap-polls";
const USER_AGENT = "ap-voter-tracker/0.1 (static research project; sequential, cached requests)";
const DELAY_MS = 500;
const OFFLINE = process.argv.includes("--offline");
const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_DIR = path.join(ROOT, ".cache", "ingest");
const OUT_DIR = path.join(ROOT, "data");

// ---------- fetch with polite delay + ETag cache ----------

let lastRequestAt = 0;
const stats = { network: 0, notModified: 0, offlineHits: 0, failed: [] as string[] };

async function fetchJson<T>(url: string): Promise<T | null> {
  const key = createHash("sha1").update(url).digest("hex");
  const bodyFile = path.join(CACHE_DIR, `${key}.json`);
  const metaFile = path.join(CACHE_DIR, `${key}.meta.json`);
  let etag: string | undefined;
  let cached: string | undefined;
  try {
    cached = await readFile(bodyFile, "utf8");
    etag = (JSON.parse(await readFile(metaFile, "utf8")) as { etag?: string }).etag;
  } catch {
    // cache miss
  }
  if (OFFLINE) {
    if (cached) {
      stats.offlineHits++;
      return JSON.parse(cached) as T;
    }
    stats.failed.push(`${url} (not cached)`);
    return null;
  }

  const wait = lastRequestAt + DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(etag && cached ? { "If-None-Match": etag } : {}),
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status === 304 && cached) {
      stats.notModified++;
      return JSON.parse(cached) as T;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = JSON.parse(text) as T;
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(bodyFile, text);
    await writeFile(metaFile, JSON.stringify({ url, etag: res.headers.get("etag") ?? undefined }));
    stats.network++;
    return parsed;
  } catch (err) {
    console.warn(`  ! ${url}: ${(err as Error).message}`);
    if (cached) {
      console.warn("    using stale cache");
      return JSON.parse(cached) as T;
    }
    stats.failed.push(url);
    return null;
  }
}

// ---------- normalization ----------

const strip = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ");

/** "Miami (FL)" -> "miami-fl", "Texas A&M" -> "texas-a-and-m". Used as the team id. */
const teamKey = (name: string) => strip(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** "Jamal St. Cyr" -> "jamal-st-cyr". Used as the voter id across seasons. */
const voterKey = (name: string) => strip(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const CONFERENCE_NAMES: Record<string, string> = {
  Southeastern: "SEC",
  "Atlantic Coast": "ACC",
  "Big Ten": "Big Ten",
  "Big 12": "Big 12",
  "Pac-12": "Pac-12",
  "FBS Independents": "Independent",
  "IA Independents": "Independent", // older 2026 weeks use this label
  "American Athletic": "American",
  "Mountain West": "Mountain West",
  "Sun Belt": "Sun Belt",
  "Conference USA": "Conference USA",
  "Mid-American": "MAC",
};
const conf = (raw: string) => CONFERENCE_NAMES[raw] ?? raw;

/**
 * Fallback conferences (by team key) for teams missing from the 2026 ballots:
 * Power 4 + major independents + the usual Group of 5 poll visitors.
 */
const FALLBACK_CONFERENCE: Record<string, string> = {};
const addConf = (c: string, names: string[]) => names.forEach((n) => (FALLBACK_CONFERENCE[teamKey(n)] = c));
addConf("SEC", ["Alabama", "Arkansas", "Auburn", "Florida", "Georgia", "Kentucky", "LSU", "Mississippi State", "Missouri", "Ole Miss", "Oklahoma", "South Carolina", "Tennessee", "Texas", "Texas A&M", "Vanderbilt"]);
addConf("Big Ten", ["Illinois", "Indiana", "Iowa", "Maryland", "Michigan", "Michigan State", "Minnesota", "Nebraska", "Northwestern", "Ohio State", "Oregon", "Penn State", "Purdue", "Rutgers", "UCLA", "USC", "Washington", "Wisconsin"]);
addConf("Big 12", ["Arizona", "Arizona State", "Baylor", "BYU", "Cincinnati", "Colorado", "Houston", "Iowa State", "Kansas", "Kansas State", "Oklahoma State", "TCU", "Texas Tech", "UCF", "Utah", "West Virginia"]);
addConf("ACC", ["Boston College", "California", "Clemson", "Duke", "Florida State", "Georgia Tech", "Louisville", "Miami (FL)", "NC State", "North Carolina", "Pittsburgh", "SMU", "Stanford", "Syracuse", "Virginia", "Virginia Tech", "Wake Forest"]);
addConf("Independent", ["Notre Dame", "UConn", "Connecticut", "Army", "Liberty"]);
addConf("American", ["Memphis", "Navy", "Tulane", "South Florida", "North Texas", "East Carolina", "Tulsa", "UTSA", "Rice", "Charlotte", "Temple", "Florida Atlantic", "UAB"]);
addConf("Mountain West", ["Boise State", "San Diego State", "Fresno State", "Air Force", "Colorado State", "Wyoming", "UNLV", "Utah State", "Nevada", "New Mexico", "Hawaii", "Hawai'i", "San Jose State"]);
addConf("Sun Belt", ["James Madison", "Louisiana", "Troy", "South Alabama", "Texas State", "Appalachian State", "Coastal Carolina", "Georgia Southern", "Arkansas State", "Marshall", "Old Dominion", "Georgia State", "Southern Miss", "Louisiana-Monroe"]);
addConf("Conference USA", ["Jacksonville State", "Liberty", "Western Kentucky", "Louisiana Tech", "Middle Tennessee", "New Mexico State", "Sam Houston", "UTEP", "Florida International", "Kennesaw State", "Delaware"]);
addConf("MAC", ["Toledo", "Miami (OH)", "Ohio", "Northern Illinois", "Western Michigan", "Bowling Green", "Buffalo", "Kent State", "Ball State", "Akron", "Central Michigan", "Eastern Michigan", "Massachusetts"]);

/**
 * Teams whose 2025 conference differs from their 2026 conference (2026 values
 * come from the 2026 ballots, which would otherwise be applied to 2025).
 */
const CONFERENCE_2025: Record<string, string> = {
  [teamKey("Boise State")]: "Mountain West",
  [teamKey("Colorado State")]: "Mountain West",
  [teamKey("Fresno State")]: "Mountain West",
  [teamKey("San Diego State")]: "Mountain West",
  [teamKey("Utah State")]: "Mountain West",
  [teamKey("Texas State")]: "Sun Belt",
  [teamKey("North Dakota State")]: "Missouri Valley (FCS)",
};

// ---------- source shapes ----------

interface VoterIndex {
  voters: { name: string; slug: string; outlets: string[]; years: number[] }[];
}
interface VoterHistory {
  name: string;
  slug: string;
  outlets: string[];
  seasons: { year: number; ballots: { week: string; rankings: { name: string; slug: string; rank: number }[] }[] }[];
}
interface PollIndex {
  polls: { year: number; week: string; file: string }[];
}
interface WeekFile {
  year: number;
  week: string;
  voters: {
    voter: { id: string; name: string; outlet: string };
    rankings: { rank: number; team_id: string; team_name: string; team_conference: string }[];
  }[];
}

// ---------- output shapes ----------

interface Team {
  id: string;
  name: string;
  conference: string;
  /** Only when a team's conference differs between seasons. */
  conferenceBySeason?: Record<string, string>;
}
interface Ballot {
  voter: string;
  season: number;
  week: number;
  rankings: string[]; // team ids, index 0 = rank 1
}

/** Week labels from the source -> numeric week (0 = preseason, 17 = 2025 final). */
function parseWeek(label: string): { week: number; label: string } | null {
  const l = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (l === "pre-season" || l === "preseason") return { week: 0, label: "Preseason" };
  if (l === "final-rankings" || l === "final") return { week: -1, label: "Final" };
  const m = l.match(/^week-(\d+)$/);
  return m ? { week: Number(m[1]), label: `Week ${m[1]}` } : null;
}

async function main() {
  console.log(`Ingest ${OFFLINE ? "(offline, cache only)" : "(network + ETag cache)"}`);
  const voterIndex = await fetchJson<VoterIndex>(`${BASE}/voter-history/index.json`);
  const pollIndex = await fetchJson<PollIndex>(`${BASE}/index.json`);
  if (!voterIndex || !pollIndex) throw new Error("Could not load voter index or poll index; aborting.");

  const teams = new Map<string, Team>();
  const teamConf2026 = new Map<string, string>();
  const voters = new Map<string, { id: string; name: string; outlet: string; seasons: Set<number> }>();
  const ballots: Ballot[] = [];
  const weekLabels = new Map<number, Map<number, string>>(); // season -> week -> label

  const touchVoter = (name: string, outlet: string, season: number) => {
    const id = voterKey(name);
    const v = voters.get(id) ?? { id, name, outlet, seasons: new Set<number>() };
    v.seasons.add(season);
    // later seasons win for the displayed outlet (processed in season order)
    if (outlet) v.outlet = outlet;
    voters.set(id, v);
    return id;
  };
  const touchTeam = (name: string) => {
    const id = teamKey(name);
    if (!teams.has(id)) teams.set(id, { id, name, conference: "" });
    return id;
  };
  const noteWeek = (season: number, week: number, label: string) => {
    if (!weekLabels.has(season)) weekLabels.set(season, new Map());
    weekLabels.get(season)!.set(week, label);
  };

  // ----- 2025: per-voter history -----
  const voters2025 = voterIndex.voters.filter((v) => v.years.includes(2025));
  console.log(`2025: ${voters2025.length} voters`);
  for (const [i, v] of voters2025.entries()) {
    process.stdout.write(`  [${i + 1}/${voters2025.length}] ${v.name}\r`);
    const hist = await fetchJson<VoterHistory>(`${BASE}/voter-history/${v.slug}.json`);
    const season = hist?.seasons.find((s) => s.year === 2025);
    if (!hist || !season) {
      stats.failed.push(`2025 ballots for ${v.name}`);
      continue;
    }
    const id = touchVoter(hist.name, hist.outlets[0] ?? "", 2025);
    // Final poll is numbered after the last regular week.
    const parsed = season.ballots.map((b) => ({ b, w: parseWeek(b.week) }));
    const maxRegular = Math.max(0, ...parsed.map((p) => (p.w && p.w.week > 0 ? p.w.week : 0)));
    for (const { b, w } of parsed) {
      if (!w) {
        console.warn(`\n  ! ${v.name}: unrecognised week "${b.week}"`);
        continue;
      }
      const week = w.week === -1 ? maxRegular + 1 : w.week;
      noteWeek(2025, week, w.label);
      const ranked = [...b.rankings].sort((a, c) => a.rank - c.rank);
      ballots.push({ voter: id, season: 2025, week, rankings: ranked.map((r) => touchTeam(r.name)) });
    }
  }
  console.log();

  // ----- 2026: per-week files -----
  // Oldest first, so the latest week's conference label wins for each team.
  const polls2026 = pollIndex.polls
    .filter((p) => p.year === 2026)
    .sort((a, b) => (parseWeek(a.week)?.week ?? 0) - (parseWeek(b.week)?.week ?? 0));
  for (const poll of polls2026) {
    const w = parseWeek(poll.week);
    if (!w) {
      console.warn(`  ! unrecognised 2026 week "${poll.week}"`);
      continue;
    }
    console.log(`2026 ${w.label}`);
    const data = await fetchJson<WeekFile>(`${BASE}/${poll.file}`);
    if (!data) continue;
    noteWeek(2026, w.week, w.label);
    for (const v of data.voters) {
      const id = touchVoter(v.voter.name, v.voter.outlet, 2026);
      const ranked = [...v.rankings].sort((a, c) => a.rank - c.rank);
      for (const r of ranked) {
        const tid = touchTeam(r.team_name);
        teamConf2026.set(tid, conf(r.team_conference));
      }
      ballots.push({ voter: id, season: 2026, week: w.week, rankings: ranked.map((r) => teamKey(r.team_name)) });
    }
  }

  // ----- conferences -----
  const unmapped: string[] = [];
  for (const team of teams.values()) {
    const c2026 = teamConf2026.get(team.id) ?? FALLBACK_CONFERENCE[team.id];
    team.conference = c2026 ?? "Other";
    if (!c2026) unmapped.push(team.name);
    const c2025 = CONFERENCE_2025[team.id];
    if (c2025 && c2025 !== team.conference) team.conferenceBySeason = { "2025": c2025 };
  }

  // ----- write -----
  const sortedBallots = ballots.sort(
    (a, b) => a.season - b.season || a.week - b.week || a.voter.localeCompare(b.voter),
  );
  const votersOut = [...voters.values()]
    .map((v) => ({ id: v.id, name: v.name, outlet: v.outlet, seasons: [...v.seasons].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const teamsOut = [...teams.values()].sort((a, b) => a.name.localeCompare(b.name));
  const meta = {
    generatedAt: new Date().toISOString(),
    seasons: [...weekLabels.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, weeks]) => ({
        year,
        complete: year === 2025,
        weeks: [...weeks.entries()].sort(([a], [b]) => a - b).map(([week, label]) => ({ week, label })),
      })),
  };
  await mkdir(OUT_DIR, { recursive: true });
  const write = (f: string, d: unknown) => writeFile(path.join(OUT_DIR, f), JSON.stringify(d) + "\n");
  await write("voters.json", votersOut);
  await write("ballots.json", sortedBallots);
  await write("teams.json", teamsOut);
  await write("meta.json", meta);

  // ----- report -----
  console.log("\nDone.");
  console.log(`  voters: ${votersOut.length}, ballots: ${sortedBallots.length}, teams: ${teamsOut.length}`);
  for (const s of meta.seasons) {
    const n = sortedBallots.filter((b) => b.season === s.year);
    console.log(`  ${s.year}: ${s.weeks.length} weeks, ${new Set(n.map((b) => b.voter)).size} voters, ${n.length} ballots`);
  }
  console.log(`  requests: ${stats.network} fetched, ${stats.notModified} not modified, ${stats.offlineHits} offline cache hits`);
  if (unmapped.length) console.warn(`  teams with no conference (set to "Other"): ${unmapped.join(", ")}`);
  if (stats.failed.length) console.warn(`  failures (${stats.failed.length}):\n    ${stats.failed.join("\n    ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
