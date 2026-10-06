import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BallotHistory, type HistoryWeek } from "@/components/BallotHistory";
import { OUTLIER_THRESHOLD, compareBallot, conferenceBias, consensusFor, voterFit, voterOutlierPicks } from "@/lib/analysis";
import { ballots, voterById, voters, weekLabel } from "@/lib/data";
import { rankOrNR, signed, teamName } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return voters.map((v) => ({ id: v.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: voterById.get(id)?.name ?? "Voter" };
}

export default async function VoterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const voter = voterById.get(id);
  if (!voter) notFound();

  const history: HistoryWeek[] = ballots
    .filter((b) => b.voter === id)
    .sort((a, b) => a.season - b.season || a.week - b.week)
    .map((b) => {
      const cons = consensusFor(b.season, b.week);
      const rows = compareBallot(b);
      return {
        key: `${b.season}-${b.week}`,
        label: `${b.season} ${weekLabel(b.season, b.week)}`,
        rows: rows
          .filter((r) => r.voterRank !== null)
          .map((r) => ({
            rank: r.voterRank!,
            team: teamName(r.team),
            consensusRank: r.consensusRank,
            consensusTeam: cons[r.voterRank! - 1] ? teamName(cons[r.voterRank! - 1].team) : null,
            diff: r.diff,
          })),
        omitted: rows
          .filter((r) => r.voterRank === null)
          .map((r) => ({ team: teamName(r.team), consensusRank: r.consensusRank! })),
      };
    });

  const picks = voterOutlierPicks(id, 15);
  const overall = voterFit(id);

  return (
    <>
      <p className="note" style={{ margin: 0 }}>
        <Link href="/voters">&larr; All voters</Link>
      </p>
      <h1>{voter.name}</h1>
      <p className="sub">
        {voter.outlet || "Outlet unknown"} &middot; seasons: {voter.seasons.join(", ")}
        {overall && (
          <>
            {" "}
            &middot; consensus fit {overall.fit.toFixed(1)} over {overall.ballots} ballots
          </>
        )}
      </p>

      <h2>Conference bias</h2>
      {voter.seasons.map((season) => {
        const rows = conferenceBias(id, season);
        const fit = voterFit(id, season);
        return (
          <div key={season} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, margin: "12px 0 6px" }}>
              {season}
              {fit && <span className="muted" style={{ fontWeight: 400 }}> &middot; fit {fit.fit.toFixed(1)}</span>}
            </h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Conference</th>
                    <th className="num">Avg vs consensus</th>
                    <th className="bar-cell">&larr; higher than consensus &nbsp;|&nbsp; lower &rarr;</th>
                    <th className="num">n</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.conference}>
                      <td>{r.conference}</td>
                      <td className={`num ${r.avgDiff < 0 ? "pos" : r.avgDiff > 0 ? "neg" : ""}`}>{signed(r.avgDiff, 2)}</td>
                      <td className="bar-cell">
                        <div className="bar" aria-hidden="true">
                          <i
                            className={r.avgDiff < 0 ? "higher" : "lower"}
                            style={{ width: `${Math.min(50, (Math.abs(r.avgDiff) / 6) * 50)}%` }}
                          />
                        </div>
                      </td>
                      <td className="num muted">
                        {r.n} <span title="distinct teams">({r.teams} teams)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <p className="note">
        Average of (voter rank &minus; consensus rank) over teams in each week&apos;s consensus top 25. Negative = ranks the
        conference higher than consensus. Bars are scaled to &plusmn;6 spots.
      </p>

      <h2>Biggest outlier picks</h2>
      {picks.length === 0 ? (
        <p className="muted">No picks {OUTLIER_THRESHOLD}+ spots from consensus.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Team</th>
                <th className="num">Voter</th>
                <th className="num">Consensus</th>
                <th className="num">Diff</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((p, i) => (
                <tr key={i}>
                  <td>
                    <Link href={`/week/${p.season}/${p.week}`}>
                      {p.season} {weekLabel(p.season, p.week)}
                    </Link>
                  </td>
                  <td>{teamName(p.team)}</td>
                  <td className="num">{rankOrNR(p.voterRank)}</td>
                  <td className="num">{rankOrNR(p.consensusRank)}</td>
                  <td className={`num ${p.diff < 0 ? "pos" : "neg"}`}>{signed(p.diff)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="note">NR = not ranked (left off the ballot, or not in the consensus top 25); counted as 26.</p>

      <h2>Ballot history</h2>
      <BallotHistory weeks={history} />
    </>
  );
}
