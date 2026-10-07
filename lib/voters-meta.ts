import metaJson from "../data/voters-meta.json";
import { voterById } from "./data";

export interface VoterMeta {
  metro: string | null;
  beat: string | null;
}

const meta = new Map<string, VoterMeta>(
  (metaJson as { id: string; metro: string | null; beat: string | null }[]).map((m) => [
    m.id,
    { metro: m.metro, beat: m.beat },
  ]),
);

export function voterMeta(id: string): VoterMeta {
  return meta.get(id) ?? { metro: null, beat: null };
}

export interface VoterCtx {
  id: string;
  name: string;
  outlet: string;
  metro: string | null;
  beat: string | null;
}

/** Name + outlet + metro + beat for display on cards. Never guesses: fields are null when unverified. */
export function voterCtx(id: string): VoterCtx {
  const v = voterById.get(id);
  const m = voterMeta(id);
  return {
    id,
    name: v?.name ?? id,
    outlet: v?.outlet ?? "",
    metro: m.metro,
    beat: m.beat,
  };
}

/** "Adam Lichtenstein · South Florida Sun Sentinel · Fort Lauderdale, FL · covers Miami" */
export function voterByline(c: VoterCtx): string {
  const parts = [c.outlet];
  if (c.metro) parts.push(c.metro);
  if (c.beat && c.beat !== "National") parts.push(`covers ${c.beat}`);
  return parts.filter(Boolean).join(" · ");
}
