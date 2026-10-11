/**
 * Regression tests for the two clamps that were not clamping.
 *
 *  1. `gain` was filtered only on "is a string", so the Warden could hand
 *     over a "sunblade" that no shop sells — it sat in the pack unsellable,
 *     unequippable and unusable. Inventory is a clamped resource too.
 *  2. readFight() capped the enemy count at 6 while beginCombat() capped it
 *     at 3 (4 from level 3), so the parsed number was never the number
 *     fought. Both now read foeCeiling().
 */
import { describe, it, expect } from "vitest";
import { readConsequence, readConsequenceNoCheck } from "../dice";
import { readScene } from "../run";
import { foeCeiling } from "../foes";
import { itemById } from "../../town/shops";

describe("the Warden may not conjure items", () => {
  it("drops an item no shop has ever sold", () => {
    const con = readConsequence({ gain: ["sunblade", "vorpal-thing"] }, 3);
    expect(con.gain).toBeUndefined();
  });

  it("keeps a real catalogue item", () => {
    expect(itemById("rope-50")).toBeDefined();
    const con = readConsequence({ gain: ["rope-50"] }, 3);
    expect(con.gain).toEqual(["rope-50"]);
  });

  it("keeps the real ones and discards the invented ones together", () => {
    const con = readConsequence({ gain: ["rope-50", "moonblade-of-ruin"] }, 3);
    expect(con.gain).toEqual(["rope-50"]);
  });

  it("clamps gold and hit points to the beat ceiling", () => {
    const con = readConsequence({ hp: -9999, gp: 9999 }, 1);
    expect(con.hp).toBe(-7);
    expect(con.gp).toBe(100);
  });

  it("holds unchecked beats to a quarter of the checked caps", () => {
    const one = readConsequenceNoCheck({ hp: -9999, gp: 9999 }, 1);
    expect(one.hp).toBe(-3);
    expect(one.gp).toBe(25);
    const five = readConsequenceNoCheck({ hp: 9999, gp: 9999 }, 5);
    expect(five.hp).toBe(7);
    expect(five.gp).toBe(125);
  });

  it("lets a free beat carry at most one thing", () => {
    const con = readConsequenceNoCheck({ gain: ["rope-50", "oil-flask"] }, 3);
    expect(con.gain).toEqual(["rope-50"]);
  });

  it("lets alchemist's fire through the gain filter now that a shop sells it", () => {
    expect(itemById("alchemist-fire")).toBeDefined();
    expect(readConsequence({ gain: ["alchemist-fire"] }, 1).gain).toEqual(["alchemist-fire"]);
  });
});

describe("one ceiling on how many things you fight", () => {
  it("agrees with the combat engine at low level", () => {
    const scene = readScene({ situation: "x", fight: { name: "goblin", count: 6 } }, 1);
    expect(scene.fight?.count).toBe(foeCeiling(1));
    expect(scene.fight?.count).toBe(3);
  });

  it("allows the extra one from level 3", () => {
    const scene = readScene({ situation: "x", fight: { name: "goblin", count: 6 } }, 3);
    expect(scene.fight?.count).toBe(4);
  });

  it("never drops below one", () => {
    const scene = readScene({ situation: "x", fight: { name: "goblin", count: 0 } }, 1);
    expect(scene.fight?.count).toBe(1);
  });
});
