"use client";

import { useState, type ReactNode } from "react";

export function SeasonSwitcher({
  seasons,
  initial,
  panels,
}: {
  seasons: { year: number; label: string }[];
  initial: number;
  panels: Record<string, ReactNode>;
}) {
  const [season, setSeason] = useState(initial);
  return (
    <div>
      <div className="tabs" role="group" aria-label="Season">
        {seasons.map((s) => (
          <button key={s.year} type="button" aria-pressed={s.year === season} onClick={() => setSeason(s.year)}>
            {s.label}
          </button>
        ))}
      </div>
      {panels[String(season)]}
    </div>
  );
}
