import { describe, it, expect } from "vitest";
import { emptyCharacter } from "../../model/character";
import {
  canAssign, isPoolSatisfied, spellPlan, STANDARD_ARRAY,
} from "../choices";

function caster(classIndex: string, level = 1) {
  const c = emptyCharacter();
  c.name = "T";
  c.classes = [{ classIndex, level, subclassIndex: null }];
  c.xp = 0;
  return c;
}

describe("spellPlan half-caster gate", () => {
  it("offers no L1 paladin spells step", () => {
    const plan = spellPlan(caster("paladin", 1));
    expect(plan.casts).toBe(false);
    expect(plan.cantrips).toBe(0);
    expect(plan.spells).toBe(0);
  });

  it("offers no L1 ranger spells step", () => {
    expect(spellPlan(caster("ranger", 1)).casts).toBe(false);
  });

  it("casts at L2 for paladin", () => {
    const plan = spellPlan(caster("paladin", 2));
    expect(plan.casts).toBe(true);
    expect(plan.style).toBe("prepared");
  });

  it("wizard prepares rather than knows", () => {
    const plan = spellPlan(caster("wizard", 1));
    expect(plan.casts).toBe(true);
    expect(plan.style).toBe("prepared");
    expect(plan.spells).toBe(6);
  });

  it("non-casters never cast", () => {
    expect(spellPlan(caster("fighter", 1)).casts).toBe(false);
  });
});

describe("ability pool helpers", () => {
  const scores = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };

  it("accepts the exact standard array in any order", () => {
    expect(isPoolSatisfied(STANDARD_ARRAY, scores)).toBe(true);
  });

  it("rejects duplicates beyond pool counts", () => {
    expect(isPoolSatisfied(STANDARD_ARRAY, { ...scores, dex: 15 })).toBe(false);
  });

  it("canAssign blocks a duplicate the pool cannot supply", () => {
    // 15 is already on str; no second 15 in the pool.
    expect(canAssign(STANDARD_ARRAY, scores, "dex", 15)).toBe(false);
    // Freeing str's 15 by moving it away allows dex to take it.
    const freed = { ...scores, str: 8 };
    expect(canAssign(STANDARD_ARRAY, freed, "dex", 15)).toBe(true);
  });

  it("canAssign allows keeping the current value", () => {
    expect(canAssign(STANDARD_ARRAY, scores, "str", 15)).toBe(true);
  });
});
