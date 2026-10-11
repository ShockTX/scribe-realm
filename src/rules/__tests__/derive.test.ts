import { describe, it, expect } from "vitest";
import { emptyCharacter } from "../../model/character";
import {
  cantripsKnown, castingAbility, finalScores, hitDie,
  savingThrowProficiencies, spellSlots,
} from "../derive";

function hero() {
  const c = emptyCharacter();
  c.name = "T";
  c.baseScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  return c;
}

describe("finalScores racial options", () => {
  it("applies half-elf choose-2 after the fixed cha bonus", () => {
    const c = hero();
    c.raceIndex = "half-elf";
    c.racialBonusChoices = ["str", "dex"];
    const s = finalScores(c);
    expect(s.cha).toBe(12);
    expect(s.str).toBe(11);
    expect(s.dex).toBe(11);
    expect(s.con).toBe(10);
  });

  it("ignores invalid picks and caps at choose", () => {
    const c = hero();
    c.raceIndex = "half-elf";
    c.racialBonusChoices = ["str", "bogus" as never, "dex", "con"];
    const s = finalScores(c);
    // Only the first two entries are read; the bogus one is skipped.
    expect(s.str).toBe(11);
    expect(s.dex).toBe(10);
    expect(s.con).toBe(10);
    expect(s.cha).toBe(12);
  });

  it("stays back-compatible when the field is absent", () => {
    const c = hero();
    c.raceIndex = "half-elf";
    expect(finalScores(c).cha).toBe(12);
    expect(finalScores(c).str).toBe(10);
  });
});

describe("multiclass derivation", () => {
  it("unions saves across classes without duplicates", () => {
    const c = hero();
    c.classes = [
      { classIndex: "fighter", level: 1, subclassIndex: null },
      { classIndex: "wizard", level: 1, subclassIndex: null },
    ];
    expect(savingThrowProficiencies(c).sort()).toEqual(["con", "int", "str", "wis"]);
  });

  it("dedups overlapping saves", () => {
    const c = hero();
    c.classes = [
      { classIndex: "wizard", level: 1, subclassIndex: null },
      { classIndex: "wizard", level: 1, subclassIndex: null },
    ];
    expect(savingThrowProficiencies(c).sort()).toEqual(["int", "wis"]);
  });

  it("castingAbility returns the first class that can cast", () => {
    const c = hero();
    c.classes = [
      { classIndex: "fighter", level: 1, subclassIndex: null },
      { classIndex: "wizard", level: 1, subclassIndex: null },
    ];
    expect(castingAbility(c)).toBe("int");
    const m = hero();
    m.classes = [{ classIndex: "fighter", level: 1, subclassIndex: null }];
    expect(castingAbility(m)).toBeNull();
    expect(castingAbility(hero())).toBeNull();
  });

  it("spellSlots uses the richest single-class row for multiclass", () => {
    const c = hero();
    c.classes = [
      { classIndex: "fighter", level: 1, subclassIndex: null },
      { classIndex: "wizard", level: 1, subclassIndex: null },
    ];
    // Fighter has no row; wizard L1 has two 1st-level slots.
    expect(spellSlots(c)[0]).toBe(2);
    const single = hero();
    single.classes = [{ classIndex: "wizard", level: 1, subclassIndex: null }];
    expect(spellSlots(single)).toEqual(spellSlots(c));
    expect(spellSlots(hero())).toEqual([]);
  });

  it("cantripsKnown is the max across classes", () => {
    const c = hero();
    c.classes = [
      { classIndex: "fighter", level: 1, subclassIndex: null },
      { classIndex: "wizard", level: 1, subclassIndex: null },
    ];
    expect(cantripsKnown(c)).toBe(3);
    expect(cantripsKnown(hero())).toBe(0);
  });

  it("hitDie keeps the first class and never crashes empty", () => {
    const c = hero();
    c.classes = [{ classIndex: "wizard", level: 1, subclassIndex: null }];
    expect(hitDie(c)).toBe(6);
    expect(hitDie(hero())).toBe(8);
  });
});
