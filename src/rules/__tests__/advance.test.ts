import { describe, it, expect } from "vitest";
import { emptyCharacter } from "../../model/character";
import { maxHp } from "../derive";
import { applyLevels, chooseSubclass, levelFromXp, subclassDue, xpToNext } from "../advance";

function fighter(xp = 0, level = 1) {
  const c = emptyCharacter();
  c.name = "Mira";
  c.classes = [{ classIndex: "fighter", level, subclassIndex: null }];
  c.xp = xp;
  c.currentHp = maxHp(c).value;
  c.hitDiceRemaining = level;
  return c;
}

describe("experience", () => {
  it("keeps level 1 until 300", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(299)).toBe(1);
    expect(levelFromXp(300)).toBe(2);
    expect(xpToNext(1)).toBe(300);
    expect(xpToNext(20)).toBeNull();
  });

  it("raises the class, the hit points, and the hit die", () => {
    const before = fighter(300);
    const beforeHp = before.currentHp;
    const { character, notes } = applyLevels(before);
    expect(character.classes[0].level).toBe(2);
    expect(notes).toHaveLength(1);
    expect(notes[0].className).toBe("Fighter");
    expect(notes[0].features.length).toBeGreaterThan(0);
    expect(character.currentHp).toBe(beforeHp + notes[0].hpGain);
    expect(character.hitDiceRemaining).toBe(2);
    expect(maxHp(character).value).toBe(character.currentHp);
  });

  it("does not level a character who is already there", () => {
    const c = fighter(300, 2);
    const again = applyLevels(c);
    expect(again.notes).toEqual([]);
    expect(again.character).toBe(c);
  });

  it("offers a martial archetype at 3 and will not invent one", () => {
    const { character } = applyLevels(fighter(900));
    expect(character.classes[0].level).toBe(3);
    const due = subclassDue(character);
    expect(due?.flavor).toBe("Martial Archetype");
    expect(due?.options.map((o) => o.index)).toContain("champion");
    const chosen = chooseSubclass(character, "champion");
    expect(chosen.classes[0].subclassIndex).toBe("champion");
    expect(subclassDue(chosen)).toBeNull();
    expect(chooseSubclass(character, "evocation")).toBe(character);
  });

  it("xpToNext(0) asks for 300", () => {
    expect(xpToNext(0)).toBe(300);
  });

  it("refuses a subclass before the class grants one", () => {
    const early = fighter(0);
    expect(chooseSubclass(early, "champion")).toBe(early);
  });

  it("levels a downed character from 0 without a full heal", () => {
    const before = fighter(300);
    before.currentHp = 0;
    const { character, notes } = applyLevels(before);
    expect(notes).toHaveLength(1);
    expect(character.currentHp).toBe(notes[0].hpGain);
    expect(character.currentHp).toBeLessThan(maxHp(character).value);
  });

  it("never produces NaN hit dice when the field is missing", () => {
    const before = fighter(300);
    delete (before as unknown as Record<string, unknown>).hitDiceRemaining;
    const { character } = applyLevels(before);
    expect(Number.isNaN(character.hitDiceRemaining)).toBe(false);
    expect(character.hitDiceRemaining).toBe(1);
  });

  it("advances only the first class for multiclass characters", () => {
    const c = fighter(900);
    c.classes = [
      { classIndex: "fighter", level: 1, subclassIndex: null },
      { classIndex: "wizard", level: 1, subclassIndex: null },
    ];
    // total 2 -> xp 900 wants total 3, so the first class takes the level.
    const { character } = applyLevels(c);
    expect(character.classes[0].level).toBe(2);
    expect(character.classes[1].level).toBe(1);
  });
});
