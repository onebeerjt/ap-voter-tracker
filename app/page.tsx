import Link from "next/link";
import { BiasLeaderboard } from "@/components/BiasLeaderboard";
import { ConsensusTable, WeekLinks } from "@/components/ConsensusTable";
import { SeasonSwitcher } from "@/components/SeasonSwitcher";
import { weekBallots } from "@/lib/analysis";
import { latestWeek, seasons, weekLabel } from "@/lib/data";

export default function Home() {
  const panels: Record<string, React.ReactNode> = {};
  for (const s of seasons) {
    const week = latestWeek(s.year);
    panels[String(s.year)] = (
      <section>
        <h2>
          {s.year} {weekLabel(s.year, week)} consensus top 25{" "}
          <Link href={`/week/${s.year}/${week}`} style={{ fontSize: 13, fontWeight: 400 }}>
            outliers &rarr;
          </Link>
        </h2>
        <p className="note" style={{ margin: "0 0 8px" }}>
          {weekBallots(s.year, week).length} ballots, Borda count. {s.complete ? "Season complete." : "Season in progress."}
        </p>
        <div className="grid two">
          <ConsensusTable season={s.year} week={week} />
          <div>
            <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Most biased voters, {s.year}</h3>
            <BiasLeaderboard season={s.year} />
          </div>
        </div>
        <h2>All weeks</h2>
        <WeekLinks season={s.year} weeks={s.weeks} />
      </section>
    );
  }
  const initial = seasons.find((s) => !s.complete)?.year ?? seasons[seasons.length - 1].year;
  return (
    <>
      <h1>AP Poll Voter Tracker</h1>
      <p className="sub">
        Every AP college football voter&apos;s weekly ballot, compared with a consensus we compute ourselves.
      </p>
      <SeasonSwitcher
        seasons={seasons.map((s) => ({ year: s.year, label: `${s.year}${s.complete ? "" : " (in progress)"}` }))}
        initial={initial}
        panels={panels}
      />
    </>
  );
}
