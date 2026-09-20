/**
 * The character is ONE object. The sheet is a view of it.
 *
 * Three kinds of field, deliberately separated:
 *   ENTERED  - the player types it (name, rolled scores, flaws)
 *   CHOSEN   - picked from a legal set the rules define (skills, spells)
 *   DERIVED  - computed, never stored (modifiers, DC, slots)  -> see rules/derive.ts
 *
 * Anything DERIVED may be overridden by hand via `overrides`, but an override
 * is always visibly marked so homebrew never silently masquerades as maths.
 */

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

export type AbilityScores = Record<Ability, number>;

export interface ClassEntry {
  /** SRD class index, e.g. "wizard" */
  classIndex: string;
  level: number;
  /** SRD subclass index, e.g. "evocation". Null until the class grants one. */
  subclassIndex: string | null;
}

export interface SpellChoices {
  /** SRD spell indexes the character knows or has prepared. */
  known: string[];
  prepared: string[];
}

export interface AttackRow {
  id: string;
  name: string;
  /** free text so a homebrew weapon is never blocked */
  bonus: string;
  damage: string;
  notes: string;
}

export interface Coin {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

/** A derived value the player has deliberately taken manual control of. */
export interface Override {
  value: number;
  /** why, so the sheet can say it out loud */
  note: string;
}

export interface Character {
  /** save-format version, for migration */
  version: 2;
  id: string;

  // --- ENTERED ---
  name: string;
  raceIndex: string | null;
  backgroundIndex: string | null;
  alignmentIndex: string | null;
  /** the six rolled/bought numbers, BEFORE racial bonuses */
  baseScores: AbilityScores;
  personality: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  equipment: string;
  featuresText: string;
  coin: Coin;
  /** current hp is entered; max hp is derived unless overridden */
  currentHp: number;
  tempHp: number;
  hitDiceRemaining: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  inspiration: boolean;
  attacks: AttackRow[];

  // --- WORLD (the town keeps these) ---
  /** shop item ids the character is carrying, with duplicates allowed */
  pack: string[];
  /** in-game day, advanced by sleeping at the inn */
  day: number;
  /** companion ids hired at the Salted Gull */
  companions: string[];
  /** the quest run currently being played, if any */
  activeRun?: unknown;
  /** work taken from the Reach Register board */
  quests: import("../town/quests").Quest[];
  /** what is actually worn, slot -> shop item id */
  equipped: import("../game/gear").Equipped;
  /** gear handed to hires, companion id -> slot map */
  companionGear: Record<string, import("../game/gear").Equipped>;
  /** free notes the player keeps per party member */
  memberNotes: Record<string, string>;

  // --- CHOSEN (constrained by the rules) ---
  classes: ClassEntry[];
  /** SRD skill indexes, e.g. "arcana". Legality checked against class+background. */
  skillProficiencies: string[];
  expertise: string[];
  toolProficiencies: string[];
  languageIndexes: string[];
  spells: SpellChoices;

  // --- ESCAPE HATCH ---
  overrides: Partial<Record<OverridableField, Override>>;
}

export type OverridableField =
  | "maxHp"
  | "armorClass"
  | "speed"
  | "initiative"
  | "proficiencyBonus"
  | "passivePerception"
  | "spellSaveDc"
  | "spellAttackBonus";

export const DEFAULT_SCORES: AbilityScores = {
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
};

export function emptyCharacter(id = crypto.randomUUID()): Character {
  return {
    version: 2,
    id,
    name: "",
    raceIndex: null,
    backgroundIndex: null,
    alignmentIndex: null,
    baseScores: { ...DEFAULT_SCORES },
    personality: "",
    ideals: "",
    bonds: "",
    flaws: "",
    backstory: "",
    equipment: "",
    featuresText: "",
    coin: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    currentHp: 0,
    tempHp: 0,
    hitDiceRemaining: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    inspiration: false,
    attacks: [],
    pack: [],
    quests: [],
    equipped: {},
    companionGear: {},
    memberNotes: {},
    day: 1,
    companions: [],
    classes: [],
    skillProficiencies: [],
    expertise: [],
    toolProficiencies: [],
    languageIndexes: [],
    spells: { known: [], prepared: [] },
    overrides: {},
  };
}

export function totalLevel(c: Character): number {
  return c.classes.reduce((n, e) => n + e.level, 0);
}
