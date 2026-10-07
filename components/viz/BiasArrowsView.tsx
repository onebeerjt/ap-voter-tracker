"use client";

import { useMemo, useState } from "react";
import { biasArrows, voterName, voterOptions } from "@/lib/viz";
import { Picker, StoryLead, LeanArrow, DivergeBar, fmtDiff } from "./ui";

/**
 * VIEW 2 — "The arrows": each voter's conference leans as annotated arrows.
 * Story-first: "this voter does XYZ — see the arrows."
 */
export default function BiasArrowsView({ season }: { season: number }) {
  const voters = useMemo(() => voterOptions(season), [season]);
  const [voter, setVoter] = useState(voters[0]?.id ?? "");
  const arrows = useMemo(() => biasArrows(voter, season), [voter, season]);
  const name = voterName(voter);

  const headline = arrows[0];
  const anti = [...arrows].reverse().find((a) => a.avgDiff > 0.5);

  return (
    <div>
      <StoryLead
        kicker="Variation 2 · The arrows"
        title="Follow the arrows"
        body={
          <>
            Every arrow is a conference this voter systematically loves or buries.{" "}
            <strong style={{ color: "var(--up)" }}>▲ green</strong> means they rank it <em>higher</em> than the consensus
            does; <strong style={{ color: "var(--down)" }}>▼ red</strong> means <em>lower</em>.{" "}
            {headline && Math.abs(headline.avgDiff) >= 0.5 && (
              <>
                The story on <strong>{name}</strong>: {headline.story}
                {anti && anti.conference !== headline.conference && (
                  <>, while the {anti.conference} gets {anti.story.replace("ranks the " + anti.conference + " ", "")}</>
                )}
                .
              </>
            )}
          </>
        }
      />
      <div className="viz-controls">
        <Picker label="Voter" value={voter} onChange={setVoter} options={voters.map((v) => ({ value: v.id, label: `${v.name} · ${v.outlet}` }))} />
      </div>
      {arrows.length === 0 ? (
        <p className="note">Not enough data for this voter this season.</p>
      ) : (
        <div className="viz-arrows">
          {arrows.map((a) => (
            <div key={a.conference} className="viz-arrow-row">
              <div className="viz-arrow-conf">
                <LeanArrow diff={a.avgDiff} size={18} />
                <strong>{a.conference}</strong>
              </div>
              <DivergeBar value={a.avgDiff} />
              <div className={`viz-arrow-num ${a.avgDiff < -0.5 ? "pos" : a.avgDiff > 0.5 ? "neg" : "muted"}`}>
                {fmtDiff(a.avgDiff)}
              </div>
              <div className="viz-arrow-story muted">
                {name} {a.story} <span className="tag">{a.n} team-weeks</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="note">
        Spots are the average of (voter rank − consensus rank) across every team-week in the consensus top 25. Negative
        = ranked higher. Minimum 15 observations.
      </p>
    </div>
  );
}
