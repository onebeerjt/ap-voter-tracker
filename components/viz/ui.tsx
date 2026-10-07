"use client";

import React from "react";

/** Big storytelling headline for a view: what you're looking at and why it matters. */
export function StoryLead({ kicker, title, body }: { kicker: string; title: string; body: React.ReactNode }) {
  return (
    <div className="viz-lead">
      <div className="viz-kicker">{kicker}</div>
      <h2 className="viz-title">{title}</h2>
      <p className="viz-body">{body}</p>
    </div>
  );
}

/** Labeled select control. */
export function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="viz-picker">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Small stat chip. */
export function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "" }) {
  return (
    <div className={`viz-stat ${tone ?? ""}`}>
      <div className="viz-stat-v">{value}</div>
      <div className="viz-stat-l">{label}</div>
    </div>
  );
}

/** Big dramatic arrow: size scales with |diff|. */
export function BigArrow({ diff }: { diff: number }) {
  const mag = Math.min(1, Math.abs(diff) / 6);
  const size = 28 + mag * 44;
  const up = diff < -0.4;
  const down = diff > 0.4;
  const color = up ? "var(--up)" : down ? "var(--down)" : "var(--muted)";
  const opacity = 0.35 + mag * 0.65;
  if (!up && !down) return <span style={{ color, fontSize: 20 }}>●</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ opacity, flexShrink: 0 }}>
      <path
        d={up ? "M8 13.5 V2.5 M3.5 7 L8 2.5 L12.5 7" : "M8 2.5 V13.5 M3.5 9 L8 13.5 L12.5 9"}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Inline SVG arrow: direction from a signed diff (negative diff = ranked higher = up arrow). */
export function LeanArrow({ diff, size = 14 }: { diff: number; size?: number }) {
  const up = diff < -0.4;
  const down = diff > 0.4;
  const color = up ? "var(--up)" : down ? "var(--down)" : "var(--muted)";
  if (!up && !down)
    return (
      <span style={{ color, fontSize: size }} title="about even">
        ●
      </span>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ verticalAlign: "-2px" }}>
      <path
        d={up ? "M8 13 V3 M3.5 7.5 L8 3 L12.5 7.5" : "M8 3 V13 M3.5 8.5 L8 13 L12.5 8.5"}
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Diverging bar: negative (high lean) goes left/green, positive (low lean) goes right/red. */
export function DivergeBar({ value, max = 6, height = 10 }: { value: number; max?: number; height?: number }) {
  const pct = Math.min(100, (Math.abs(value) / max) * 50);
  const left = value < 0;
  return (
    <div className="viz-diverge" style={{ height }}>
      <div className="viz-diverge-mid" />
      <div
        className={`viz-diverge-fill ${left ? "left" : "right"}`}
        style={left ? { width: `${pct}%`, right: "50%" } : { width: `${pct}%`, left: "50%" }}
      />
    </div>
  );
}

/** Format a signed diff as "+3.2" / "−3.2" spots. */
export function fmtDiff(d: number): string {
  const v = Math.abs(d).toFixed(1);
  if (Math.abs(d) < 0.05) return "even";
  return `${d < 0 ? "▲ " : "▼ "}${v}`;
}
