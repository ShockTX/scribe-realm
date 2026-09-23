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
});
