"use client";

import { useMemo, useState } from "react";
import { scatterFor, voterOptions } from "@/lib/viz";
import { latestWeek, seasonMeta, weekLabel } from "@/lib/data";
import { Picker, StoryLead } from "./ui";

const W = 620;
const H = 460;
const PAD = { l: 46, r: 16, t: 14, b: 40 };

/**
 * VIEW 1 — "You vs Everybody": voter rank vs consensus rank scatter.
 * Points on the diagonal agree with the pack; off-diagonal points are the story.
 */
export default function ScatterView({ season }: { season: number }) {
  const voters = useMemo(() => voterOptions(season), [season]);
  const weeks = seasonMeta(season).weeks;
  const [voter, setVoter] = useState(voters[0]?.id ?? "");
  const [week, setWeek] = useState(String(latestWeek(season)));

  const pts = useMemo(() => scatterFor(voter, season, Number(week)), [voter, season, week]);
  const name = voters.find((v) => v.id === voter)?.name ?? voter;

  const x = (cons: number | null) =>
    PAD.l + ((cons ?? 26) - 1) * ((W - PAD.l - PAD.r) / 25);
  const y = (vr: number | null) =>
    PAD.t + ((vr ?? 26) - 1) * ((H - PAD.t - PAD.b) / 25);

  const wild = useMemo(
    () => [...pts].filter((p) => Math.abs(p.diff) >= 5).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 3),
    [pts],
  );
  const agree = pts.filter((p) => Math.abs(p.diff) < 2).length;

  const grid = [1, 5, 10, 15, 20, 25];

  return (
    <div>
      <StoryLead
        kicker="Variation 1 · The scatter"
        title="You vs everybody"
        body={
          <>
            Every dot is a team on <strong>{name}&rsquo;s</strong> {weekLabel(season, Number(week))} ballot. The x-axis is
            where the <em>consensus</em> put them; the y-axis is where this voter put them. Dots on the diagonal line
            agree with the pack. The farther a dot strays, the louder the disagreement —{" "}
            <strong style={{ color: "var(--up)" }}>green above the line</strong> means the voter is higher on them,{" "}
            <strong style={{ color: "var(--down)" }}>red below</strong> means lower.{" "}
            {pts.length > 0 ? (
              <>
                This ballot agrees within 2 spots on {agree} of {pts.length} teams
                {wild.length > 0 && (
                  <>
                    {" "}— but look at <strong>{wild.map((w) => w.teamName).join(", ")}</strong>
                  </>
                )}
                .
              </>
            ) : (
              <>No ballot from this voter that week — pick another week.</>
            )}
          </>
        }
      />
      <div className="viz-controls">
        <Picker label="Voter" value={voter} onChange={setVoter} options={voters.map((v) => ({ value: v.id, label: `${v.name} · ${v.outlet}` }))} />
        <Picker label="Week" value={week} onChange={setWeek} options={weeks.map((w) => ({ value: String(w.week), label: w.label }))} />
      </div>
      <div className="viz-chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="viz-chart" role="img" aria-label="Voter rank versus consensus rank scatter">
          {grid.map((g) => (
            <g key={g}>
              <line x1={x(g)} y1={PAD.t} x2={x(g)} y2={H - PAD.b} stroke="var(--line)" strokeDasharray="3 3" />
              <line x1={PAD.l} y1={y(g)} x2={W - PAD.r} y2={y(g)} stroke="var(--line)" strokeDasharray="3 3" />
              <text x={x(g)} y={H - PAD.b + 16} textAnchor="middle" className="viz-tick">{g}</text>
              <text x={PAD.l - 8} y={y(g) + 4} textAnchor="end" className="viz-tick">{g}</text>
            </g>
          ))}
          {/* diagonal = agreement */}
          <line x1={x(1)} y1={y(1)} x2={x(26)} y2={y(26)} stroke="var(--muted)" strokeWidth={1.5} />
          <text x={W - PAD.r} y={PAD.t + 12} textAnchor="end" className="viz-anno">agrees with consensus →</text>
          {pts.map((p, pi) => {
            const big = Math.abs(p.diff) >= 5;
            const color = p.diff < -0.5 ? "var(--up)" : p.diff > 0.5 ? "var(--down)" : "var(--muted)";
            // Jitter NR pile-ups so stacked points stay visible.
            const jx = p.consensusRank === null ? ((pi * 37) % 11) - 5 : 0;
            const jy = p.voterRank === null ? ((pi * 53) % 11) - 5 : 0;
            const cx = x(p.consensusRank) + jx;
            const cy = y(p.voterRank) + jy;
            return (
              <g key={p.team}>
                <circle cx={cx} cy={cy} r={big ? 7 : 4.5} fill={color} opacity={big ? 0.95 : 0.55}>
                  <title>{`${p.teamName} — voter #${p.voterRank ?? "NR"}, consensus #${p.consensusRank ?? "NR"}`}</title>
                </circle>
                {big && (
                  <text x={cx + 10} y={cy - 8} className="viz-label" fill={color}>
                    {p.teamName} ({p.diff > 0 ? "+" : ""}{p.diff})
                  </text>
                )}
              </g>
            );
          })}
          <text x={(W - PAD.l - PAD.r) / 2 + PAD.l} y={H - 6} textAnchor="middle" className="viz-axis">consensus rank →</text>
          <text x={12} y={(H - PAD.t - PAD.b) / 2 + PAD.t} textAnchor="middle" className="viz-axis" transform={`rotate(-90 12 ${(H - PAD.t - PAD.b) / 2 + PAD.t})`}>
            voter rank →
          </text>
        </svg>
      </div>
      <p className="note">NR (not ranked) counts as 26 on both axes. Hover any dot for the exact ranks.</p>
    </div>
  );
}
