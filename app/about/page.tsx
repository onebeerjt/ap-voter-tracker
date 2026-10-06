import type { Metadata } from "next";
import { meta } from "@/lib/data";

export const metadata: Metadata = { title: "About" };

export default function About() {
  return (
    <div className="prose">
      <h1>About &amp; methodology</h1>
      <p className="sub">How the numbers on this site are computed.</p>

      <h2>Data</h2>
      <p>
        Ballots are the Associated Press Top 25 college football poll, as published per voter by{" "}
        <a href="https://collegepolltracker.com">collegepolltracker.com</a> (formerly AP Poll Stalker). The poll
        itself is produced by <a href="https://apnews.com/hub/ap-top-25-college-football-poll">The Associated Press</a>,
        and all rights to it belong to the AP. This is an independent project and is not affiliated with or endorsed
        by the AP or collegepolltracker.com. Seasons covered: 2025 (complete) and 2026 (in progress). Data last
        refreshed {meta.generatedAt.slice(0, 10)}.
      </p>
      <p>
        Everything is static: <code>scripts/ingest.ts</code> fetches and caches the ballots into <code>data/</code>, and
        all analysis runs at build time.
      </p>

      <h2>Consensus (Borda count)</h2>
      <p>
        We do not use any precomputed consensus. For each week, a team gets 25 points for a #1 vote down to 1 point for
        a #25 vote, summed over all ballots. The 25 highest totals form the consensus top 25. Ties are broken by
        first-place votes, then by the number of ballots that ranked the team.
      </p>

      <h2>Conference bias</h2>
      <p>
        For each voter and season, and for each conference, we average <code>voter rank &minus; consensus rank</code>{" "}
        over every (week, team) pair where the team was in that week&apos;s consensus top 25. <strong>Negative</strong>{" "}
        means the voter ranks that conference&apos;s teams <strong>higher</strong> than consensus (propping it up);
        positive means lower. A consensus team missing from a voter&apos;s ballot counts as rank 26. The leaderboard
        shows each voter&apos;s strongest single-conference lean in either direction and requires at least 15
        observations. Conferences are as of each season (2025 realignment exceptions are handled for teams that moved);
        &quot;Independent&quot; (Notre Dame) is excluded from the leaderboard. A lean is a pattern, not proof of intent:
        a voter near a conference may simply watch its games more.
      </p>

      <h2>Outliers</h2>
      <p>
        A ballot position is flagged when it differs from consensus by 5 or more spots, in either direction. Teams the
        voter ranked but that missed the consensus top 25, and consensus teams the voter omitted, count as rank 26 (NR)
        for this purpose. Voters are ranked each week by their total absolute deviation across the 25 consensus teams.
      </p>

      <h2>Consensus fit</h2>
      <p>
        <code>100 &minus; 10 &times; (average absolute rank difference across consensus top-25 teams)</code>. 100 means
        the ballot matches consensus exactly; lower means more independent. This is a descriptive measure, not a quality
        judgement.
      </p>

      <h2>Known limitations</h2>
      <ul>
        <li>Voters are matched across seasons by normalized name, since the source uses different IDs each year.</li>
        <li>Conference membership for 2025 teams is mapped from 2026 data, with a hardcoded fallback for the rest.</li>
        <li>Some voters are missing individual weeks in the source; the consensus uses the ballots available.</li>
      </ul>
    </div>
  );
}
