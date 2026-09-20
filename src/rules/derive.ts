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

/** Base scores plus racial bonuses. This is the number on the sheet. */
export function finalScores(c: Character): AbilityScores {
  const out = { ...c.baseScores };
  const race = c.raceIndex ? raceByIndex.get(c.raceIndex) : undefined;
  for (const b of race?.ability_bonuses ?? []) {
    const key = b.ability_score?.index as Ability | undefined;
    if (key && key in out) out[key] += b.bonus;
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
  return withOverride(c, "speed", race?.speed ?? 30);
}

/** Unarmoured: 10 + dex. Armour is bought in town and layered on later. */
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

/** The two saves the first class grants. */
export function savingThrowProficiencies(c: Character): Ability[] {
  const first = c.classes[0];
  if (!first) return [];
  const cls = classByIndex.get(first.classIndex);
  return (cls?.saving_throws ?? [])
    .map((r) => r.index as Ability)
    .filter((a) => ABILITIES.includes(a));
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

/** The ability a class casts with, or null if it does not cast. */
export function castingAbility(c: Character): Ability | null {
  const first = c.classes[0];
  if (!first) return null;
  const cls = classByIndex.get(first.classIndex);
  const idx = cls?.spellcasting?.spellcasting_ability?.index;
  return idx && ABILITIES.includes(idx as Ability) ? (idx as Ability) : null;
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

/** Slots per spell level, from the class's own table. */
export function spellSlots(c: Character): number[] {
  const first = c.classes[0];
  if (!first) return [];
  const row = classLevelRow(first.classIndex, first.level);
  const sc = row?.spellcasting;
  if (!sc) return [];
  const out: number[] = [];
  for (let lvl = 1; lvl <= 9; lvl++) {
    out.push(Number(sc[`spell_slots_level_${lvl}`] ?? 0));
  }
  return out;
}

export function highestSpellLevel(c: Character): number {
  const slots = spellSlots(c);
  let top = 0;
  slots.forEach((n, i) => { if (n > 0) top = i + 1; });
  return top;
}

export function cantripsKnown(c: Character): number {
  const first = c.classes[0];
  if (!first) return 0;
  const row = classLevelRow(first.classIndex, first.level);
  return Number(row?.spellcasting?.cantrips_known ?? 0);
}

export function hitDie(c: Character): number {
  const first = c.classes[0];
  return classByIndex.get(first?.classIndex ?? "")?.hit_die ?? 8;
}

export function spellName(index: string): string {
  return spellByIndex.get(index)?.name ?? index;
}
