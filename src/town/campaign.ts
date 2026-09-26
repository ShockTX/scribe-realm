/**
 * The Salt Rise.
 *
 * One named threat with five stages. It advances on whichever is further
 * along: the days you have burned, or the runs you have finished. So the
 * Reach gets worse while you shop, but a player who works hard is never
 * held back by the calendar.
 *
 * The stage biases what the Warden writes and what the town says. It never
 * touches a number that can hurt you — the clamps in scene/run.ts still own
 * that. The Master proposes, the engine disposes.
 */
import type { Character } from "../model/character";
import type { Danger } from "./quests";

export type StageId = "rumour" | "sign" | "pressure" | "crisis" | "reckoning";

export interface Stage {
  id: StageId;
  /** ordinal, 1-5, for comparisons */
  order: number;
  name: string;
  /** days elapsed OR runs finished at which this stage begins */
  atDay: number;
  atRuns: number;
  /** one line handed to the Warden as the state of the world */
  situation: string;
  /** what the player sees on the board header */
  headline: string;
  /** danger the board leans toward at this stage */
  leans: Danger;
}

export const STAGES: Stage[] = [
  {
    id: "rumour",
    order: 1,
    name: "Rumour",
    atDay: 1,
    atRuns: 0,
    situation:
      "The Salt Rise is only talk. Tides run a little high and the old men on the quay say the Drowned Crown is restless. Nobody in Saltmarrow believes it yet.",
    headline: "The tide has been running high.",
    leans: "low",
  },
  {
    id: "sign",
    order: 2,
    name: "Sign",
    atDay: 5,
    atRuns: 3,
    situation:
      "The Salt Rise has begun to show. Wells in the low town taste of brine, fish come up wrong, and something has been heard under the Drowned Crown at slack water. The town calls it a bad season.",
    headline: "The wells have gone brackish.",
    leans: "low",
  },
  {
    id: "pressure",
    order: 3,
    name: "Pressure",
    atDay: 12,
    atRuns: 7,
    situation:
      "The Salt Rise is pressing on Saltmarrow. The low streets flood at every tide, two crews have not come back, and the Register's board is thick with work nobody wants. The town has stopped calling it a season.",
    headline: "Two crews have not come back.",
    leans: "fair",
  },
  {
    id: "crisis",
    order: 4,
    name: "Crisis",
    atDay: 20,
    atRuns: 12,
    situation:
      "The Salt Rise is taking the Reach. The harbour is half-abandoned, the Shrine stands in a foot of standing water, and whatever wakes under the Drowned Crown no longer waits for slack water. People are leaving.",
    headline: "The harbour is emptying.",
    leans: "fair",
  },
  {
    id: "reckoning",
    order: 5,
    name: "Reckoning",
    atDay: 30,
    atRuns: 18,
    situation:
      "The Salt Rise is at its height. Saltmarrow is nearly empty and the sea stands where the market was. There is one thing left to do and one place to do it: down, into the Drowned Crown, to whatever has been calling the water.",
    headline: "There is one thing left to do.",
    leans: "grim",
  },
];

export const FINAL_STAGE: StageId = "reckoning";

/** Runs finished. Older saves have no counter; they read as zero. */
export function runsDone(c: Character): number {
  const n = (c as Character & { runsDone?: number }).runsDone;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n as number)) : 0;
}

/**
 * The stage the world is in. Whichever of the two clocks is further along
 * wins, so neither a shut-in nor a grinder gets stuck.
 */
export function stageOf(c: Character): Stage {
  const day = Number.isFinite(c.day) ? Math.max(1, Math.floor(c.day)) : 1;
  const runs = runsDone(c);
  let found = STAGES[0];
  for (const s of STAGES) {
    if (day >= s.atDay || runs >= s.atRuns) found = s;
  }
  return found;
}

export function stageById(id: StageId): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

/** True once the board should stop issuing errands and offer the ending. */
export function atReckoning(c: Character): boolean {
  return stageOf(c).id === FINAL_STAGE;
}

/** True when the campaign has been resolved, win or lose. */
export function campaignOver(c: Character): boolean {
  return Boolean((c as Character & { campaignEnd?: string }).campaignEnd);
}

/**
 * Stage-conditional lines for town interiors. Anything absent falls back
 * to the location's own prose, so no location needs an entry.
 */
export const TOWN_BY_STAGE: Record<string, Partial<Record<StageId, string>>> = {
  guildhall: {
    pressure:
      "The year-old contract that nobody would take is gone from the board. Someone took it. The Register will not say who, and the nail it hung on is bent.",
    crisis:
      "Half the board is bare. What remains is written in a hurried hand, and the fees have doubled because the fees have had to.",
    reckoning:
      "The board holds one posting. It has no fee written on it, because whoever wrote it did not expect to pay it.",
  },
  harbormaster: {
    crisis:
      "The ship Coll never named has come in at last, riding high and empty, and Coll will not go aboard her. She is tied at the far bollard with her boarding plank drawn up.",
    reckoning:
      "The harbour is a field of empty water. Coll's ship has gone, and so has Coll.",
  },
  temple: {
    crisis:
      "The Shrine stands in a foot of standing water. Sister Calloway has moved the candles to the second step and does not mention it.",
    reckoning:
      "The water is at the altar. Calloway prays in it, up to her knees, and does not turn around when you come in.",
  },
  tavern: {
    crisis:
      "Half the rooms are open and unclaimed. The people who left did not settle their accounts, and the innkeeper has stopped writing them down.",
    reckoning: "You have the run of the place. There is nobody else staying.",
  },
  "wharf-market": {
    crisis: "Two stalls in three are shuttered. What is left is dear.",
    reckoning: "The market is water. The stalls that could be carried have been carried away.",
  },
  weaponsmith: {
    reckoning:
      "The forge is cold, but she has left the door open and a note on the anvil: take what you need, pay me after, if there is an after.",
  },
};

export function townLine(locationId: string, c: Character): string | null {
  return TOWN_BY_STAGE[locationId]?.[stageOf(c).id] ?? null;
}
