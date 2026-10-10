import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyCharacter } from "../../model/character";
import { speed } from "../../rules/derive";
import { bothHandsFree, damageExpr, WEAPONS } from "../../game/gear";
import { armourHinders, attackDie, resolve } from "../dice";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("armour on a check", () => {
  it("hinders stealth in noisy armour and dexterity under the strength line", () => {
    const c = emptyCharacter();
    c.equipped = { armor: "padded" };
    expect(armourHinders(c, { ability: "dex", skill: "stealth", dc: 13, stakes: "quiet" })).toBe(true);
    expect(armourHinders(c, { ability: "dex", dc: 13, stakes: "dodge" })).toBe(false);

    c.equipped = { armor: "chain-mail" };
    c.baseScores = { ...c.baseScores, str: 10 };
    expect(armourHinders(c, { ability: "dex", dc: 13, stakes: "dodge" })).toBe(true);
    expect(armourHinders(c, { ability: "str", dc: 13, stakes: "lift" })).toBe(false);
    c.baseScores = { ...c.baseScores, str: 13 };
    expect(armourHinders(c, { ability: "dex", dc: 13, stakes: "dodge" })).toBe(false);
    expect(armourHinders(c, { ability: "dex", skill: "stealth", dc: 13, stakes: "quiet" })).toBe(true);

    c.equipped = { armor: "leather" };
    c.baseScores = { ...c.baseScores, str: 8 };
    expect(armourHinders(c, { ability: "dex", skill: "stealth", dc: 13, stakes: "quiet" })).toBe(false);
  });

  it("keeps the lower die once, and says the armour did it", () => {
    const c = emptyCharacter();
    c.equipped = { armor: "chain-mail" };
    c.baseScores = { ...c.baseScores, str: 8 };
    vi.spyOn(Math, "random").mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValueOnce(0);
    const hindered = resolve(c, { ability: "dex", skill: "stealth", dc: 15, stakes: "quiet" });
    expect(hindered.die).toBe(20);
    expect(hindered.outcome).toBe("critical");
    expect(hindered.label).toBe("Dexterity (Stealth), hindered by armour");
  });

  it("fumbles when the second die is the one that counts", () => {
    const c = emptyCharacter();
    c.equipped = { armor: "chain-mail" };
    vi.spyOn(Math, "random").mockReturnValueOnce(0.99).mockReturnValueOnce(0);
    const roll = resolve(c, { ability: "dex", dc: 10, stakes: "dodge" });
    expect(roll.die).toBe(1);
    expect(roll.outcome).toBe("fumble");
    expect(roll.label).toContain("hindered by armour");
  });

  it("leaves an unarmoured check on one die", () => {
    const c = emptyCharacter();
    vi.spyOn(Math, "random").mockReturnValueOnce(0.99).mockReturnValueOnce(0);
    const roll = resolve(c, { ability: "dex", dc: 10, stakes: "dodge" });
    expect(roll.die).toBe(20);
    expect(roll.outcome).toBe("critical");
    expect(roll.label).toBe("Dexterity");
  });

  it("keeps the lower of two dice only when asked", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.99).mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    expect(attackDie(true)).toBe(1);
    expect(attackDie(false)).toBe(20);
  });
});

describe("what the armour does to the sheet", () => {
  it("cuts speed by ten in chain mail below strength 13", () => {
    const c = emptyCharacter();
    c.equipped = { armor: "chain-mail" };
    c.baseScores = { ...c.baseScores, str: 10 };
    expect(speed(c).value).toBe(20);
    c.baseScores = { ...c.baseScores, str: 13 };
    expect(speed(c).value).toBe(30);
    c.equipped = { armor: "leather" };
    c.baseScores = { ...c.baseScores, str: 10 };
    expect(speed(c).value).toBe(30);
  });
});

describe("versatile weapons", () => {
  it("steps the die up only with both hands free", () => {
    const sword = WEAPONS.longsword;
    expect(damageExpr(sword, true)).toBe("1d10");
    expect(damageExpr(sword, false)).toBe("1d8");
    expect(bothHandsFree({})).toBe(true);
    expect(bothHandsFree({ shield: "shield" })).toBe(false);
    expect(bothHandsFree({ offHand: "dagger" })).toBe(false);
    expect(damageExpr(WEAPONS.spear, true)).toBe("1d8");
  });
});
