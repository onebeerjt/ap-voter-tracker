"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface VoterRow {
  id: string;
  name: string;
  outlet: string;
  seasons: number[];
  ballots: number;
  fitAll: number | null;
  fitBySeason: Record<string, number | null>;
}

type SortKey = "name" | "outlet" | "ballots" | "fitAll" | string;

export function VoterTable({ rows, seasons }: { rows: VoterRow[]; seasons: number[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const value = (r: VoterRow, key: SortKey): string | number | null =>
    key === "name" ? r.name : key === "outlet" ? r.outlet : key === "ballots" ? r.ballots : key === "fitAll" ? r.fitAll : r.fitBySeason[key];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? rows.filter((r) => `${r.name} ${r.outlet}`.toLowerCase().includes(q)) : rows;
    return [...filtered].sort((a, b) => {
      const av = value(a, sort.key);
      const bv = value(b, sort.key);
      if (av === null && bv === null) return 0;
      if (av === null) return 1; // blanks last regardless of direction
      if (bv === null) return -1;
      const c = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return c * sort.dir;
    });
  }, [rows, query, sort]);

  const head = (key: SortKey, label: string, numeric = false) => (
    <th className={numeric ? "num" : undefined} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : numeric ? -1 : 1 }))}
      >
        {label}
        {sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
  const fmt = (n: number | null) => (n === null ? "–" : n.toFixed(1));

  return (
    <div>
      <div className="controls">
        <input
          type="search"
          placeholder="Search voters or outlets"
          aria-label="Search voters or outlets"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="muted">
          {shown.length} of {rows.length} voters
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {head("name", "Voter")}
              {head("outlet", "Outlet")}
              <th>Seasons</th>
              {head("ballots", "Ballots", true)}
              {seasons.map((y) => head(String(y), `Fit ${y}`, true))}
              {head("fitAll", "Fit (all)", true)}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/voter/${r.id}`}>{r.name}</Link>
                </td>
                <td className="muted">{r.outlet}</td>
                <td>{r.seasons.join(", ")}</td>
                <td className="num">{r.ballots}</td>
                {seasons.map((y) => (
                  <td key={y} className="num">
                    {fmt(r.fitBySeason[String(y)])}
                  </td>
                ))}
                <td className="num">
                  <strong>{fmt(r.fitAll)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Consensus fit = 100 &minus; 10 &times; average absolute rank difference from consensus across consensus top-25
        teams (an omitted team counts as rank 26). 100 = identical to consensus; lower = more independent.
      </p>
    </div>
  );
}
