/**
 * What the rules ALLOW at each step. The UI renders these; it never invents them.
 */
import type { Character } from "../model/character";
import { ABILITIES, type Ability } from "../model/character";
import {
  BACKGROUNDS, CLASSES, RACES, backgroundByIndex, classByIndex,
  profRefToSkillIndex, skillByIndex, spellsForClass, type SrdSpell,
} from "../rules/srd";
import { cantripsKnown, highestSpellLevel } from "../rules/derive";

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Point-buy costs, 27 points, scores 8-15. */
const POINT_COST: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};
export const POINT_BUY_BUDGET = 27;

export function pointBuySpend(scores: Record<Ability, number>): number {
  return ABILITIES.reduce((n, a) => n + (POINT_COST[scores[a]] ?? 0), 0);
}

export function pointBuyLegal(score: number): boolean {
  return score in POINT_COST;
}

/** 4d6, drop the lowest. */
export function rollAbility(): number {
  const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6));
  dice.sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
}

export const RACE_OPTIONS = RACES.map((r) => ({ index: r.index, name: r.name }));
export const CLASS_OPTIONS = CLASSES.map((c) => ({ index: c.index, name: c.name }));
export const BACKGROUND_OPTIONS = BACKGROUNDS.map((b) => ({ index: b.index, name: b.name }));

export interface SkillChoice {
  /** how many the class lets you pick */
  choose: number;
  /** the legal set */
  options: { index: string; name: string }[];
  /** granted free by the background, not chosen */
  granted: { index: string; name: string }[];
}

/** The skills this class may pick, and the ones the background simply gives. */
export function skillChoice(classIndex: string | null, backgroundIndex: string | null): SkillChoice {
  const cls = classIndex ? classByIndex.get(classIndex) : undefined;
  const skillGroup = cls?.proficiency_choices?.find((pc) =>
    pc.from?.options?.some((o) => o.item?.index?.startsWith("skill-")),
  );
  const options = (skillGroup?.from.options ?? [])
    .map((o) => profRefToSkillIndex(o.item.index))
    .filter((x): x is string => !!x)
    .map((index) => ({ index, name: skillByIndex.get(index)?.name ?? index }));

  const bg = backgroundIndex ? backgroundByIndex.get(backgroundIndex) : undefined;
  const granted = (bg?.starting_proficiencies ?? [])
    .map((r) => profRefToSkillIndex(r.index))
    .filter((x): x is string => !!x)
    .map((index) => ({ index, name: skillByIndex.get(index)?.name ?? index }));

  return { choose: skillGroup?.choose ?? 0, options, granted };
}

export interface SpellPlan {
  casts: boolean;
  /** "known" classes pick a fixed list; "prepared" classes choose daily from all. */
  style: "known" | "prepared";
  cantrips: number;
  /** how many levelled spells to pick now; 0 for prepared casters */
  spells: number;
  cantripOptions: SrdSpell[];
  spellOptions: SrdSpell[];
  note: string;
}

/** Spells known at level 1 that the SRD tables do not state directly. */
const KNOWN_AT_1: Record<string, number> = {
  bard: 4, sorcerer: 2, warlock: 2, ranger: 0,
};
const PREPARED_CLASSES = new Set(["cleric", "druid", "paladin"]);
/** A wizard's spellbook starts with six. */
const WIZARD_SPELLBOOK_AT_1 = 6;

export function spellPlan(c: Character): SpellPlan {
  const first = c.classes[0];
  const empty: SpellPlan = {
    casts: false, style: "known", cantrips: 0, spells: 0,
    cantripOptions: [], spellOptions: [], note: "",
  };
  if (!first) return empty;
  const idx = first.classIndex;
  const cls = classByIndex.get(idx);
  if (!cls?.spellcasting) return empty;

  const top = Math.max(1, highestSpellLevel(c));
  const all = spellsForClass(idx, top);
  const cantripOptions = all.filter((s) => s.level === 0);
  const spellOptions = all.filter((s) => s.level > 0);

  const prepared = PREPARED_CLASSES.has(idx);
  const cantrips = cantripsKnown(c);

  let spells = 0;
  let note = "";
  if (idx === "wizard") {
    spells = WIZARD_SPELLBOOK_AT_1;
    note = "Six spells to begin your spellbook. You prepare from it each day.";
  } else if (prepared) {
    spells = 0;
    note = `A ${cls.name.toLowerCase()} prepares from the whole list each day, so nothing is chosen now.`;
  } else {
    spells = KNOWN_AT_1[idx] ?? 2;
    note = "These are the spells you know. They do not change until you level.";
  }

  return {
    casts: true,
    style: prepared ? "prepared" : "known",
    cantrips, spells, cantripOptions, spellOptions, note,
  };
}

/** Starting gold by class, in gp — the average of the class's starting funds. */
const START_GOLD: Record<string, number> = {
  barbarian: 50, bard: 125, cleric: 125, druid: 50, fighter: 125,
  monk: 13, paladin: 125, ranger: 125, rogue: 100, sorcerer: 75,
  warlock: 100, wizard: 100,
};

export function startingGold(classIndex: string | null): number {
  return classIndex ? START_GOLD[classIndex] ?? 50 : 0;
}
