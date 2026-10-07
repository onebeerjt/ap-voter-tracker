"use client";

import { useMemo, useState } from "react";
import { compareBallot, weekBallots } from "@/lib/analysis";
import { teamName, voterName, voterOptions } from "@/lib/viz";
import { latestWeek, seasonMeta } from "@/lib/data";
import { Picker, StoryLead } from "./ui";

/**
 * VIEW 7 — "Head to head": two voters, one ballot week, every disagreement lit up.
 */
export default function HeadToHeadView({ season }: { season: number }) {
  const voters = useMemo(() => voterOptions(season), [season]);
  const weeks = seasonMeta(season).weeks;
  const [a, setA] = useState(voters[0]?.id ?? "");
  const [b, setB] = useState(voters[1]?.id ?? voters[0]?.id ?? "");
  const [week, setWeek] = useState(String(latestWeek(season)));
  const pickA = (id: string) => {
    setA(id);
    if (b === id) {
      const other = voters.find((v) => v.id !== id);
      if (other) setB(other.id);
    }
  };

  const rows = useMemo(() => {
    const wb = weekBallots(season, Number(week));
    const ba = wb.find((x) => x.voter === a);
    const bb = wb.find((x) => x.voter === b);
    if (!ba || !bb) return null;
    const ra = new Map(compareBallot(ba).map((r) => [r.team, r.voterRank]));
    const rb = new Map(compareBallot(bb).map((r) => [r.team, r.voterRank]));
    const teams = [...new Set([...ra.keys(), ...rb.keys()])];
    return teams
      .map((t) => {
        const va = ra.get(t);
        const vb = rb.get(t);
        return { team: t, va: va ?? null, vb: vb ?? null, gap: Math.abs((va ?? 26) - (vb ?? 26)) };
      })
      .sort((x, y) => y.gap - x.gap);
  }, [a, b, season, week]);

  const bigGaps = rows?.filter((r) => r.gap >= 5) ?? [];
  const an = voterName(a);
  const bn = voterName(b);

  return (
    <div>
      <StoryLead
        kicker="Deep dive · Head to head"
        title="Two voters enter. One ballot leaves."
        body={
          <>
            Same week, two ballots, every team they disagree on — sorted by how far apart they are.{" "}
            {rows && a !== b && (
              <>
                <strong>{an}</strong> vs <strong>{bn}</strong>:{" "}
                {bigGaps.length === 0 ? (
                  <>they&apos;re basically in lockstep this week.</>
                ) : (
                  <>
                    <strong>{bigGaps.length}</strong> teams 5+ spots apart
                    {bigGaps[0] && (
                      <>
                        , led by <strong>{teamName(bigGaps[0].team)}</strong> ({bigGaps[0].gap} spots)
                      </>
                    )}
                    .
                  </>
                )}
              </>
            )}
          </>
        }
      />
      <div className="viz-controls">
        <Picker label="Voter A" value={a} onChange={pickA} options={voters.map((v) => ({ value: v.id, label: v.name }))} />
        <Picker label="Voter B" value={b} onChange={setB} options={voters.filter((v) => v.id !== a).map((v) => ({ value: v.id, label: v.name }))} />
        <Picker label="Week" value={week} onChange={setWeek} options={weeks.map((w) => ({ value: String(w.week), label: w.label }))} />
      </div>
      {!rows ? (
        <p className="note">One of these voters didn&apos;t file a ballot that week.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th className="num">{an}</th>
                <th className="num">{bn}</th>
                <th className="num">Gap</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map((r) => (
                <tr key={r.team} style={r.gap >= 5 ? { background: "#fff7ed" } : undefined}>
                  <td>{teamName(r.team)}</td>
                  <td className="num">{r.va ?? "NR"}</td>
                  <td className="num">{r.vb ?? "NR"}</td>
                  <td className={`num ${r.gap >= 5 ? "neg" : "muted"}`}>{r.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="note">Highlighted rows are 5+ spots apart. NR counts as 26.</p>
    </div>
  );
}
