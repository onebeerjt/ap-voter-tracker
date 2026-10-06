"use client";

import { useState } from "react";

export interface HistoryRow {
  rank: number;
  team: string;
  consensusRank: number | null;
  /** Team the consensus has at this rank. */
  consensusTeam: string | null;
  diff: number;
}
export interface HistoryWeek {
  key: string; // "2025-3"
  label: string; // "2025 Week 3"
  rows: HistoryRow[];
  /** Consensus teams the voter omitted. */
  omitted: { team: string; consensusRank: number }[];
}

const signed = (n: number) => (n === 0 ? "0" : n > 0 ? `+${n}` : `−${Math.abs(n)}`);

export function BallotHistory({ weeks }: { weeks: HistoryWeek[] }) {
  const [key, setKey] = useState(weeks[weeks.length - 1]?.key);
  const week = weeks.find((w) => w.key === key);
  if (!week) return <p className="muted">No ballots.</p>;
  return (
    <div>
      <div className="controls">
        <label>
          Ballot:{" "}
          <select value={key} onChange={(e) => setKey(e.target.value)}>
            {weeks.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="num">Rk</th>
              <th>Voter&apos;s pick</th>
              <th className="num">Consensus</th>
              <th className="num">Diff</th>
              <th>Consensus at this rank</th>
            </tr>
          </thead>
          <tbody>
            {week.rows.map((r) => (
              <tr key={r.rank}>
                <td className="num">{r.rank}</td>
                <td>{r.team}</td>
                <td className="num">{r.consensusRank ?? "NR"}</td>
                <td className={`num ${r.diff < 0 ? "pos" : r.diff > 0 ? "neg" : "muted"}`}>
                  <strong style={{ fontWeight: Math.abs(r.diff) >= 5 ? 700 : 400 }}>{signed(r.diff)}</strong>
                </td>
                <td className="muted">{r.consensusTeam}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {week.omitted.length > 0 && (
        <p className="note">
          Left off the ballot (in consensus top 25):{" "}
          {week.omitted.map((o) => `${o.team} (#${o.consensusRank})`).join(", ")}.
        </p>
      )}
      <p className="note">Diff = voter rank &minus; consensus rank; negative (green) = voter ranks the team higher. Bold = 5+ spots.</p>
    </div>
  );
}
