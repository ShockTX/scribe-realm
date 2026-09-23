/**
 * Experience buys levels. The sheet never stores a level the XP table
 * does not justify, and a level never arrives without the hit points and
 * the features the SRD already lists for it.
 */
import type { Character } from "../model/character";
import { totalLevel } from "../model/character";
import { maxHp, modifiers } from "./derive";
import { classByIndex, classLevelRow, LEVELS, SUBCLASSES } from "./srd";

/** Index 0 is level 1. Standard 5e thresholds, capped at 20. */
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
] as const;

const SUBCLASS_FEATURES = new Set([
  "Primal Path",
  "Bard College",
  "Divine Domain",
  "Druid Circle",
  "Martial Archetype",
  "Monastic Tradition",
  "Sacred Oath",
  "Ranger Archetype",
  "Roguish Archetype",
  "Sorcerous Origin",
  "Otherworldly Patron",
  "Arcane Tradition",
]);

export function levelFromXp(xp: number): number {
  const n = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (n >= XP_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

/** XP required to reach the next level, or null at 20. */
export function xpToNext(level: number): number | null {
  if (level >= XP_THRESHOLDS.length) return null;
  return XP_THRESHOLDS[level];
}

/** The level at which this class is offered a subclass, from the SRD table. */
export function subclassLevel(classIndex: string): number | null {
  const row = LEVELS.find(
    (l) => l.class?.index === classIndex && l.features.some((f) => SUBCLASS_FEATURES.has(f.name)),
  );
  return row?.level ?? null;
}

export interface SubclassOffer {
  flavor: string;
  options: { index: string; name: string }[];
}

export function subclassOffer(classIndex: string): SubclassOffer | null {
  const options = SUBCLASSES.filter((s) => s.class?.index === classIndex);
  if (!options.length) return null;
  const flavor = (options[0] as { subclass_flavor?: string }).subclass_flavor || "Specialization";
  return {
    flavor,
    options: options.map((s) => ({ index: s.index, name: s.name })),
  };
}

/** True when the character has reached the level and has not chosen. */
export function subclassDue(c: Character): SubclassOffer | null {
  const entry = c.classes[0];
  if (!entry || entry.subclassIndex) return null;
  const at = subclassLevel(entry.classIndex);
  if (at == null || entry.level < at) return null;
  return subclassOffer(entry.classIndex);
}

export interface LevelNote {
  level: number;
  className: string;
  hpGain: number;
  features: string[];
}

/**
 * Raise the first class until total level matches XP.
 * Idempotent: a character already at the right level is returned unchanged.
 * Hit points follow the same average the sheet uses for max HP.
 */
export function applyLevels(c: Character): { character: Character; notes: LevelNote[] } {
  const target = levelFromXp(c.xp ?? 0);
  const now = Math.max(1, totalLevel(c));
  const entry = c.classes[0];
  if (!entry || target <= now) return { character: c, notes: [] };

  const die = classByIndex.get(entry.classIndex)?.hit_die ?? 8;
  const gainPer = Math.max(1, Math.floor(die / 2) + 1 + modifiers(c).con);
  const beforeMax = maxHp(c).value;
  const notes: LevelNote[] = [];
  let level = entry.level;
  const levelsWanted = target - now;
  for (let i = 0; i < levelsWanted && level < 20; i++) {
    level += 1;
    const row = classLevelRow(entry.classIndex, level);
    notes.push({
      level,
      className: classByIndex.get(entry.classIndex)?.name ?? entry.classIndex,
      hpGain: gainPer,
      features: (row?.features ?? []).map((f) => f.name),
    });
  }
  const classes = c.classes.map((e, i) => (i === 0 ? { ...e, level } : e));
  const drafted = { ...c, classes };
  const afterMax = maxHp(drafted).value;
  const gained = Math.max(0, afterMax - beforeMax);
  const baseHp = c.currentHp > 0 ? c.currentHp : beforeMax;
  return {
    character: {
      ...drafted,
      currentHp: Math.min(afterMax, baseHp + gained),
      hitDiceRemaining: c.hitDiceRemaining + notes.length,
    },
    notes,
  };
}

export function chooseSubclass(c: Character, index: string): Character {
  const entry = c.classes[0];
  if (!entry) return c;
  const offer = subclassOffer(entry.classIndex);
  if (!offer?.options.some((o) => o.index === index)) return c;
  const classes = c.classes.map((e, i) => (i === 0 ? { ...e, subclassIndex: index } : e));
  return { ...c, classes };
}
