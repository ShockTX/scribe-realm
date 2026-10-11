/**
 * The derivation engine: everything the player must never type.
 *
 * Every function here takes the Character and returns a number the rules
 * dictate. If the player has set an override, that wins — but the caller is
 * told, so the sheet can mark it as off-the-rails.
 */
import {
  ABILITIES, type Ability, type AbilityScores, type Character,
  type OverridableField, totalLevel,
} from "../model/character";
import {
  classByIndex, classLevelRow, raceByIndex, skillByIndex, spellByIndex,
} from "./srd";
import { ARMOR } from "../game/gear";

export interface Derived<T = number> {
  value: T;
  /** true when the player has taken manual control of this number */
  overridden: boolean;
  note?: string;
}

function withOverride(c: Character, field: OverridableField, computed: number): Derived {
  const o = c.overrides[field];
  if (o) return { value: o.value, overridden: true, note: o.note };
  return { value: computed, overridden: false };
}

/** -5 at score 1, +0 at 10-11, +5 at 20. */
export function modifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Base scores plus racial bonuses. This is the number on the sheet.
 * Fixed `ability_bonuses` apply first; then `ability_bonus_options`
 * (e.g. half-elf choose-2, +1 each) apply up to `choose` entries from
 * `c.racialBonusChoices` when they name a valid ability. Invalid or extra
 * picks are ignored so older saves without the field keep working. */
export function finalScores(c: Character): AbilityScores {
  const out = { ...c.baseScores };
  const race = c.raceIndex ? raceByIndex.get(c.raceIndex) : undefined;
  for (const b of race?.ability_bonuses ?? []) {
    const key = b.ability_score?.index as Ability | undefined;
    if (key && key in out) out[key] += b.bonus;
  }
  const opts = race?.ability_bonus_options;
  if (opts && opts.choose > 0) {
    const picks = (c.racialBonusChoices ?? []).slice(0, opts.choose);
    for (const p of picks) {
      if (!ABILITIES.includes(p as Ability) || !(p in out)) continue;
      const key = p as Ability;
      const opt = opts.from?.options?.find((o) => o.ability_score?.index === key);
      out[key] += opt?.bonus ?? 1;
    }
  }
  return out;
}

export function modifiers(c: Character): Record<Ability, number> {
  const s = finalScores(c);
  const out = {} as Record<Ability, number>;
  for (const a of ABILITIES) out[a] = modifier(s[a]);
  return out;
}

/** +2 at levels 1-4, rising every four levels to +6. */
export function proficiencyBonus(c: Character): Derived {
  const lvl = Math.max(1, totalLevel(c));
  return withOverride(c, "proficiencyBonus", 2 + Math.floor((lvl - 1) / 4));
}

/** First level is a full hit die; later levels take the class average. */
/**
 * The character's current hit points, always a real number in [0, max].
 *
 * Use this and never `c.currentHp || maxHp(c).value`. Zero is falsy in
 * JavaScript, so that idiom silently read a character who had just been
 * dropped to 0 as undamaged — which is why going down in a fight used to
 * cost nothing. Absent-field saves are repaired in normalize(), not here.
 */
export function hpOf(c: Character): number {
  const max = maxHp(c).value;
  const now = typeof c.currentHp === "number" && Number.isFinite(c.currentHp) ? c.currentHp : max;
  return Math.max(0, Math.min(max, now));
}

export function maxHp(c: Character): Derived {
  const con = modifiers(c).con;
  let hp = 0;
  let first = true;
  for (const entry of c.classes) {
    const die = classByIndex.get(entry.classIndex)?.hit_die ?? 8;
    for (let i = 0; i < entry.level; i++) {
      hp += (first ? die : Math.floor(die / 2) + 1) + con;
      first = false;
    }
  }
  return withOverride(c, "maxHp", Math.max(1, hp));
}

export function speed(c: Character): Derived {
  const race = c.raceIndex ? raceByIndex.get(c.raceIndex) : undefined;
  let value = race?.speed ?? 30;
  const body = c.equipped?.armor ? ARMOR[c.equipped.armor] : undefined;
  if (body?.minStr && finalScores(c).str < body.minStr) value = Math.max(0, value - 10);
  return withOverride(c, "speed", value);
}

/**
 * Unarmoured 10 + dex, or a hand-set override.
 * Worn armour is heroArmorClass in game/party.ts. A fight must use that.
 */
export function armorClass(c: Character): Derived {
  return withOverride(c, "armorClass", 10 + modifiers(c).dex);
}

export function initiative(c: Character): Derived {
  return withOverride(c, "initiative", modifiers(c).dex);
}

export function passivePerception(c: Character): Derived {
  const prof = proficiencyBonus(c).value;
  const trained = c.skillProficiencies.includes("perception") ? prof : 0;
  return withOverride(c, "passivePerception", 10 + modifiers(c).wis + trained);
}

/** The saves every class grants, unioned and deduped (multiclass-safe). */
export function savingThrowProficiencies(c: Character): Ability[] {
  if (!c.classes.length) return [];
  const out: Ability[] = [];
  for (const entry of c.classes) {
    const cls = classByIndex.get(entry.classIndex);
    for (const r of cls?.saving_throws ?? []) {
      const a = r.index as Ability;
      if (ABILITIES.includes(a) && !out.includes(a)) out.push(a);
    }
  }
  return out;
}

export function savingThrow(c: Character, ability: Ability): { bonus: number; proficient: boolean } {
  const proficient = savingThrowProficiencies(c).includes(ability);
  const bonus = modifiers(c)[ability] + (proficient ? proficiencyBonus(c).value : 0);
  return { bonus, proficient };
}

export function skillBonus(c: Character, skillIndex: string): { bonus: number; proficient: boolean } {
  const skill = skillByIndex.get(skillIndex);
  const ability = (skill?.ability_score?.index ?? "dex") as Ability;
  const proficient = c.skillProficiencies.includes(skillIndex);
  const expert = c.expertise.includes(skillIndex);
  const prof = proficiencyBonus(c).value;
  const bonus =
    modifiers(c)[ability] + (proficient ? prof : 0) + (expert ? prof : 0);
  return { bonus, proficient };
}

/** The ability a class casts with, or null if it does not cast.
 * Multiclass: the first class entry with a spellcasting ability wins. */
export function castingAbility(c: Character): Ability | null {
  for (const entry of c.classes) {
    const cls = classByIndex.get(entry.classIndex);
    const idx = cls?.spellcasting?.spellcasting_ability?.index;
    if (idx && ABILITIES.includes(idx as Ability)) return idx as Ability;
  }
  return null;
}

export function spellSaveDc(c: Character): Derived | null {
  const a = castingAbility(c);
  if (!a) return null;
  return withOverride(c, "spellSaveDc", 8 + proficiencyBonus(c).value + modifiers(c)[a]);
}

export function spellAttackBonus(c: Character): Derived | null {
  const a = castingAbility(c);
  if (!a) return null;
  return withOverride(c, "spellAttackBonus", proficiencyBonus(c).value + modifiers(c)[a]);
}

/** Slots per spell level, from the class's own table.
 * Single class: that class's row. Multiclass: the richest single-class row
 * among the entries (by total slots, then highest level) — a documented
 * simplification that avoids an empty sheet without implementing the full
 * multiclass spellcasting table. */
export function spellSlots(c: Character): number[] {
  if (!c.classes.length) return [];
  const rows = c.classes.map((e) => {
    const row = classLevelRow(e.classIndex, e.level);
    const sc = row?.spellcasting;
    if (!sc) return { total: 0, top: 0, slots: [] as number[] };
    const slots: number[] = [];
    for (let lvl = 1; lvl <= 9; lvl++) {
      slots.push(Number(sc[`spell_slots_level_${lvl}`] ?? 0));
    }
    let top = 0;
    slots.forEach((n, i) => { if (n > 0) top = i + 1; });
    return { total: slots.reduce((a, b) => a + b, 0), top, slots };
  });
  let best = rows[0];
  for (const r of rows) {
    if (r.total > best.total || (r.total === best.total && r.top > best.top)) best = r;
  }
  return best.slots;
}

export function highestSpellLevel(c: Character): number {
  const slots = spellSlots(c);
  let top = 0;
  slots.forEach((n, i) => { if (n > 0) top = i + 1; });
  return top;
}

export function cantripsKnown(c: Character): number {
  let best = 0;
  for (const entry of c.classes) {
    const row = classLevelRow(entry.classIndex, entry.level);
    best = Math.max(best, Number(row?.spellcasting?.cantrips_known ?? 0));
  }
  return best;
}

/** First class's die; empty character falls back to d8, never crashes. */
export function hitDie(c: Character): number {
  const first = c.classes[0];
  return classByIndex.get(first?.classIndex ?? "")?.hit_die ?? 8;
}

export function spellName(index: string): string {
  return spellByIndex.get(index)?.name ?? index;
}
