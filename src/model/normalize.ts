/**
 * Saves written before the town existed lack pack/day/companions, yet still
 * claim version 2. Reading them blanked the screen. Anything loaded from
 * storage goes through here first, so a missing field is a default, never a
 * crash.
 */
import { DEFAULT_SCORES, emptyCharacter, type Character } from "./character";

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function list<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function normalize(raw: unknown): Character | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<Character> & Record<string, unknown>;
  if (typeof c.name !== "string" || !c.name) return null;

  const base = emptyCharacter();
  if (typeof c.id === "string" && c.id) base.id = c.id as Character["id"];

  return {
    ...base,
    ...c,
    version: 2,
    name: c.name,
    baseScores: { ...DEFAULT_SCORES, ...(c.baseScores ?? {}) },
    coin: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...(c.coin ?? {}) },
    pack: list<string>(c.pack),
    companions: list<string>(c.companions),
    quests: list(c.quests),
    equipped: (c.equipped && typeof c.equipped === "object" ? c.equipped : {}) as Character["equipped"],
    companionGear: (c.companionGear && typeof c.companionGear === "object" ? c.companionGear : {}) as Character["companionGear"],
    memberNotes: (c.memberNotes && typeof c.memberNotes === "object" ? c.memberNotes : {}) as Character["memberNotes"],
    attacks: list(c.attacks),
    classes: list(c.classes),
    skillProficiencies: list<string>(c.skillProficiencies),
    expertise: list<string>(c.expertise),
    toolProficiencies: list<string>(c.toolProficiencies),
    languageIndexes: list<string>(c.languageIndexes),
    spells: {
      known: list<string>(c.spells?.known),
      prepared: list<string>(c.spells?.prepared),
    },
    overrides: (c.overrides ?? {}) as Character["overrides"],
    day: Math.max(1, num(c.day, 1)),
    currentHp: num(c.currentHp, 0),
    tempHp: num(c.tempHp, 0),
    hitDiceRemaining: num(c.hitDiceRemaining, 1),
    deathSaveSuccesses: num(c.deathSaveSuccesses, 0),
    deathSaveFailures: num(c.deathSaveFailures, 0),
    inspiration: c.inspiration === true,
  } as Character;
}
