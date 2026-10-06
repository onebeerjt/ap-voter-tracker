import type { Metadata } from "next";
import { VoterTable, type VoterRow } from "@/components/VoterTable";
import { voterFit } from "@/lib/analysis";
import { ballots, seasons, voters } from "@/lib/data";

export const metadata: Metadata = { title: "Voters" };

export default function VotersPage() {
  const counts = new Map<string, number>();
  for (const b of ballots) counts.set(b.voter, (counts.get(b.voter) ?? 0) + 1);
  const years = seasons.map((s) => s.year);
  const rows: VoterRow[] = voters.map((v) => ({
    id: v.id,
    name: v.name,
    outlet: v.outlet,
    seasons: v.seasons,
    ballots: counts.get(v.id) ?? 0,
    fitAll: voterFit(v.id)?.fit ?? null,
    fitBySeason: Object.fromEntries(years.map((y) => [String(y), voterFit(v.id, y)?.fit ?? null])),
  }));
  return (
    <>
      <h1>Voters</h1>
      <p className="sub">{voters.length} AP poll voters across {years.join(" and ")}.</p>
      <VoterTable rows={rows} seasons={years} />
    </>
  );
}
