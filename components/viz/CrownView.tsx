"use client";

import { useMemo } from "react";
import { crownTimeline } from "@/lib/viz";
import { StoryLead } from "./ui";

/**
 * VIEW 10 — "The crown": who gave #1 votes to whom, week by week.
 * The title race as told by the voters' top lines.
 */
export default function CrownView({ season }: { season: number }) {
  const weeks = useMemo(() => crownTimeline(season), [season]);

  // distinct teams that got #1 votes, in order of first appearance
  const order = useMemo(() => {
    const seen: string[] = [];
    for (const w of weeks) for (const l of w.leaders) if (!seen.includes(l.team)) seen.push(l.team);
    return seen;
  }, [weeks]);

  const palette = ["#0b4f9e", "#1a7f37", "#b42318", "#7c3aed", "#b45309", "#0e7490", "#be185d", "#4d7c0f"];
  const colorFor = (team: string) => palette[order.indexOf(team) % palette.length];

  const story = useMemo(() => {
    const counts = new Map<string, { name: string; n: number }>();
    for (const w of weeks)
      for (const l of w.leaders) {
        const e = counts.get(l.team) ?? { name: l.teamName, n: 0 };
        e.n++;
        counts.set(l.team, e);
      }
    const sorted = [...counts.entries()].sort((a, b) => b[1].n - a[1].n);
    return sorted.slice(0, 3);
  }, [weeks]);

  return (
    <div>
      <StoryLead
        kicker="Deep dive · The crown"
        title="Who wore the crown, and when"
        body={
          <>
            Every #1 vote ever cast this season, week by week. Each block is one voter&apos;s top line — watch
            contenders rise and fall as the weeks roll on.{" "}
            {story.length > 0 && (
              <>
                The season&apos;s most-crowned:{" "}
                {story.map(([t, s], i) => (
                  <span key={t}>
                    {i > 0 && ", "}
                    <strong style={{ color: colorFor(t) }}>{s.name}</strong> ({s.n} #1 votes)
                  </span>
                ))}
                .
              </>
            )}
          </>
        }
      />
      <div className="viz-crown">
        {weeks.map((w) => (
          <div key={w.week} className="viz-crown-week">
            <div className="viz-crown-label">{w.label}</div>
            <div className="viz-crown-bar">
              {(() => {
                const byTeam = new Map<string, number>();
                for (const l of w.leaders) byTeam.set(l.team, (byTeam.get(l.team) ?? 0) + 1);
                return [...byTeam.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([team, n]) => {
                    const sample = w.leaders.find((l) => l.team === team)!;
                    return (
                      <div
                        key={team}
                        className="viz-crown-seg"
                        style={{ flexGrow: n, background: colorFor(team) }}
                        title={`${sample.teamName}: ${n} #1 vote${n > 1 ? "s" : ""} (${w.label})`}
                      />
                    );
                  });
              })()}
            </div>
            <div className="viz-crown-teams">
              {[...new Map(w.leaders.map((l) => [l.team, l.teamName])).entries()].map(([t, name]) => (
                <span key={t} className="viz-crown-team" style={{ borderLeftColor: colorFor(t) }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="note">Bar width = share of #1 votes that week. Hover any segment for the count.</p>
    </div>
  );
}
