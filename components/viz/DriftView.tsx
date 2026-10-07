"use client";

import { useMemo, useState } from "react";
import { drift, teamName, teamOptions, voterName, voterOptions } from "@/lib/viz";
import { seasonMeta, weekLabel } from "@/lib/data";
import { Picker, StoryLead } from "./ui";

const W = 640;
const H = 380;
const PAD = { l: 44, r: 14, t: 14, b: 36 };

/**
 * VIEW 5 — "The drift": week-by-week rank lines for a voter vs consensus on one team.
 * Bandwagon jumps and stubborn holds, drawn as a race.
 */
export default function DriftView({ season }: { season: number }) {
  const voters = useMemo(() => voterOptions(season), [season]);
  const teams = useMemo(() => teamOptions(season), [season]);
  const weeks = seasonMeta(season).weeks.map((w) => w.week);
  const [voter, setVoter] = useState(voters[0]?.id ?? "");
  const [team, setTeam] = useState(teams[0]?.id ?? "");

  const pts = useMemo(() => drift(voter, team, season), [voter, team, season]);
  const vn = voterName(voter);
  const tn = teamName(team);

  const x = (i: number) => PAD.l + (i / Math.max(1, weeks.length - 1)) * (W - PAD.l - PAD.r);
  const y = (r: number | null) => (r === null ? NaN : PAD.t + ((r - 1) / 25) * (H - PAD.t - PAD.b));

  const line = (get: (p: (typeof pts)[number]) => number | null) => {
    // Build separate subpaths so gaps (nulls) actually break the line.
    const parts: string[] = [];
    let cur: string[] = [];
    pts.forEach((p, i) => {
      const v = get(p);
      if (v === null || Number.isNaN(y(v))) {
        if (cur.length) parts.push(cur.join(" "));
        cur = [];
      } else {
        cur.push(`${cur.length === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      }
    });
    if (cur.length) parts.push(cur.join(" "));
    return parts.join(" ");
  };

  const gaps = pts.filter((p) => p.voterRank !== null && p.consensusRank !== null && Math.abs(p.voterRank - p.consensusRank) >= 5);
  const maxGap = gaps.length ? Math.max(...gaps.map((p) => Math.abs((p.voterRank ?? 0) - (p.consensusRank ?? 0)))) : 0;

  return (
    <div>
      <StoryLead
        kicker="Variation 5 · The drift"
        title="When did they jump on — or off?"
        body={
          <>
            Two lines race across the season for <strong>{tn}</strong>: <strong style={{ color: "var(--accent)" }}>blue</strong> is{" "}
            <strong>{vn}</strong>, <strong style={{ color: "var(--muted)" }}>gray</strong> is the consensus. When blue
            rides above gray, the voter is higher on them; below, lower. Watch for the moments the lines split — that&apos;s
            a voter going their own way.{" "}
            {maxGap >= 5 && (
              <>
                The biggest split: <strong>{maxGap} spots</strong> in {gaps.map((g) => weekLabel(season, g.week)).join(", ")}.
              </>
            )}
          </>
        }
      />
      <div className="viz-controls">
        <Picker label="Voter" value={voter} onChange={setVoter} options={voters.map((v) => ({ value: v.id, label: `${v.name} · ${v.outlet}` }))} />
        <Picker label="Team" value={team} onChange={setTeam} options={teams.map((t) => ({ value: t.id, label: t.name }))} />
      </div>
      <div className="viz-chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="viz-chart" role="img" aria-label="Weekly rank drift chart">
          {[1, 5, 10, 15, 20, 25].map((g) => (
            <g key={g}>
              <line x1={PAD.l} y1={y(g)} x2={W - PAD.r} y2={y(g)} stroke="var(--line)" strokeDasharray="3 3" />
              <text x={PAD.l - 8} y={y(g) + 4} textAnchor="end" className="viz-tick">#{g}</text>
            </g>
          ))}
          {weeks.map((w, i) => (
            <text key={w} x={x(i)} y={H - 12} textAnchor="middle" className="viz-tick">
              {weekLabel(season, w).replace("Week ", "W")}
            </text>
          ))}
          <path d={line((p) => p.consensusRank)} fill="none" stroke="var(--muted)" strokeWidth={2} strokeDasharray="6 3" />
          <path d={line((p) => p.voterRank)} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
          {pts.map((p, i) =>
            p.voterRank !== null ? (
              <circle key={i} cx={x(i)} cy={y(p.voterRank)} r={3.5} fill="var(--accent)">
                <title>{`${weekLabel(season, p.week)}: voter #${p.voterRank}, consensus #${p.consensusRank ?? "NR"}`}</title>
              </circle>
            ) : null,
          )}
        </svg>
      </div>
      <p className="note">
        <span style={{ color: "var(--accent)" }}>● {vn}</span> · <span className="muted">- - consensus</span> · gaps in
        the blue line = weeks with no ballot or team unranked.
      </p>
    </div>
  );
}
