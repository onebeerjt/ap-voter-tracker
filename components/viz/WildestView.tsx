"use client";

import { useMemo } from "react";
import Link from "next/link";
import { wildestBallots } from "@/lib/viz";
import { weekLabel } from "@/lib/data";
import { StoryLead, LeanArrow } from "./ui";

/**
 * VIEW 6 — "The wildest ballots": the season's most rogue ballots, spotlighted.
 */
export default function WildestView({ season }: { season: number }) {
  const rows = useMemo(() => wildestBallots(season), [season]);
  const top = rows[0];

  return (
    <div>
      <StoryLead
        kicker="Deep dive · The rogues' gallery"
        title="The wildest ballots of the season"
        body={
          <>
            Ranked by how many picks landed 5+ spots from consensus. These are the ballots that made the group chat
            explode.{" "}
            {top && (
              <>
                The crown goes to <strong>{top.voterName}</strong> ({top.outlet}) in {weekLabel(season, top.week)}:{" "}
                <strong>{top.outlierCount}</strong> outlier picks, topped by ranking{" "}
                <strong>{top.wildestTeamName}</strong>{" "}
                <strong style={{ color: top.wildestDiff < 0 ? "var(--up)" : "var(--down)" }}>
                  {Math.abs(top.wildestDiff)} spots {top.wildestDiff < 0 ? "higher" : "lower"}
                </strong>{" "}
                than everyone else.
              </>
            )}
          </>
        }
      />
      <ol className="viz-list">
        {rows.map((r, i) => (
          <li key={`${r.voterId}-${r.week}`} className="viz-list-row">
            <div className="viz-list-rank">#{i + 1}</div>
            <div className="viz-list-main">
              <div>
                <Link href={`/voter/${r.voterId}?season=${season}`}>{r.voterName}</Link>{" "}
                <span className="muted">· {r.outlet} · {weekLabel(season, r.week)}</span>
              </div>
              <div className="viz-list-story">
                <LeanArrow diff={r.wildestDiff} /> {r.outlierCount} outlier picks — wildest: {r.wildestTeamName}{" "}
                <strong className={r.wildestDiff < 0 ? "pos" : "neg"}>
                  {Math.abs(r.wildestDiff)} spots {r.wildestDiff < 0 ? "high" : "low"}
                </strong>
              </div>
            </div>
            <div className="viz-list-num">{r.outlierCount}</div>
          </li>
        ))}
      </ol>
      {rows.length === 0 && <p className="note">No outlier ballots this season. Suspiciously well-behaved.</p>}
    </div>
  );
}
