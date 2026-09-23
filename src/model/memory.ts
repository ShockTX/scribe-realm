/**
 * Facts the town keeps after a run ends. Strings only.
 * The model may ask the world to remember something; it may not
 * write hit points, gold, or the pack. Those stay on the engine.
 */
import type { Character } from "./character";

export const MEMORY_CAP = 24;

export function rememberFacts(c: Character, facts: (string | undefined | null)[]): Character {
  const next = [...(c.memory ?? [])];
  let changed = false;
  for (const raw of facts) {
    if (typeof raw !== "string") continue;
    const fact = raw.trim().slice(0, 200);
    if (!fact || next.includes(fact)) continue;
    next.push(fact);
    changed = true;
  }
  if (!changed) return c;
  return { ...c, memory: next.slice(-MEMORY_CAP) };
}

/** Town memory first, then this run, duplicates dropped, tail kept. */
export function worldLedger(memory: string[] | undefined, runLedger: string[], keep = 16): string[] {
  const out: string[] = [];
  for (const raw of [...(memory ?? []), ...runLedger]) {
    const fact = raw.trim();
    if (!fact || out.includes(fact)) continue;
    out.push(fact);
  }
  return out.slice(-keep);
}
