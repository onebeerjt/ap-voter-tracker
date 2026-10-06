import Link from "next/link";
import { MIN_BIAS_SAMPLE, biasLeaderboard } from "@/lib/analysis";
import { voterById } from "@/lib/data";
import { signed } from "@/lib/format";

export function BiasLeaderboard({ season }: { season: number }) {
  const rows = biasLeaderboard(season, 15);
  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Voter</th>
              <th>Conference</th>
              <th className="num">Avg vs consensus</th>
              <th className="num">n</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.voter}>
                <td>
                  <Link href={`/voter/${r.voter}`}>{voterById.get(r.voter)?.name ?? r.voter}</Link>
                </td>
                <td>{r.conference}</td>
                <td className={`num ${r.avgDiff < 0 ? "pos" : "neg"}`}>
                  {signed(r.avgDiff, 2)} {r.avgDiff < 0 ? "(higher)" : "(lower)"}
                </td>
                <td className="num muted">{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Strongest single-conference lean per voter, either direction. Negative = ranks the conference higher than
        consensus. Needs at least {MIN_BIAS_SAMPLE} (week, team) observations.
      </p>
    </div>
  );
}
