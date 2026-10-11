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
import { finalScores, modifiers, proficiencyBonus, skillBonus } from "../rules/derive";
import { ARMOR } from "../game/gear";
import { itemById } from "../town/shops";

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

/** Keep the lower of two dice when armour or a close-range bow hinders the roll. */
export function attackDie(disadvantage: boolean): number {
  const first = d20();
  if (!disadvantage) return first;
  return Math.min(first, d20());
}

/** Stealth in noisy armour, or dexterity while under-strength in heavy armour. */
export function armourHinders(c: Character, req: CheckRequest): boolean {
  const body = c.equipped?.armor ? ARMOR[c.equipped.armor] : undefined;
  if (!body) return false;
  if (req.skill === "stealth" && body.stealthPenalty) return true;
  if (req.ability === "dex" && body.minStr != null && finalScores(c).str < body.minStr) return true;
  return false;
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
  const hindered = armourHinders(c, req);
  const die = attackDie(hindered);
  const { bonus, label } = bonusFor(c, req);
  const total = die + bonus;
  let outcome: Outcome;
  if (die === 20) outcome = "critical";
  else if (die === 1) outcome = "fumble";
  else if (total >= req.dc) outcome = "success";
  else if (total >= req.dc - 2) outcome = "partial";
  else outcome = "failure";
  return {
    die,
    bonus,
    total,
    dc: req.dc,
    outcome,
    label: hindered ? `${label}, hindered by armour` : label,
  };
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
  const now = Math.max(0, Math.min(maxHpValue, c.currentHp ?? maxHpValue));
  const hp = Math.max(0, Math.min(maxHpValue, now + (con.hp ?? 0)));
  const gp = Math.max(0, c.coin.gp + (con.gp ?? 0));
  return {
    ...c,
    currentHp: hp,
    coin: { ...c.coin, gp },
    pack: con.gain?.length ? [...c.pack, ...con.gain] : c.pack,
  };
}

/** Clamp whatever the model returned into a sane consequence.
 *
 * Caps for a CHECKED beat (the GM asked for a roll and the engine made it):
 * - hp: +/-(4 + 3 per level) — a single beat can never gut a character.
 * - gp: +/-100 per level — about two-fifths of a fair job, so a beat can
 *   pay for gear but never for a house.
 * - gain: at most 3 items, and only catalogue ids (see the gain filter).
 * - remember: one trimmed line, 200 chars.
 */
export function readConsequence(raw: unknown, level: number): Consequence {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const cap = 4 + level * 3; // a single beat can never gut a character
  // About two-fifths of a fair job, so a beat can pay for gear.
  const goldCap = 100 * level;
  const out: Consequence = {};
  if (typeof r.hp === "number" && Number.isFinite(r.hp)) {
    out.hp = Math.max(-cap, Math.min(cap, Math.round(r.hp)));
  }
  if (typeof r.gp === "number" && Number.isFinite(r.gp)) {
    out.gp = Math.max(-goldCap, Math.min(goldCap, Math.round(r.gp)));
  }
  if (Array.isArray(r.gain)) {
    // Inventory is a clamped resource too. The Warden may hand over a thing
    // that exists in a shop's catalogue; it may not conjure a "sunblade",
    // which would sit in the pack unsellable, unequippable and unusable.
    out.gain = r.gain
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter((x) => !!itemById(x))
      .slice(0, 3);
    if (!out.gain.length) delete out.gain;
  }
  if (typeof r.remember === "string" && r.remember.trim()) {
    out.remember = r.remember.trim().slice(0, 200);
  }
  return out;
}

/**
 * Clamp a NO-CHECK beat (the GM asked for no roll; the action "simply
 * happens"). Free narration must not be a farm: unchecked beats pay at most
 * a quarter of the checked caps — gp capped at 25 per level, hp at
 * (2 + level), and a single item. Anything worth more than that is, by
 * definition, worth asking for a check.
 */
export function readConsequenceNoCheck(raw: unknown, level: number): Consequence {
  const con = readConsequence(raw, level);
  const out: Consequence = { ...con };
  const goldCap = 25 * level;
  if (typeof out.gp === "number") {
    out.gp = Math.max(-goldCap, Math.min(goldCap, out.gp));
  }
  const hpCap = 2 + level;
  if (typeof out.hp === "number") {
    out.hp = Math.max(-hpCap, Math.min(hpCap, out.hp));
  }
  // readConsequence already allows 3; a free beat carries at most one thing.
  if (out.gain) {
    out.gain = out.gain.slice(0, 1);
    if (!out.gain.length) delete out.gain;
  }
  return out;
}

/** Proficiency is shown in the tray so the player can see the maths. */
export function profOf(c: Character): number {
  return proficiencyBonus(c).value;
}
