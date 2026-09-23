/**
 * Combat. Real dice, real AC, real spell slots, real potions.
 *
 * No grid, no movement, no opportunity attacks — those are a six-month
 * project and they are not what makes a fight feel like a fight. What makes
 * it feel like a fight is that the numbers on your sheet decide it, and that
 * you can lose.
 *
 * THE RULE: the Warden may say "there are three goblins here". It may not
 * roll for them, set their hit points, or decide whether you hit. All of that
 * happens in this file.
 */

import type { Ability, Character } from "../model/character";
import { totalLevel } from "../model/character";
import {
  armorClass,
  maxHp,
  modifiers,
  proficiencyBonus,
  spellAttackBonus,
  spellSaveDc,
  spellSlots,
} from "../rules/derive";
import { WEAPONS, type WeaponSpec } from "../game/gear";
import { d20, roll } from "./dice";
import { matchFoe, tierCap, type FoeSpec } from "./foes";
import { spellEffect, type SpellEffect } from "./spells";
import { usable } from "./items";

export interface Combatant {
  id: string;
  name: string;
  ac: number;
  hp: number;
  maxHp: number;
  toHit: number;
  damage: string;
  attack: string;
  undead: boolean;
  initiative: number;
  down: boolean;
}

export interface CombatLine {
  round: number;
  /** who acted */
  who: "you" | "them";
  text: string;
  die?: number;
  total?: number;
  against?: number;
  hit?: boolean;
  damage?: number;
  crit?: boolean;
}

export interface CombatState {
  foes: Combatant[];
  round: number;
  /** slots spent this fight, by level index (1-based at [1]) */
  slotsUsed: number[];
  /** item ids consumed this fight */
  consumed: string[];
  /** temporary AC from a buff, and how many rounds remain */
  wardAc: number;
  wardRounds: number;
  /** next weapon hit gets this extra damage */
  coating: string | null;
  log: CombatLine[];
  over: null | "won" | "fled" | "down";
  /** damage the player has taken this fight, applied to the character */
  hpNow: number;
}

/** Parse "2d6+3" or "1d8" or "4". */
export function rollDice(expr: string): number {
  let total = 0;
  const cleaned = expr.replace(/\s+/g, "");
  const re = /([+-]?)(\d*)d(\d+)|([+-]?\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    if (m[3]) {
      const sign = m[1] === "-" ? -1 : 1;
      const times = m[2] ? parseInt(m[2], 10) : 1;
      total += sign * roll(parseInt(m[3], 10), times);
    } else if (m[4]) {
      total += parseInt(m[4], 10);
    }
  }
  return Math.max(0, total);
}

/** Max of an expression, used only to show the player what a thing can do. */
export function maxOf(expr: string): number {
  let total = 0;
  const re = /([+-]?)(\d*)d(\d+)|([+-]?\d+)/g;
  let m: RegExpExecArray | null;
  const cleaned = expr.replace(/\s+/g, "");
  while ((m = re.exec(cleaned))) {
    if (m[3]) {
      const sign = m[1] === "-" ? -1 : 1;
      const times = m[2] ? parseInt(m[2], 10) : 1;
      total += sign * times * parseInt(m[3], 10);
    } else if (m[4]) total += parseInt(m[4], 10);
  }
  return total;
}

function foeToCombatant(spec: FoeSpec, n: number): Combatant {
  return {
    id: `${spec.id}-${n}`,
    name: n > 1 ? `${spec.name} ${n}` : spec.name,
    ac: spec.ac,
    hp: spec.hp,
    maxHp: spec.hp,
    toHit: spec.toHit,
    damage: spec.damage,
    attack: spec.attack,
    undead: !!spec.undead,
    initiative: d20() + 1,
    down: false,
  };
}

/**
 * Start a fight. The Warden names the enemy and how many; we clamp both to
 * something a character of this level can survive.
 */
export function beginCombat(c: Character, foeName: string, count: number): CombatState {
  const level = totalLevel(c) || 1;
  let spec = matchFoe(foeName);
  const cap = tierCap(level);
  if (spec.tier > cap) {
    // Too big for this character: step it down rather than kill them for the
    // model's sake.
    spec = matchFoe(cap === 1 ? "bandit" : "hobgoblin");
  }
  const howMany = Math.max(1, Math.min(level >= 3 ? 4 : 3, Math.round(count) || 1));
  return {
    foes: Array.from({ length: howMany }, (_, i) => foeToCombatant(spec, i + 1)),
    round: 1,
    slotsUsed: [0, 0, 0, 0, 0, 0],
    consumed: [],
    wardAc: 0,
    wardRounds: 0,
    coating: null,
    log: [
      {
        round: 1,
        who: "them",
        text: `${howMany > 1 ? `${howMany} ${spec.name.toLowerCase()}s` : spec.name} — and no way round it.`,
      },
    ],
    over: null,
    hpNow: c.currentHp || maxHp(c).value,
  };
}

export function livingFoes(s: CombatState): Combatant[] {
  return s.foes.filter((f) => !f.down);
}

/** Your AC, including anything you have cast on yourself this fight. */
export function playerAc(c: Character, s: CombatState): number {
  return armorClass(c).value + (s.wardRounds > 0 ? s.wardAc : 0);
}

/** The weapon you are actually holding, or your fists. */
export function activeWeapon(c: Character): { id: string; spec: WeaponSpec } | null {
  const id = c.equipped.mainHand;
  if (!id) return null;
  const spec = WEAPONS[id];
  return spec ? { id, spec } : null;
}

export function weaponAbility(spec: WeaponSpec, mods: Record<Ability, number>): Ability {
  if (spec.uses === "finesse") return mods.dex >= mods.str ? "dex" : "str";
  return spec.uses;
}

/** What the player may do this round, given sheet, pack and slots. */
export interface Option {
  kind: "attack" | "spell" | "item" | "defend" | "flee";
  id: string;
  label: string;
  detail: string;
  /** spell level, for slot spending */
  level?: number;
  disabled?: string;
}

export function optionsFor(c: Character, s: CombatState): Option[] {
  const mods = modifiers(c);
  const out: Option[] = [];

  const w = activeWeapon(c);
  if (w) {
    const ab = weaponAbility(w.spec, mods);
    const bonus = mods[ab] + proficiencyBonus(c).value;
    out.push({
      kind: "attack",
      id: w.id,
      label: `Attack with your ${w.id.replace(/-/g, " ")}`,
      detail: `${bonus >= 0 ? "+" : ""}${bonus} to hit, ${w.spec.damage}${s.coating ? ` +${s.coating} poison` : ""}`,
    });
  } else {
    out.push({
      kind: "attack",
      id: "unarmed",
      label: "Strike with your fists",
      detail: `${mods.str >= 0 ? "+" : ""}${mods.str + proficiencyBonus(c).value} to hit, 1 damage`,
    });
  }

  const slots = spellSlots(c);
  const known = [...new Set([...c.spells.known, ...c.spells.prepared])];
  for (const idx of known) {
    const e = spellEffect(idx);
    if (!e) continue;
    const used = s.slotsUsed[e.level] ?? 0;
    const have = e.level === 0 ? Infinity : (slots[e.level - 1] ?? 0) - used;
    out.push({
      kind: "spell",
      id: e.index,
      level: e.level,
      label: `Cast ${e.name}`,
      detail:
        e.level === 0
          ? `Cantrip · ${describeSpell(e)}`
          : `Level ${e.level} · ${have} slot${have === 1 ? "" : "s"} left · ${describeSpell(e)}`,
      disabled: have <= 0 ? "No slots left" : undefined,
    });
  }

  const counts = new Map<string, number>();
  for (const id of c.pack) if (usable(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, count] of counts) {
    const spent = s.consumed.filter((x) => x === id).length;
    const left = count - spent;
    const u = usable(id)!;
    out.push({
      kind: "item",
      id,
      label: u.verb,
      detail: `${left} left · ${u.blurb}`,
      disabled: left <= 0 ? "None left" : undefined,
    });
  }

  out.push({ kind: "defend", id: "defend", label: "Guard yourself", detail: "+2 AC until your next turn" });
  out.push({ kind: "flee", id: "flee", label: "Get out", detail: "Dexterity check — leave the fight, and the work" });
  return out;
}

function describeSpell(e: SpellEffect): string {
  if (e.shape === "heal") return `heals ${e.dice}`;
  if (e.shape === "buff") return `+${e.acBonus} AC for ${e.rounds} rounds`;
  if (e.shape === "save") return `${e.dice}, ${e.save?.toUpperCase()} save${e.areaOfEffect ? ", all of them" : ""}`;
  return `${e.dice} on a hit`;
}

function damageFoe(s: CombatState, target: Combatant, amount: number): void {
  target.hp -= amount;
  if (target.hp <= 0) {
    target.hp = 0;
    target.down = true;
  }
}

function firstStanding(s: CombatState): Combatant | undefined {
  return s.foes.find((f) => !f.down);
}

/** The player's turn. Returns the state after; never mutates the argument. */
export function playerTurn(
  c: Character,
  state: CombatState,
  option: Option,
): CombatState {
  const s: CombatState = {
    ...state,
    foes: state.foes.map((f) => ({ ...f })),
    log: [...state.log],
    slotsUsed: [...state.slotsUsed],
    consumed: [...state.consumed],
  };
  const mods = modifiers(c);
  const prof = proficiencyBonus(c).value;
  const hpMax = maxHp(c).value;
  const target = firstStanding(s);

  if (option.kind === "flee") {
    const die = d20();
    const total = die + mods.dex;
    const ok = total >= 12;
    s.log.push({
      round: s.round,
      who: "you",
      text: ok ? "You break away and do not look back." : "You turn to run and something catches your arm.",
      die,
      total,
      against: 12,
      hit: ok,
    });
    if (ok) {
      s.over = "fled";
      return s;
    }
  } else if (option.kind === "defend") {
    s.wardAc = Math.max(s.wardAc, 2);
    s.wardRounds = 1;
    s.log.push({ round: s.round, who: "you", text: "You set your feet and cover up." });
  } else if (option.kind === "attack" && target) {
    const w = activeWeapon(c);
    const ab = w ? weaponAbility(w.spec, mods) : "str";
    const bonus = mods[ab] + prof;
    const die = d20();
    const total = die + bonus;
    const crit = die === 20;
    const hit = crit || (die !== 1 && total >= target.ac);
    let dmg = 0;
    if (hit) {
      const expr = w ? w.spec.damage.replace(/\s.*$/, "") : "1";
      dmg = rollDice(expr) + mods[ab];
      if (crit) dmg += rollDice(expr);
      if (s.coating) {
        dmg += rollDice(s.coating);
        s.coating = null;
      }
      dmg = Math.max(1, dmg);
      damageFoe(s, target, dmg);
    }
    s.log.push({
      round: s.round,
      who: "you",
      text: hit
        ? `You ${crit ? "land it perfectly on" : "hit"} the ${target.name.toLowerCase()}${target.down ? " and it goes down" : ""}.`
        : die === 1
          ? "Your swing goes wide enough to hurt your shoulder."
          : `The ${target.name.toLowerCase()} turns your blade.`,
      die,
      total,
      against: target.ac,
      hit,
      damage: hit ? dmg : undefined,
      crit,
    });
  } else if (option.kind === "spell") {
    const e = spellEffect(option.id);
    if (e) {
      if (e.level > 0) s.slotsUsed[e.level] = (s.slotsUsed[e.level] ?? 0) + 1;
      if (e.shape === "heal") {
        const healed = rollDice(e.dice ?? "1d4");
        s.hpNow = Math.min(hpMax, s.hpNow + healed);
        s.log.push({ round: s.round, who: "you", text: `${e.name}. ${e.blurb} You recover ${healed}.`, damage: -healed });
      } else if (e.shape === "buff") {
        s.wardAc = Math.max(s.wardAc, e.acBonus ?? 1);
        s.wardRounds = e.rounds ?? 3;
        s.log.push({ round: s.round, who: "you", text: `${e.name}. ${e.blurb}` });
      } else if (e.shape === "save" && target) {
        const dc = spellSaveDc(c)?.value ?? 10 + prof;
        const victims = e.areaOfEffect ? livingFoes(s) : [target];
        const base = rollDice(e.dice ?? "1d6");
        for (const v of victims) {
          const die = d20();
          const saved = die + 1 >= dc;
          const dmg = saved ? (e.halfOnSave ? Math.floor(base / 2) : 0) : base;
          if (dmg > 0) damageFoe(s, v, dmg);
          s.log.push({
            round: s.round,
            who: "you",
            text: `${e.name} catches the ${v.name.toLowerCase()} — it ${saved ? "rides most of it out" : "takes it full"}${v.down ? " and drops" : ""}.`,
            die,
            total: die + 1,
            against: dc,
            hit: !saved,
            damage: dmg || undefined,
          });
        }
      } else if (target) {
        const atk = spellAttackBonus(c)?.value ?? prof;
        const auto = e.index === "magic-missile";
        const die = d20();
        const total = die + atk;
        const crit = die === 20;
        const hit = auto || crit || (die !== 1 && total >= target.ac);
        let dmg = 0;
        if (hit) {
          dmg = rollDice(e.dice ?? "1d8");
          if (crit) dmg += rollDice(e.dice ?? "1d8");
          damageFoe(s, target, dmg);
        }
        s.log.push({
          round: s.round,
          who: "you",
          text: hit
            ? `${e.name}. ${e.blurb} It strikes the ${target.name.toLowerCase()}${target.down ? ", and that is that" : ""}.`
            : `${e.name} goes wide of the ${target.name.toLowerCase()}.`,
          die: auto ? undefined : die,
          total: auto ? undefined : total,
          against: auto ? undefined : target.ac,
          hit,
          damage: hit ? dmg : undefined,
          crit,
        });
      }
    }
  } else if (option.kind === "item") {
    const u = usable(option.id);
    if (u) {
      s.consumed.push(option.id);
      if (u.heal) {
        const healed = rollDice(u.heal);
        s.hpNow = Math.min(hpMax, s.hpNow + healed);
        s.log.push({ round: s.round, who: "you", text: `${u.verb}. ${u.blurb} You recover ${healed}.`, damage: -healed });
      } else if (u.weaponBonus) {
        s.coating = u.weaponBonus;
        s.log.push({ round: s.round, who: "you", text: `${u.verb}. Your next hit carries it.` });
      } else if (u.damage && target) {
        const dc = 12;
        const die = d20();
        const saved = die + 1 >= dc;
        let dmg = saved ? Math.floor(rollDice(u.damage) / 2) : rollDice(u.damage);
        if (u.vsUndead && target.undead) dmg *= 2;
        if (dmg > 0) damageFoe(s, target, dmg);
        s.log.push({
          round: s.round,
          who: "you",
          text: `${u.verb}. It bursts over the ${target.name.toLowerCase()}${target.down ? ", and it falls" : ""}.`,
          die,
          total: die + 1,
          against: dc,
          hit: !saved,
          damage: dmg,
        });
      }
    }
  }

  if (livingFoes(s).length === 0) {
    s.over = "won";
    return s;
  }
  return foesTurn(c, s);
}

/** Their turn. Every attack is rolled against your real armour class. */
function foesTurn(c: Character, state: CombatState): CombatState {
  const s = state;
  const ac = armorClass(c).value + (s.wardRounds > 0 ? s.wardAc : 0);
  for (const f of livingFoes(s)) {
    const die = d20();
    const total = die + f.toHit;
    const crit = die === 20;
    const hit = crit || (die !== 1 && total >= ac);
    let dmg = 0;
    if (hit) {
      dmg = rollDice(f.damage);
      if (crit) dmg += rollDice(f.damage.replace(/[+-]\d+$/, ""));
      s.hpNow = Math.max(0, s.hpNow - dmg);
    }
    s.log.push({
      round: s.round,
      who: "them",
      text: hit
        ? `${f.name}: ${f.attack.toLowerCase()} — ${crit ? "and it lands badly" : "it gets through"}.`
        : `${f.name}: ${f.attack.toLowerCase()} — turned aside.`,
      die,
      total,
      against: ac,
      hit,
      damage: hit ? dmg : undefined,
      crit,
    });
    if (s.hpNow <= 0) {
      s.over = "down";
      return s;
    }
  }
  if (s.wardRounds > 0) s.wardRounds -= 1;
  if (s.wardRounds === 0) s.wardAc = 0;
  s.round += 1;
  if (s.round > 12) s.over = "fled";
  return s;
}

/** Write the fight back onto the character: hp, slots spent, items used. */
export function applyCombat(c: Character, s: CombatState): Character {
  const pack = [...c.pack];
  for (const id of s.consumed) {
    const i = pack.indexOf(id);
    if (i >= 0) pack.splice(i, 1);
  }
  return { ...c, currentHp: s.hpNow, pack };
}

/** One line for the Warden, so it narrates a fact rather than a guess. */
export function combatSummary(s: CombatState): string {
  const killed = s.foes.filter((f) => f.down).length;
  if (s.over === "won") return `The fight is over. You killed ${killed} of them and you are on ${s.hpNow} hit points.`;
  if (s.over === "fled") return `You broke off and got clear, leaving ${s.foes.length - killed} of them standing.`;
  return `You went down. They were still standing.`;
}
