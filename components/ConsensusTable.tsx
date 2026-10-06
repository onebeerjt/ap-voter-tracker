import Link from "next/link";
import { consensusFor, previousConsensusRanks } from "@/lib/analysis";
import { conferenceOf } from "@/lib/data";
import { teamName } from "@/lib/format";

export function ConsensusTable({ season, week }: { season: number; week: number }) {
  const rows = consensusFor(season, week);
  const prev = previousConsensusRanks(season, week);
  if (!rows.length) return <p className="muted">No ballots for this week.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="num">Rk</th>
            <th>Team</th>
            <th>Conf</th>
            <th className="num">Borda pts</th>
            <th className="num">1st</th>
            {prev && <th className="num">Prev</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = prev?.get(r.team);
            const move = p === undefined ? null : p - r.rank;
            return (
              <tr key={r.team}>
                <td className="num">{r.rank}</td>
                <td>{teamName(r.team)}</td>
                <td className="muted">{conferenceOf(r.team, season)}</td>
                <td className="num">{r.points}</td>
                <td className="num">{r.firstPlaceVotes || ""}</td>
                {prev && (
                  <td className="num">
                    {p === undefined ? (
                      <span className="tag">NEW</span>
                    ) : (
                      <span className={move! > 0 ? "pos" : move! < 0 ? "neg" : "muted"}>
                        {p}
                        {move ? ` (${move > 0 ? "▲" : "▼"}${Math.abs(move)})` : ""}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function WeekLinks({ season, weeks, current }: { season: number; weeks: { week: number; label: string }[]; current?: number }) {
  return (
    <div className="weeks">
      {weeks.map((w) =>
        w.week === current ? (
          <span key={w.week}>{w.label}</span>
        ) : (
          <Link key={w.week} href={`/week/${season}/${w.week}`}>
            {w.label}
          </Link>
        ),
      )}
    </div>
  );
}
