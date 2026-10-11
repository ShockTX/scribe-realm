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
import { rememberFacts } from "../model/memory";
import { maxHp } from "../rules/derive";
import { foeCeiling } from "./foes";
import {
  applyConsequence,
  branchOf,
  readConsequence,
  readConsequenceNoCheck,
  resolve,
  type CheckRequest,
  type Consequence,
  type Roll,
} from "./dice";
import type { Site } from "./sites";
import { XP_THRESHOLDS } from "../rules/advance";

export class GmSilent extends Error {}

/**
 * Where the GM lives. Same origin (relative /gm), so it inherits the
 * site's password. Dev parity requires the same-origin proxy in
 * vite.config.ts (server.proxy /gm -> GM_TARGET || 127.0.0.1:8710);
 * never switch this to an absolute backend URL.
 */
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
  /**
   * @deprecated Dead channel, kept for saved-game compat. Nothing populates
   * it and settleRun ignores it; loot travels via the character's pack only.
   */
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
    /** worn armour class; the engine already decided it */
    ac?: number;
    /** main-hand weapon, or "nothing" */
    weapon?: string;
    /** body armour and shield, or "nothing" */
    armour?: string;
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
  /**
   * Set when the fiction has become a fight. The engine matches the name
   * to a real stat block and rolls every attack. Absent when nobody draws steel.
   */
  fight?: { name: string; count: number };
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

function readFight(raw: unknown, level: number): { name: string; count: number } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const name = str(r.name).slice(0, 80);
  if (!name) return undefined;
  const n = typeof r.count === "number" && Number.isFinite(r.count) ? Math.round(r.count) : 1;
  // Same ceiling beginCombat() enforces. Two different caps in two files meant
  // the parsed number was never the number fought.
  return { name, count: Math.max(1, Math.min(foeCeiling(level), n || 1)) };
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
    fight: readFight(r.fight, level),
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
  return readScene(await res.json(), Math.max(1, Math.round(seed.character.level) || 1));
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
    // No roll asked for: the action simply happens — but under the tighter
    // no-check caps, so free narration cannot farm gold or healing. The
    // re-clamp also covers hand-built replies that never passed readScene.
    const b = reply.onSuccess ?? { text: reply.situation, consequence: {} };
    const con = readConsequenceNoCheck(b.consequence ?? {}, level);
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
  // Re-clamp even for parsed replies: adjudicate is the ONLY path by which
  // a run changes a character, so the caps are enforced here, not trusted
  // to the parser having seen the data first.
  const con = readConsequence(chosen?.consequence ?? {}, level);
  return { roll, branch, text, after: applyConsequence(c, hpMax, con), consequence: con };
}

/* ------------------------------------------------------------------ *
 * P7: pending checks settle BEFORE steel and BEFORE boots.            *
 *                                                                     *
 * The old SceneView started a fight (or walked rooms) while a pending *
 * check was still open, then resolved it afterwards with act() —      *
 * rolling twice for one moment, or dropping the roll entirely. These  *
 * pure helpers own the ordering rule so the component stays thin and  *
 * the rule stays tested. adjudicate() is pure (dice aside), so both   *
 * helpers below are pure too.                                         *
 * ------------------------------------------------------------------ */

/**
 * Resolve a pending check before a fight begins. Returns the adjudication
 * (roll, text, character-after, consequence) when the pending reply asked
 * for a check, or null when there is nothing to settle. The caller applies
 * the consequence, records the beat, clears pending, and THEN begins
 * combat — never the reverse.
 */
export function resolvePendingBeforeFight(
  pending: SceneReply | null,
  character: Character,
): { roll?: Roll; branch: "success" | "partial" | "failure"; text: string; after: Character; consequence: Consequence } | null {
  if (!pending?.check) return null;
  return adjudicate(character, pending);
}

/**
 * Travel must not drop a pending check. Returns true when the pending reply
 * carries a check that has to be adjudicated (and recorded) before the
 * party moves rooms; false when travel may proceed as before.
 */
export function requirePendingClearBeforeTravel(pending: SceneReply | null): boolean {
  return !!pending?.check;
}

/**
 * The beat a fight is over and written down with. `summary` is
 * combatSummary(state) — engine provenance, not a player roll — kept as the
 * action string so the Warden narrates a fact rather than a guess. There is
 * deliberately NO roll here: the pending check (if any) was settled before
 * the fight, and the fight's own wounds are already on the character via
 * applyCombat. Used when the last beat still wants its action, i.e. the
 * fight began with no pending check to settle first.
 */
export function combatBeat(last: Beat, summary: string): Beat {
  return { ...last, action: summary, result: summary };
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

/** Quest danger is low | fair | grim. Older words still pay, so a stale prompt is not silent. */
export function dangerBase(danger: string): number {
  if (danger === "grim" || danger === "deadly" || danger === "hard") return 120;
  if (danger === "fair" || danger === "risky") return 75;
  return 40;
}

/**
 * What fraction of the gap to the next level a finished run is worth.
 * Centred on a half so two won runs make a level. Flat fractions, not a
 * hand-tuned table, so the shape holds at level 2 and at level 12.
 */
export const DANGER_SHARE: Record<string, number> = {
  low: 0.4,
  fair: 0.5,
  grim: 0.6,
};

export function dangerShare(danger: string): number {
  if (danger === "grim" || danger === "deadly" || danger === "hard") return DANGER_SHARE.grim;
  if (danger === "fair" || danger === "risky") return DANGER_SHARE.fair;
  return DANGER_SHARE.low;
}

/**
 * XP is a share of the distance to your next level, not danger x level.
 * The old formula paid 480 for a grim job at level 4 against a 6,500-xp
 * gap — four runs to level 2 and thirteen to level 5, which is exactly
 * backwards. A won run pays about half the gap, so every level costs
 * roughly two runs at every level: grim closer to one and a half, low
 * closer to two and a half.
 */
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
  const lv = Math.min(20, Math.max(1, level));
  const here = XP_THRESHOLDS[lv - 1] ?? 0;
  const next = XP_THRESHOLDS[lv] ?? null;
  // At 20 there is no gap left; fall back to the last real gap so work still pays.
  const gap = next == null ? (XP_THRESHOLDS[19] - XP_THRESHOLDS[18]) : next - here;
  const xp = Math.max(10, Math.round(gap * dangerShare(danger) * share));
  // run.loot is a dead channel: nothing ever populates it (adjudicate pays
  // items straight into the pack via applyConsequence), and honouring it
  // here would double-pay anything a caller stuffed in by hand. Loot travels
  // via the pack only. The field stays on Run for saved-game compat.
  const loot: string[] = [];
  const lines = [
    `${gold} gp` + (run.ending === "cost" ? " — half, for half a job" : ""),
    `${xp} xp`,
  ];
  if (loot.length) lines.push(`${loot.length} thing${loot.length > 1 ? "s" : ""} carried out`);
  return { gold, xp, loot, lines };
}

/**
 * Apply a finished run to a character. `run.payout` means this ending was
 * already paid, including a loss whose payout is 0. A quest already marked
 * done gets the marker written and the purse left alone, so a reload of an
 * older save does not pay a second time.
 */
export function applySettlement(
  character: Character,
  run: Run,
  quest: { id: string; reward: number; danger: string },
): { character: Character; settlement: Settlement } {
  const settlement = settleRun(run, quest.reward, quest.danger, totalLevel(character) || 1);
  if (!run.ending || typeof run.payout === "number") {
    return { character, settlement };
  }
  const quests = character.quests ?? [];
  const row = quests.find((q) => q.id === quest.id);
  const paidRun: Run = { ...run, payout: settlement.gold };
  if (row?.state === "done") {
    return { character: { ...character, activeRun: paidRun }, settlement };
  }
  const paid = rememberFacts(
    {
      ...character,
      xp: (character.xp ?? 0) + settlement.xp,
      coin: { ...character.coin, gp: character.coin.gp + settlement.gold },
      pack: [...character.pack, ...settlement.loot],
      quests: quests.map((q) => (q.id === quest.id ? { ...q, state: "done" as const } : q)),
      activeRun: paidRun,
    },
    run.ledger,
  );
  return {
    settlement,
    character: { ...paid, runsDone: (paid.runsDone ?? 0) + 1 },
  };
}
