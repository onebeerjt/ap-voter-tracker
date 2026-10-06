import { teamById } from "./data";

export const teamName = (id: string) => teamById.get(id)?.name ?? id;

/** +3 / -3 / 0, with a real minus sign. */
export function signed(n: number, digits = 0): string {
  const v = n.toFixed(digits);
  if (Number(v) === 0) return digits ? (0).toFixed(digits) : "0";
  return n > 0 ? `+${v}` : v.replace("-", "−");
}

export const rankOrNR = (r: number | null) => (r === null ? "NR" : String(r));

/** Plain-English direction for a (voter rank - consensus rank) value. */
export function direction(diff: number): string {
  if (diff < 0) return "higher";
  if (diff > 0) return "lower";
  return "even";
}
