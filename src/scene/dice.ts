/**
 * Dice and adjudication.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE:
 * The Game Master proposes, the engine disposes. The model may say
 * "this is a Dexterity check against DC 13, and here is what each outcome
 * costs" — it may NEVER roll, never set hit points, never grant gold.
 * Every number that touches the character passes through here.
 */

import type { Ability, Character } from "../model/character";
import { modifiers, proficiencyBonus, skillBonus } from "../rules/derive";

export type Outcome = "critical" | "success" | "partial" | "failure" | "fumble";

export interface Roll {
  /** the raw d20 */
  die: number;
  bonus: number;
  total: number;
  dc: number;
  outcome: Outcome;
  /** what was rolled, for the tray: "Dexterity (Stealth)" */
  label: string;
}

/** A check the GM asked for. Nothing here is applied until rolled. */
export interface CheckRequest {
  ability: Ability;
  /** SRD skill index, if the check is a skilled one */
  skill?: string;
  dc: number;
  /** one line: what is at risk */
  stakes: string;
}

export function d20(): number {
  return 1 + Math.floor(Math.random() * 20);
}

export function roll(sides: number, times = 1): number {
  let n = 0;
  for (let i = 0; i < times; i++) n += 1 + Math.floor(Math.random() * sides);
  return n;
}

const ABILITY_NAME: Record<Ability, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

/** The bonus this character brings to a check, by the real 5e rules. */
export function bonusFor(c: Character, req: CheckRequest): { bonus: number; label: string } {
  if (req.skill) {
    const s = skillBonus(c, req.skill);
    const pretty = req.skill.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    return {
      bonus: s.bonus,
      label: `${ABILITY_NAME[req.ability]} (${pretty})`,
    };
  }
  return { bonus: modifiers(c)[req.ability], label: ABILITY_NAME[req.ability] };
}

/**
 * Resolve a check. A natural 20 always reads as critical and a natural 1 as a
 * fumble, because those are the moments people remember. Between them, beating
 * the DC is success, missing it by 1 or 2 is a partial — fail forward, the
 * thing happens but it costs you.
 */
export function resolve(c: Character, req: CheckRequest): Roll {
  const die = d20();
  const { bonus, label } = bonusFor(c, req);
  const total = die + bonus;
  let outcome: Outcome;
  if (die === 20) outcome = "critical";
  else if (die === 1) outcome = "fumble";
  else if (total >= req.dc) outcome = "success";
  else if (total >= req.dc - 2) outcome = "partial";
  else outcome = "failure";
  return { die, bonus, total, dc: req.dc, outcome, label };
}

/** Which branch of the GM's proposal an outcome takes. */
export function branchOf(o: Outcome): "success" | "partial" | "failure" {
  if (o === "critical" || o === "success") return "success";
  if (o === "partial") return "partial";
  return "failure";
}

export const OUTCOME_WORD: Record<Outcome, string> = {
  critical: "A natural twenty",
  success: "Success",
  partial: "Success, at a price",
  failure: "Failure",
  fumble: "A natural one",
};

/**
 * What an outcome does to the character. The GM supplies the intent
 * (hp: -3, gp: +5); this clamps it to something legal and applies it.
 * Nothing else in the app is allowed to write hp or coin during a run.
 */
export interface Consequence {
  /** negative hurts, positive heals */
  hp?: number;
  /** negative spends, positive pays */
  gp?: number;
  /** shop item ids gained */
  gain?: string[];
  /** a fact the world should remember */
  remember?: string;
}

export function applyConsequence(
  c: Character,
  maxHpValue: number,
  con: Consequence,
): Character {
  const now = c.currentHp || maxHpValue;
  const hp = Math.max(0, Math.min(maxHpValue, now + (con.hp ?? 0)));
  const gp = Math.max(0, c.coin.gp + (con.gp ?? 0));
  return {
    ...c,
    currentHp: hp,
    coin: { ...c.coin, gp },
    pack: con.gain?.length ? [...c.pack, ...con.gain] : c.pack,
  };
}

/** Clamp whatever the model returned into a sane consequence. */
export function readConsequence(raw: unknown, level: number): Consequence {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const cap = 4 + level * 3; // a single beat can never gut a character
  const goldCap = 25 * level;
  const out: Consequence = {};
  if (typeof r.hp === "number" && Number.isFinite(r.hp)) {
    out.hp = Math.max(-cap, Math.min(cap, Math.round(r.hp)));
  }
  if (typeof r.gp === "number" && Number.isFinite(r.gp)) {
    out.gp = Math.max(-goldCap, Math.min(goldCap, Math.round(r.gp)));
  }
  if (Array.isArray(r.gain)) {
    out.gain = r.gain.filter((x): x is string => typeof x === "string").slice(0, 3);
  }
  if (typeof r.remember === "string" && r.remember.trim()) {
    out.remember = r.remember.trim().slice(0, 200);
  }
  return out;
}

/** Proficiency is shown in the tray so the player can see the maths. */
export function profOf(c: Character): number {
  return proficiencyBonus(c).value;
}
