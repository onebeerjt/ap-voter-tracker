"use client";

import { useMemo, useState } from "react";
import { conferenceHeatmap, voterName } from "@/lib/viz";
import { StoryLead } from "./ui";

const CELL = 30;

/**
 * VIEW 4 — "The grid": every voter × every conference, color = lean.
 * The landscape of favoritism, all at once.
 */
export default function HeatmapView({ season }: { season: number }) {
  const { cells, conferences, voterIds } = useMemo(() => conferenceHeatmap(season), [season]);
  const [hover, setHover] = useState<string | null>(null);

  const cellMap = new Map(cells.map((c) => [`${c.voterId}|${c.conference}`, c]));
  const color = (d: number) => {
    // -6..+6 → green..red diverging
    const t = Math.max(-1, Math.min(1, d / 6));
    if (t < 0) return `rgba(26,127,55,${0.12 + -t * 0.75})`;
    if (t > 0) return `rgba(180,35,24,${0.12 + t * 0.75})`;
    return "var(--row)";
  };

  const hoverCell = hover ? cellMap.get(hover) : null;
  const W = conferences.length * CELL + 190;
  const H = voterIds.length * CELL + 40;

  const mostLopsided = useMemo(() => {
    const sorted = [...cells].sort((a, b) => Math.abs(b.avgDiff) - Math.abs(a.avgDiff));
    const top = sorted[0];
    return top ? { ...top, name: voterName(top.voterId) } : null;
  }, [cells]);

  return (
    <div>
      <StoryLead
        kicker="Variation 4 · The grid"
        title="The whole league's favoritism, one grid"
        body={
          <>
            Each row is a voter, each column a conference. <strong style={{ color: "var(--up)" }}>Green</strong> = they
            rank that conference higher than consensus; <strong style={{ color: "var(--down)" }}>red</strong> = lower.
            Voters are sorted with the most opinionated at the top.{" "}
            {mostLopsided && (
              <>
                The single most lopsided cell: <strong>{mostLopsided.name}</strong> on the{" "}
                <strong>{mostLopsided.conference}</strong> ({mostLopsided.avgDiff < 0 ? "+" : "−"}
                {Math.abs(mostLopsided.avgDiff).toFixed(1)} spots).
              </>
            )}{" "}
            Hover any cell for the numbers.
          </>
        }
      />
      <div className="viz-chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="viz-chart" style={{ maxWidth: 900 }} role="img" aria-label="Voter by conference bias heatmap">
          {conferences.map((c, i) => (
            <text key={c} x={190 + i * CELL + CELL / 2} y={24} textAnchor="middle" className="viz-tick" transform={`rotate(-28 ${190 + i * CELL + CELL / 2} 24)`}>
              {c}
            </text>
          ))}
          {voterIds.map((vid, r) => (
            <g key={vid}>
              <text x={182} y={40 + r * CELL + CELL / 2 + 4} textAnchor="end" className="viz-tick">
                {voterName(vid).length > 24 ? voterName(vid).slice(0, 23) + "…" : voterName(vid)}
              </text>
              {conferences.map((c, i) => {
                const cell = cellMap.get(`${vid}|${c}`);
                const key = `${vid}|${c}`;
                return (
                  <rect
                    key={key}
                    x={190 + i * CELL + 1}
                    y={40 + r * CELL + 1}
                    width={CELL - 2}
                    height={CELL - 2}
                    rx={3}
                    fill={cell ? color(cell.avgDiff) : "#f3f4f6"}
                    stroke={hover === key ? "var(--text)" : "none"}
                    strokeWidth={1.5}
                    onMouseEnter={() => setHover(key)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {cell && <title>{`${voterName(vid)} · ${c}: ${cell.avgDiff < 0 ? "+" : "−"}${Math.abs(cell.avgDiff).toFixed(1)} spots (${cell.n} obs)`}</title>}
                  </rect>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <p className="viz-hover-readout" aria-live="polite">
        {hoverCell
          ? `${voterName(hoverCell.voterId)} · ${hoverCell.conference}: ${hoverCell.avgDiff < 0 ? "+" : "−"}${Math.abs(hoverCell.avgDiff).toFixed(1)} spots across ${hoverCell.n} team-weeks`
          : "Hover a cell to read it."}
      </p>
    </div>
  );
}
