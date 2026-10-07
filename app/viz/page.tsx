"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { seasons, voters, weekLabel } from "@/lib/data";
import { voterByline, type VoterCtx } from "@/lib/voters-meta";
import {
  balancedThisWeek,
  biggestMovers,
  churnCards,
  homerCards,
  latestCrown,
  seasonWeek,
  unbalancedThisWeek,
  weekStats,
  wildestCards,
} from "@/lib/feed";

function ThemeToggle() {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark",
  );
  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem("apvt-theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button className="feed-theme" onClick={flip} aria-pressed={dark} title="Toggle dark mode">
      {dark ? "☀ Light" : "● Dark"}
    </button>
  );
}

function Byline({ voter }: { voter: VoterCtx }) {
  return <div className="feed-byline">{voterByline(voter)}</div>;
}

function Section({
  kicker,
  title,
  dek,
  children,
}: {
  kicker: string;
  title: string;
  dek?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="feed-section">
      <div className="feed-sec-head">
        <div className="feed-kicker">{kicker}</div>
        <h2 className="feed-sec-title">{title}</h2>
        {dek && <p className="feed-sec-dek">{dek}</p>}
      </div>
      {children}
    </section>
  );
}

export default function VizFeed() {
  const years = seasons.map((s) => s.year);
  const [season, setSeason] = useState(Math.max(...years));
  const { week, label } = seasonWeek(season);

  const unbalanced = useMemo(() => unbalancedThisWeek(season, week), [season, week]);
  const balanced = useMemo(() => balancedThisWeek(season, week), [season, week]);
  const wild = useMemo(() => wildestCards(season), [season]);
  const homers = useMemo(() => homerCards(season), [season]);
  const churn = useMemo(() => churnCards(season), [season]);
  const crown = useMemo(() => latestCrown(season), [season]);
  const movers = useMemo(() => biggestMovers(season), [season]);
  const stats = useMemo(() => weekStats(season, week), [season, week]);
  const voterCount = useMemo(() => voters.filter((v) => v.seasons.includes(season)).length, [season]);

  return (
    <div className="feed">
      <header className="feed-hero">
        <div className="feed-kicker">AP Top 25 · The Voter Report</div>
        <h1 className="feed-h1">
          Who&rsquo;s grading
          <br />
          on a curve?
        </h1>
        <p className="feed-dek">
          {voterCount} voters file a Top 25 ballot every week. We read every one and find the patterns — the homers,
          the contrarians, the ballot-churners. Here&rsquo;s what {label} says.
        </p>
        <div className="feed-statstrip">
          <div className="feed-statstrip-item">
            <span className="feed-statstrip-v">{stats.ballots}</span>
            <span className="feed-statstrip-l">ballots filed</span>
          </div>
          <div className="feed-statstrip-item">
            <span className="feed-statstrip-v">{stats.outliers}</span>
            <span className="feed-statstrip-l">outlier picks</span>
          </div>
          {stats.mostDeviant && (
            <div className="feed-statstrip-item">
              <span className="feed-statstrip-v">{stats.mostDeviantOutliers}</span>
              <span className="feed-statstrip-l">
                outliers by {stats.mostDeviant.name.split(" ").slice(-1)[0]}
              </span>
            </div>
          )}
        </div>
        <div className="feed-hero-row">
          <div className="feed-seasons" role="group" aria-label="Season">
            {years.map((y) => (
              <button key={y} aria-pressed={season === y} onClick={() => setSeason(y)}>
                {y}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <Section
        kicker="This week"
        title="The most unbalanced voters"
        dek={`Single-week conference leans, ${label}. Negative means they love the conference; positive means they don't.`}
      >
        <ol className="feed-cards">
          {unbalanced.map((u, i) => (
            <li key={u.voter.id} className="feed-card">
              <div className="feed-card-top">
                <span className="feed-rank">#{i + 1}</span>
                <span className="feed-conftag">{u.conference}</span>
                <span className={`feed-bignum ${u.avgDiff < 0 ? "up" : "down"}`}>
                  {u.avgDiff < 0 ? "▲" : "▼"} {Math.abs(u.avgDiff).toFixed(1)}
                </span>
              </div>
              <div className="feed-name">{u.voter.name}</div>
              <Byline voter={u.voter} />
              <p className="feed-story">
                {u.voter.name.split(" ")[0]} {u.story} <span className="muted">({u.n} picks)</span>
              </p>
              <Link
                className="feed-cta"
                href={`/viz/scatter?season=${season}&voter=${u.voter.id}&week=${u.week}`}
              >
                See the full scatter →
              </Link>
            </li>
          ))}
        </ol>
        {unbalanced.length === 0 && <p className="note">No strong single-week leans this week. Suspiciously fair.</p>}
      </Section>

      <Section
        kicker="Steady hands"
        title="The most balanced voters"
        dek={`Closest to consensus in ${label} — the voters who just call it like the room sees it.`}
      >
        <ol className="feed-rows">
          {balanced.map((b, i) => (
            <li key={b.voter.id} className="feed-row">
              <span className="feed-rank">#{i + 1}</span>
              <div className="feed-row-main">
                <div className="feed-name-sm">{b.voter.name}</div>
                <Byline voter={b.voter} />
                <div className="feed-story-sm">
                  Off consensus by just <strong>{b.avgAbs.toFixed(1)} spots</strong> a pick{" "}
                  <span className="muted">({b.n} teams)</span>
                </div>
              </div>
              <Link className="feed-cta" href={`/viz/fingerprint?season=${season}&voter=${b.voter.id}`}>
                Fingerprint →
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        kicker="Rogues' gallery"
        title="Wildest ballots of the season"
        dek="Ranked by picks landing 5+ spots from consensus."
      >
        <ol className="feed-rows">
          {wild.map((w, i) => (
            <li key={`${w.voter.id}-${w.week}`} className="feed-row">
              <span className="feed-rank">#{i + 1}</span>
              <div className="feed-row-main">
                <div className="feed-name-sm">{w.voter.name}</div>
                <Byline voter={w.voter} />
                <div className="feed-story-sm">
                  {w.outlierCount} outlier picks in {w.weekLabel} — wildest: {w.wildestTeamName}{" "}
                  <strong className={w.wildestDiff < 0 ? "pos" : "neg"}>
                    {Math.abs(w.wildestDiff)} spots {w.wildestDiff < 0 ? "high" : "low"}
                  </strong>
                </div>
              </div>
              <span className="feed-bignum-sm">{w.outlierCount}</span>
            </li>
          ))}
        </ol>
        <Link className="feed-cta" href={`/viz/wildest?season=${season}`}>
          The full rogues&rsquo; gallery →
        </Link>
      </Section>

      <Section kicker="Loyalty program" title="The homers" dek="Voters who will not quit a team, week after week.">
        <ol className="feed-rows">
          {homers.map((h, i) => (
            <li key={`${h.voter.id}-${h.teamName}`} className="feed-row">
              <span className="feed-rank">#{i + 1}</span>
              <div className="feed-row-main">
                <div className="feed-name-sm">{h.voter.name}</div>
                <Byline voter={h.voter} />
                <div className="feed-story-sm">
                  Ranks <strong>{h.teamName}</strong>{" "}
                  <strong className={h.avgDiff < 0 ? "pos" : "neg"}>
                    {Math.abs(h.avgDiff).toFixed(1)} spots {h.avgDiff < 0 ? "high" : "low"}
                  </strong>{" "}
                  <span className="muted">every week for {h.weeks} weeks</span>
                </div>
              </div>
              <span className={`feed-bignum-sm ${h.avgDiff < 0 ? "up" : "down"}`}>
                {h.avgDiff < 0 ? "▲" : "▼"}
                {Math.abs(h.avgDiff).toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
        <Link className="feed-cta" href={`/viz/homers?season=${season}`}>
          Every homer, every team →
        </Link>
      </Section>

      <Section kicker="Restless" title="The flip-floppers" dek="Average spots moved per team between consecutive ballots.">
        <ol className="feed-rows">
          {churn.map((c, i) => (
            <li key={c.voter.id} className="feed-row">
              <span className="feed-rank">#{i + 1}</span>
              <div className="feed-row-main">
                <div className="feed-name-sm">{c.voter.name}</div>
                <Byline voter={c.voter} />
                <div className="feed-story-sm">
                  Moves teams <strong>{c.volatility.toFixed(1)} spots</strong> a week{" "}
                  <span className="muted">({c.ballots} ballots)</span>
                </div>
              </div>
              <span className="feed-bignum-sm">{c.volatility.toFixed(1)}</span>
            </li>
          ))}
        </ol>
        <Link className="feed-cta" href={`/viz/volatility?season=${season}`}>
          The full churn ranking →
        </Link>
      </Section>

      {crown && (
        <Section kicker="No. 1 votes" title="The crown">
          <div className="feed-crown">
            <span className="feed-bignum">{crown.voterCount}</span>
            <div>
              <div className="feed-name-sm">{crown.teamName}</div>
              <div className="feed-story-sm">
                {crown.unanimous
                  ? `Every voter put ${crown.teamName} No. 1 in ${crown.weekLabel}. Boring. Correct, but boring.`
                  : `${crown.voterCount} voters put ${crown.teamName} No. 1 in ${crown.weekLabel}.`}
              </div>
            </div>
          </div>
          <Link className="feed-cta" href={`/viz/crown?season=${season}`}>
            The week-by-week title race →
          </Link>
        </Section>
      )}

      {movers.length > 0 && (
        <Section kicker="The week that was" title="Biggest consensus movers" dek={`Between the last two polls.`}>
          <ol className="feed-rows">
            {movers.map((m) => (
              <li key={m.teamName} className="feed-row">
                <div className="feed-row-main">
                  <div className="feed-name-sm">{m.teamName}</div>
                  <div className="feed-story-sm">
                    {m.from === null ? (
                      <>Crashed the poll at <strong>#{m.to}</strong></>
                    ) : m.to === null ? (
                      <>Fell out from <strong>#{m.from}</strong></>
                    ) : (
                      <>
                        <strong>#{m.from}</strong> → <strong>#{m.to}</strong>
                      </>
                    )}
                  </div>
                </div>
                <span className={`feed-bignum-sm ${m.delta > 0 ? "up" : "down"}`}>
                  {m.delta > 0 ? "▲" : "▼"}
                  {Math.abs(m.delta)}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section kicker="Go deeper" title="Ten ways to see it yourself">
        <div className="feed-dives">
          {[
            ["scatter", "You vs everybody", "Voter rank vs consensus, every team as a dot."],
            ["arrows", "The arrows", "Conference leans with the story attached."],
            ["fingerprint", "Fingerprint", "One voter's whole ballot DNA on a card."],
            ["heatmap", "The grid", "Every voter × every conference, all at once."],
            ["drift", "The drift", "Week-by-week rank races vs consensus."],
            ["wildest", "Wildest ballots", "The season's most rogue ballots."],
            ["h2h", "Head to head", "Two voters, one week, every disagreement."],
            ["homers", "The homers", "Voters who will not quit a team."],
            ["volatility", "Flip-floppers", "Who churns their ballot most."],
            ["crown", "The crown", "#1 votes week by week."],
          ].map(([id, label2, blurb]) => (
            <Link key={id} href={`/viz/${id}?season=${season}`} className="feed-dive">
              <div className="feed-dive-label">{label2}</div>
              <div className="feed-dive-blurb">{blurb}</div>
            </Link>
          ))}
        </div>
      </Section>

      <p className="note">
        Built on the same ballots as the rest of the site — {weekLabel(season, week)} is the latest week with full
        ballots. Nothing here changes the underlying data.
      </p>
    </div>
  );
}
