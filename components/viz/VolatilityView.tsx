"use client";

import { useMemo } from "react";
import Link from "next/link";
import { volatility, voterName, voterOptions } from "@/lib/viz";
import { StoryLead } from "./ui";

const W = 640;
const BH = 22;

/**
 * VIEW 9 — "The flip-floppers": who churns their ballot most week to week.
 */
export default function VolatilityView({ season }: { season: number }) {
  const rows = useMemo(() => {
    const vs = voterOptions(season);
    return vs
      .map((v) => ({ id: v.id, name: v.name, outlet: v.outlet, vol: volatility(v.id, season) }))
      .filter((r) => r.vol !== null)
      .sort((a, b) => (b.vol as number) - (a.vol as number)) as { id: string; name: string; outlet: string; vol: number }[];
  }, [season]);

  const top = rows[0];
  const calm = rows[rows.length - 1];
  const max = Math.max(...rows.map((r) => r.vol), 1);
  const H = rows.length * (BH + 6) + 30;

  return (
    <div>
      <StoryLead
        kicker="Deep dive · The flip-floppers"
        title="Steady hands and shaky ones"
        body={
          <>
            Churn = how many spots the average team moves on a voter&apos;s ballot from one week to the next. High churn
            means they&apos;re ripping it up and starting over every Sunday; low churn means set-it-and-forget-it.{" "}
            {top && calm && (
              <>
                <strong>{top.name}</strong> ({top.outlet}) churns <strong>{top.vol.toFixed(1)}</strong> spots a week —
                the most restless ballot in the poll. <strong>{calm.name}</strong> ({calm.outlet}) barely moves at{" "}
                <strong>{calm.vol.toFixed(1)}</strong>.
              </>
            )}
          </>
        }
      />
      <div className="viz-chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="viz-chart" role="img" aria-label="Voter volatility bar chart">
          {rows.map((r, i) => {
            const y = 30 + i * (BH + 6);
            const w = (r.vol / max) * (W - 260);
            const hot = i < 3;
            return (
              <g key={r.id}>
                <text x={250} y={y + 15} textAnchor="end" className="viz-tick">
                  {r.name.length > 26 ? r.name.slice(0, 25) + "…" : r.name}
                </text>
                <rect x={258} y={y} width={Math.max(2, w)} height={BH} rx={4} fill={hot ? "var(--down)" : "var(--accent)"} opacity={hot ? 0.85 : 0.65}>
                  <title>{`${r.name} (${r.outlet}): ${r.vol.toFixed(2)} spots/week churn`}</title>
                </rect>
                <text x={258 + Math.max(2, w) + 6} y={y + 15} className="viz-tick">{r.vol.toFixed(1)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="note">
        Click a name to see their voter page:{" "}
        {rows.slice(0, 3).map((r, i) => (
          <span key={r.id}>
            {i > 0 && " · "}<Link href={`/voter/${r.id}?season=${season}`}>{r.name}</Link>
          </span>
        ))}
      </p>
    </div>
  );
}
