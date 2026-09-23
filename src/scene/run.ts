/**
 * A run: the middle of a quest.
 *
 * Accepting work opens a run of beats at a site. Each beat the GM describes a
 * situation and offers suggested actions; the player may type anything. The
 * GM returns a STRUCTURE — which check, what DC, what each outcome costs — and
 * this module rolls it with the engine and applies the result.
 *
 * The GM never sees a transcript. It sees the ledger: the character, the room,
 * the last few beats, and the facts the world has recorded.
 */

import type { Ability, Character } from "../model/character";
import { totalLevel } from "../model/character";
import { maxHp } from "../rules/derive";
import {
  applyConsequence,
  branchOf,
  readConsequence,
  resolve,
  type CheckRequest,
  type Consequence,
  type Roll,
} from "./dice";
import type { Site } from "./sites";

export class GmSilent extends Error {}

const GM_SCENE = "/gm/scene";

/** One exchange, kept for the ledger and the scroll-back. */
export interface Beat {
  n: number;
  roomId: string;
  /** what the GM said before the player acted */
  situation: string;
  /** what the player typed or tapped */
  action?: string;
  roll?: Roll;
  /** what the GM said happened */
  result?: string;
  consequence?: Consequence;
}

export type RunEnding = "won" | "cost" | "lost";

export interface Run {
  questId: string;
  siteId: string;
  roomId: string;
  beats: Beat[];
  /** facts the world now knows, fed back to the GM every turn */
  ledger: string[];
  /** how many beats before the run must resolve */
  length: number;
  ending: RunEnding | null;
  /** the GM's closing narration */
  epilogue?: string;
  /** paid on a won or cost ending */
  payout?: number;
  /** shop item ids carried out of the site */
  loot?: string[];
}

const ABILITIES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

export function newRun(questId: string, site: Site, length = 6): Run {
  return {
    questId,
    siteId: site.id,
    roomId: site.rooms[0].id,
    beats: [],
    ledger: [],
    length,
    ending: null,
  };
}

/** What the GM is shown. Deliberately small — no raw transcript. */
export interface SceneSeed {
  character: {
    name: string;
    level: number;
    klass: string;
    race: string;
    hp: number;
    maxHp: number;
    gp: number;
    skills: string[];
    party: string[];
  };
  quest: { title: string; giver: string; objective: string };
  site: { name: string; description: string; rooms: { id: string; name: string; note: string }[] };
  roomId: string;
  /** the last few beats, compressed to one line each */
  recent: string[];
  ledger: string[];
  beat: number;
  of: number;
  /** what the player just did, absent on the opening beat */
  action?: string;
  /** the roll the engine already made, so the GM narrates a fact, not a guess */
  roll?: { label: string; die: number; total: number; dc: number; outcome: string };
}

/** The GM's reply, before it is trusted. */
export interface SceneReply {
  situation: string;
  suggestions: string[];
  check?: CheckRequest;
  /** keyed by branch, used once the roll is made */
  onSuccess?: { text: string; consequence?: Consequence };
  onPartial?: { text: string; consequence?: Consequence };
  onFailure?: { text: string; consequence?: Consequence };
  /** set when the GM judges the run over */
  ending?: RunEnding;
  epilogue?: string;
  /** the room the action moved us to */
  moveTo?: string;
  remember?: string;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function readBranch(raw: unknown, level: number): { text: string; consequence?: Consequence } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const text = str(r.text);
  if (!text) return undefined;
  return { text, consequence: readConsequence(r.consequence, level) };
}

function readCheck(raw: unknown): CheckRequest | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const ability = ABILITIES.includes(r.ability as Ability) ? (r.ability as Ability) : null;
  if (!ability) return undefined;
  const dcRaw = typeof r.dc === "number" ? r.dc : 12;
  return {
    ability,
    skill: typeof r.skill === "string" && r.skill.trim() ? r.skill.trim() : undefined,
    // Never let the model set an impossible or trivial DC.
    dc: Math.max(5, Math.min(25, Math.round(dcRaw))),
    stakes: str(r.stakes, "It matters."),
  };
}

/** Parse the service's reply. Exported so it can be tested without a network. */
export function readScene(raw: unknown, level: number): SceneReply {
  if (!raw || typeof raw !== "object") throw new GmSilent("empty reply");
  const r = raw as Record<string, unknown>;
  const situation = str(r.situation);
  if (!situation) throw new GmSilent("the GM described nothing");
  const suggestions = Array.isArray(r.suggestions)
    ? r.suggestions.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 4)
    : [];
  const ending =
    r.ending === "won" || r.ending === "cost" || r.ending === "lost"
      ? (r.ending as RunEnding)
      : undefined;
  return {
    situation,
    suggestions,
    check: readCheck(r.check),
    onSuccess: readBranch(r.onSuccess, level),
    onPartial: readBranch(r.onPartial, level),
    onFailure: readBranch(r.onFailure, level),
    ending,
    epilogue: str(r.epilogue) || undefined,
    moveTo: str(r.moveTo) || undefined,
    remember: str(r.remember) || undefined,
  };
}

export async function askScene(seed: SceneSeed): Promise<SceneReply> {
  let res: Response;
  try {
    res = await fetch(GM_SCENE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(seed),
    });
  } catch {
    throw new GmSilent("the way back to the Warden is out");
  }
  if (!res.ok) {
    throw new GmSilent(
      res.status === 502
        ? "the Warden has gone quiet"
        : `the Warden would not answer (${res.status})`,
    );
  }
  return readScene(await res.json(), 1);
}

/**
 * Take the player's action through the engine.
 * Returns the roll (if the GM asked for one) and the character after.
 * This is the ONLY path by which a run changes a character.
 */
export function adjudicate(
  c: Character,
  reply: SceneReply,
): { roll?: Roll; branch: "success" | "partial" | "failure"; text: string; after: Character; consequence: Consequence } {
  const level = totalLevel(c) || 1;
  const hpMax = maxHp(c).value;

  if (!reply.check) {
    // No roll asked for: the action simply happens.
    const b = reply.onSuccess ?? { text: reply.situation, consequence: {} };
    const con = b.consequence ?? {};
    return { branch: "success", text: b.text, after: applyConsequence(c, hpMax, con), consequence: con };
  }

  const roll = resolve(c, reply.check);
  const branch = branchOf(roll.outcome);
  const chosen =
    branch === "success"
      ? reply.onSuccess
      : branch === "partial"
        ? (reply.onPartial ?? reply.onFailure)
        : (reply.onFailure ?? reply.onPartial);
  const text = chosen?.text ?? "It goes as it goes.";
  const con = chosen?.consequence ?? {};
  void level;
  return { roll, branch, text, after: applyConsequence(c, hpMax, con), consequence: con };
}

/** Compress a beat to one line for the GM's memory. */
export function beatLine(b: Beat): string {
  const parts = [`#${b.n} in ${b.roomId}`];
  if (b.action) parts.push(`you: ${b.action}`);
  if (b.roll) parts.push(`${b.roll.label} ${b.roll.total} vs ${b.roll.dc} → ${b.roll.outcome}`);
  if (b.result) parts.push(b.result.slice(0, 160));
  return parts.join(" | ");
}

export function runIsOver(run: Run): boolean {
  return run.ending !== null;
}


/* ------------------------------------------------------------------ *
 * Settlement. The run is over; this is the only place the world pays. *
 * ------------------------------------------------------------------ */

export interface Settlement {
  gold: number;
  xp: number;
  loot: string[];
  /** plain-English lines for the ending panel */
  lines: string[];
}

/** XP is derived from the quest's danger and how the run ended. */
export function settleRun(
  run: Run,
  questReward: number,
  danger: string,
  level: number,
): Settlement {
  if (!run.ending || run.ending === "lost") {
    return { gold: 0, xp: 0, loot: [], lines: ["You come back with nothing but the walk."] };
  }
  const share = run.ending === "won" ? 1 : 0.5;
  const gold = Math.max(1, Math.round(questReward * share));
  const base = danger === "deadly" ? 200 : danger === "hard" ? 120 : danger === "risky" ? 75 : 40;
  const xp = Math.max(10, Math.round(base * share * Math.max(1, level)));
  const loot = run.loot ?? [];
  const lines = [
    `${gold} gp` + (run.ending === "cost" ? " — half, for half a job" : ""),
    `${xp} xp`,
  ];
  if (loot.length) lines.push(`${loot.length} thing${loot.length > 1 ? "s" : ""} carried out`);
  return { gold, xp, loot, lines };
}
