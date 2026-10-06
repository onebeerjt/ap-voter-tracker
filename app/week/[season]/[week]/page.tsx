import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsensusTable, WeekLinks } from "@/components/ConsensusTable";
import { OUTLIER_THRESHOLD, outliersForWeek, weekBallots } from "@/lib/analysis";
import { seasons, voterById, weekLabel } from "@/lib/data";
import { rankOrNR, signed, teamName } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return seasons.flatMap((s) => s.weeks.map((w) => ({ season: String(s.year), week: String(w.week) })));
}

type Params = Promise<{ season: string; week: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { season, week } = await params;
  return { title: `${season} ${weekLabel(Number(season), Number(week))}` };
}

export default async function WeekPage({ params }: { params: Params }) {
  const { season: s, week: w } = await params;
  const season = Number(s);
  const week = Number(w);
  const meta = seasons.find((x) => x.year === season);
  if (!meta || !meta.weeks.some((x) => x.week === week)) notFound();

  const { outliers, voters } = outliersForWeek(season, week);
  const name = (id: string) => voterById.get(id)?.name ?? id;

  return (
    <>
      <h1>
        {season} {weekLabel(season, week)}
      </h1>
      <p className="sub">{weekBallots(season, week).length} ballots &middot; consensus by Borda count</p>
      <WeekLinks season={season} weeks={meta.weeks} current={week} />

      <h2>Consensus top 25</h2>
      <ConsensusTable season={season} week={week} />

      <h2>Biggest outliers</h2>
      <p className="note" style={{ margin: "0 0 8px" }}>
        Ballot positions {OUTLIER_THRESHOLD}+ spots from consensus, in either direction ({outliers.length} flagged
        in total, top 25 shown). NR = not ranked.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Voter</th>
              <th>Team</th>
              <th className="num">Voter rank</th>
              <th className="num">Consensus</th>
              <th className="num">Diff</th>
            </tr>
          </thead>
          <tbody>
            {outliers.slice(0, 25).map((o, i) => (
              <tr key={i}>
                <td>
                  <Link href={`/voter/${o.voter}`}>{name(o.voter)}</Link>
                </td>
                <td>{teamName(o.team)}</td>
                <td className="num">{rankOrNR(o.voterRank)}</td>
                <td className="num">{rankOrNR(o.consensusRank)}</td>
                <td className={`num ${o.diff < 0 ? "pos" : "neg"}`}>{signed(o.diff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Most deviant voters this week</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Voter</th>
              <th className="num">Total |diff|</th>
              <th className="num">Avg |diff|</th>
              <th className="num">Flagged picks</th>
            </tr>
          </thead>
          <tbody>
            {voters.slice(0, 15).map((v, i) => (
              <tr key={v.voter}>
                <td className="num">{i + 1}</td>
                <td>
                  <Link href={`/voter/${v.voter}`}>{name(v.voter)}</Link>
                </td>
                <td className="num">{v.totalAbsDiff}</td>
                <td className="num">{v.avgAbsDiff.toFixed(2)}</td>
                <td className="num">{v.outliers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Total |diff| sums the absolute rank difference over the 25 consensus teams (an omitted team counts as 26).</p>
    </>
  );
}
