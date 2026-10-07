import Link from "next/link";
import { notFound } from "next/navigation";
import { seasons, latestWeek } from "@/lib/data";
import ScatterView from "@/components/viz/ScatterView";
import BiasArrowsView from "@/components/viz/BiasArrowsView";
import FingerprintView from "@/components/viz/FingerprintView";
import HeatmapView from "@/components/viz/HeatmapView";
import DriftView from "@/components/viz/DriftView";
import WildestView from "@/components/viz/WildestView";
import HeadToHeadView from "@/components/viz/HeadToHeadView";
import HomersView from "@/components/viz/HomersView";
import VolatilityView from "@/components/viz/VolatilityView";
import CrownView from "@/components/viz/CrownView";

const VIEWS: Record<string, { label: string; blurb: string }> = {
  scatter: { label: "You vs everybody", blurb: "Voter rank vs consensus, every team as a dot." },
  arrows: { label: "The arrows", blurb: "Conference leans with the story attached." },
  fingerprint: { label: "Fingerprint", blurb: "One voter's whole ballot DNA on a card." },
  heatmap: { label: "The grid", blurb: "Every voter × every conference, all at once." },
  drift: { label: "The drift", blurb: "Week-by-week rank races vs consensus." },
  wildest: { label: "Wildest ballots", blurb: "The season's most rogue ballots." },
  h2h: { label: "Head to head", blurb: "Two voters, one week, every disagreement." },
  homers: { label: "The homers", blurb: "Voters who will not quit a team." },
  volatility: { label: "Flip-floppers", blurb: "Who churns their ballot most." },
  crown: { label: "The crown", blurb: "#1 votes week by week." },
};

export default async function VizDeepDive({
  params,
  searchParams,
}: {
  params: Promise<{ view: string }>;
  searchParams: Promise<{ season?: string; voter?: string; week?: string }>;
}) {
  const { view } = await params;
  const sp = await searchParams;
  const meta = VIEWS[view];
  if (!meta) notFound();

  const years = seasons.map((s) => s.year);
  const season = sp.season && years.includes(Number(sp.season)) ? Number(sp.season) : Math.max(...years);
  const voter = sp.voter || undefined;
  const week = sp.week ? Number(sp.week) : undefined;

  return (
    <div className="viz-scope">
      <p className="feed-back">
        <Link href="/viz">← The Voter Report</Link>
      </p>
      <div className="viz-view" key={`${view}-${season}`}>
        {view === "scatter" && <ScatterView season={season} initialVoter={voter} initialWeek={week} />}
        {view === "arrows" && <BiasArrowsView season={season} />}
        {view === "fingerprint" && <FingerprintView season={season} initialVoter={voter} />}
        {view === "heatmap" && <HeatmapView season={season} />}
        {view === "drift" && <DriftView season={season} />}
        {view === "wildest" && <WildestView season={season} />}
        {view === "h2h" && <HeadToHeadView season={season} />}
        {view === "homers" && <HomersView season={season} />}
        {view === "volatility" && <VolatilityView season={season} />}
        {view === "crown" && <CrownView season={season} />}
      </div>
      <nav className="feed-dives" aria-label="All deep dives">
        {Object.entries(VIEWS).map(([id, v]) => (
          <Link key={id} href={`/viz/${id}?season=${season}`} className={id === view ? "on" : ""}>
            {v.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
