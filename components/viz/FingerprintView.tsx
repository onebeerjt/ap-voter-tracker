"use client";

import { useMemo, useState } from "react";
import { fingerprint, voterOptions } from "@/lib/viz";
import { Picker, StoryLead, Stat, LeanArrow, DivergeBar, fmtDiff } from "./ui";

/**
 * VIEW 3 — "Voter fingerprint": one card that profiles a voter at a glance.
 */
export default function FingerprintView({ season }: { season: number }) {
  const voters = useMemo(() => voterOptions(season), [season]);
  const [voter, setVoter] = useState(voters[0]?.id ?? "");
  const fp = useMemo(() => fingerprint(voter, season), [voter, season]);

  return (
    <div>
      <StoryLead
        kicker="Variation 3 · The fingerprint"
        title="Every voter has a fingerprint"
        body={
          <>
            Pick a voter and read their ballot DNA: how tightly they track the consensus, how often they go rogue, which
            conferences they pump up or hold down, and how much their ballot churns week to week.{" "}
            {fp && fp.fit !== null && (
              <>
                <strong>{fp.name}</strong> tracks the consensus at <strong>{fp.fit.toFixed(0)}%</strong> fit
                {fp.outliers > 0 && (
                  <>
                    {" "}— but has <strong>{fp.outliers}</strong> outlier picks (5+ spots off) this season
                  </>
                )}
                .
              </>
            )}
          </>
        }
      />
      <div className="viz-controls">
        <Picker label="Voter" value={voter} onChange={setVoter} options={voters.map((v) => ({ value: v.id, label: `${v.name} · ${v.outlet}` }))} />
      </div>
      {!fp ? (
        <p className="note">No data for this voter.</p>
      ) : (
        <div className="viz-card">
          <div className="viz-card-head">
            <div>
              <div className="viz-card-name">{fp.name}</div>
              <div className="muted">{fp.outlet}</div>
            </div>
          </div>
          <div className="viz-stats">
            <Stat label="consensus fit" value={fp.fit !== null ? `${fp.fit.toFixed(0)}%` : "—"} tone={fp.fit !== null && fp.fit >= 85 ? "up" : fp.fit !== null && fp.fit < 70 ? "down" : ""} />
            <Stat label="ballots" value={String(fp.ballots)} />
            <Stat label="outlier picks" value={String(fp.outliers)} tone={fp.outliers > 10 ? "down" : ""} />
            <Stat label="weekly churn" value={fp.volatility !== null ? fp.volatility.toFixed(1) : "—"} />
          </div>
          <h3 className="viz-h3">Strongest leans</h3>
          {fp.topLeans.length === 0 ? (
            <p className="note">No strong conference leans — a consensus voter.</p>
          ) : (
            fp.topLeans.map((a) => (
              <div key={a.conference} className="viz-arrow-row slim">
                <div className="viz-arrow-conf">
                  <LeanArrow diff={a.avgDiff} />
                  <strong>{a.conference}</strong>
                </div>
                <DivergeBar value={a.avgDiff} height={8} />
                <div className={`viz-arrow-num ${a.avgDiff < -0.5 ? "pos" : a.avgDiff > 0.5 ? "neg" : "muted"}`}>{fmtDiff(a.avgDiff)}</div>
              </div>
            ))
          )}
          <p className="note">
            Churn = average spots each team moves on this voter&apos;s ballot between consecutive weeks. Outlier = a
            pick 5+ spots from consensus.
          </p>
        </div>
      )}
    </div>
  );
}
