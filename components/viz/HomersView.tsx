"use client";

import { useMemo } from "react";
import Link from "next/link";
import { homers } from "@/lib/viz";
import { StoryLead, BigArrow, DivergeBar, fmtDiff } from "./ui";

/**
 * VIEW 8 — "The homers": narrative cards for the biggest systematic team leans.
 * "This voter ranks THIS team X spots high, every single week."
 */
export default function HomersView({ season }: { season: number }) {
  const rows = useMemo(() => homers(season), [season]);
  const top = rows[0];

  return (
    <div>
      <StoryLead
        kicker="Variation 8 · The homers"
        title="Love is a +6.2"
        body={
          <>
            Not conferences — <em>teams</em>. These are the voters who simply will not quit a team, week after week,
            ranking them far above (or below) where everyone else has them.{" "}
            {top && (
              <>
                Exhibit A: <strong>{top.voterName}</strong> ({top.outlet}) has{" "}
                <strong>{top.teamName}</strong>{" "}
                <strong className={top.avgDiff < 0 ? "pos" : "neg"}>
                  {Math.abs(top.avgDiff).toFixed(1)} spots {top.avgDiff < 0 ? "higher" : "lower"}
                </strong>{" "}
                than consensus, averaged across <strong>{top.weeks}</strong> weeks. That&apos;s not a take, that&apos;s a
                lifestyle.
              </>
            )}
          </>
        }
      />
      <div className="viz-homers">
        {rows.map((r, i) => (
          <div key={`${r.voterId}-${r.team}`} className="viz-homer-card">
            <div className="viz-homer-top">
              <span className="viz-homer-rank">#{i + 1}</span>
              <BigArrow diff={r.avgDiff} />
            </div>
            <div className="viz-homer-story">
              <Link href={`/voter/${r.voterId}?season=${season}`}><strong>{r.voterName}</strong></Link>{" "}
              <span className="muted">({r.outlet})</span> ranks <strong>{r.teamName}</strong>{" "}
              <strong className={r.avgDiff < 0 ? "pos" : "neg"}>{fmtDiff(r.avgDiff)} spots</strong>{" "}
              {r.avgDiff < 0 ? "above" : "below"} consensus — every week, for {r.weeks} weeks running.
            </div>
            <DivergeBar value={r.avgDiff} max={8} />
            <div className="muted" style={{ fontSize: 12 }}>{r.conference}</div>
          </div>
        ))}
      </div>
      {rows.length === 0 && <p className="note">No team-level obsessions found this season.</p>}
    </div>
  );
}
