"use client";

import { useState } from "react";
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

const VIEWS = [
  { id: "scatter", label: "1 · You vs everybody", blurb: "Voter rank vs consensus, every team as a dot." },
  { id: "arrows", label: "2 · The arrows", blurb: "Conference leans with the story attached." },
  { id: "fingerprint", label: "3 · Fingerprint", blurb: "One voter's whole ballot DNA on a card." },
  { id: "heatmap", label: "4 · The grid", blurb: "Every voter × every conference, all at once." },
  { id: "drift", label: "5 · The drift", blurb: "Week-by-week rank races vs consensus." },
  { id: "wildest", label: "6 · Wildest ballots", blurb: "The season's most rogue ballots." },
  { id: "h2h", label: "7 · Head to head", blurb: "Two voters, one week, every disagreement." },
  { id: "homers", label: "8 · The homers", blurb: "Voters who will not quit a team." },
  { id: "volatility", label: "9 · Flip-floppers", blurb: "Who churns their ballot most." },
  { id: "crown", label: "10 · The crown", blurb: "#1 votes week by week." },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export default function VizPage() {
  const initial = seasons.find((s) => !s.complete)?.year ?? seasons[seasons.length - 1].year;
  const [season, setSeason] = useState(initial);
  const [view, setView] = useState<ViewId>("scatter");

  return (
    <>
      <h1>Visual stories</h1>
      <p className="sub">
        Ten ways to <em>see</em> what AP voters do — every chart comes with the story attached.{" "}
        {seasons.map((s) => (
          <button
            key={s.year}
            className="viz-season-btn"
            aria-pressed={season === s.year}
            onClick={() => setSeason(s.year)}
          >
            {s.year}
          </button>
        ))}
      </p>
      <nav className="viz-tabs" aria-label="Visualizations">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
            title={v.blurb}
            className="viz-tab"
          >
            {v.label}
          </button>
        ))}
      </nav>
      <div className="viz-view">
        {view === "scatter" && <ScatterView season={season} />}
        {view === "arrows" && <BiasArrowsView season={season} />}
        {view === "fingerprint" && <FingerprintView season={season} />}
        {view === "heatmap" && <HeatmapView season={season} />}
        {view === "drift" && <DriftView season={season} />}
        {view === "wildest" && <WildestView season={season} />}
        {view === "h2h" && <HeadToHeadView season={season} />}
        {view === "homers" && <HomersView season={season} />}
        {view === "volatility" && <VolatilityView season={season} />}
        {view === "crown" && <CrownView season={season} />}
      </div>
      <p className="note" style={{ marginTop: 24 }}>
        Built on {seasons.find((s) => s.year === season) ? "" : ""}the same ballots as the rest of the site — nothing
        here changes the underlying data.
      </p>
    </>
  );
}
