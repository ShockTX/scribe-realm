import { describe, it, expect } from "vitest";
import { emptyCharacter } from "../../model/character";
import {
  allWornIds,
  equip,
  equipSlot,
  unequip,
  unequipId,
  wornIds,
} from "../gear";

function hero(pack: string[] = []) {
  const c = emptyCharacter();
  c.name = "Mira";
  c.classes = [{ classIndex: "fighter", level: 1, subclassIndex: null }];
  c.pack = [...pack];
  return c;
}

describe("wornIds helpers", () => {
  it("lists what is worn and skips empty slots", () => {
    expect(wornIds({})).toEqual([]);
    expect(wornIds({ mainHand: "dagger", armor: null, shield: "shield" })).toEqual([
      "dagger",
      "shield",
    ]);
  });

  it("allWornIds spans the hero and every hire", () => {
    const c = hero();
    c.equipped = { mainHand: "dagger" };
    c.companionGear = { pell: { shield: "shield" }, tam: {} };
    expect(allWornIds(c).sort()).toEqual(["dagger", "shield"]);
  });

  it("unequipId strips every slot holding the id", () => {
    const out = unequipId({ mainHand: "dagger", offHand: "dagger", armor: "leather" }, "dagger");
    expect(out).toEqual({ mainHand: null, offHand: null, armor: "leather" });
    expect(unequipId({ mainHand: "dagger" }, "shield")).toEqual({ mainHand: "dagger" });
  });
});

describe("single-copy equip", () => {
  it("consumes one pack copy into the slot", () => {
    const c = hero(["dagger", "rope-50"]);
    const next = equip(c, "mainHand", "dagger");
    expect(next.equipped.mainHand).toBe("dagger");
    expect(next.pack).toEqual(["rope-50"]);
  });

  it("does nothing without a pack copy (stale taps are safe)", () => {
    const c = hero([]);
    expect(equip(c, "mainHand", "dagger")).toBe(c);
  });

  it("does nothing for an illegal slot", () => {
    const c = hero(["rope-50"]);
    expect(equip(c, "armor", "rope-50")).toBe(c);
    expect(c.pack).toEqual(["rope-50"]);
  });

  it("swaps: the previous occupant returns to the pack", () => {
    const c = hero(["shortsword"]);
    c.equipped = { mainHand: "dagger" };
    const next = equip(c, "mainHand", "shortsword");
    expect(next.equipped.mainHand).toBe("shortsword");
    expect(next.pack).toEqual(["dagger"]);
    // pack + worn conserved: 1 in, 1 worn, 1 back.
    expect(next.pack.length + wornIds(next.equipped).length).toBe(2);
  });

  it("a two-handed weapon hands the off-hand copy back, not to the void", () => {
    const c = hero(["greatsword"]);
    c.equipped = { offHand: "dagger" };
    const next = equip(c, "mainHand", "greatsword");
    expect(next.equipped.mainHand).toBe("greatsword");
    expect(next.equipped.offHand).toBeNull();
    expect(next.pack).toEqual(["dagger"]);
  });

  it("two copies outfit two slots; one copy cannot outfit two bodies", () => {
    // One dagger: the hero takes it, and the hire finds nothing left.
    const one = hero(["dagger"]);
    const heroWears = equip(one, "mainHand", "dagger");
    expect(heroWears.equipped.mainHand).toBe("dagger");
    const hireDup = equip(heroWears, "offHand", "dagger", "pell");
    expect(hireDup).toBe(heroWears);
    expect(hireDup.companionGear["pell"]).toBeUndefined();

    // Two daggers: both bodies can wear one.
    const two = hero(["dagger", "dagger"]);
    const h = equip(two, "mainHand", "dagger");
    const p = equip(h, "offHand", "dagger", "pell");
    expect(h.pack).toEqual(["dagger"]);
    expect(p.pack).toEqual([]);
    expect(p.equipped.mainHand).toBe("dagger");
    expect(p.companionGear["pell"]?.offHand).toBe("dagger");
    expect(allWornIds(p).sort()).toEqual(["dagger", "dagger"]);
  });
});

describe("unequip returns the copy", () => {
  it("hands the worn copy back to the pack", () => {
    const c = hero(["rope-50"]);
    c.equipped = { mainHand: "dagger" };
    const next = unequip(c, "mainHand");
    expect(next.equipped.mainHand).toBeNull();
    expect(next.pack).toEqual(["rope-50", "dagger"]);
  });

  it("an empty slot changes nothing", () => {
    const c = hero(["rope-50"]);
    expect(unequip(c, "mainHand")).toBe(c);
  });

  it("a hire's gear returns to the same shared pack", () => {
    const c = hero([]);
    c.companionGear = { pell: { shield: "shield" } };
    const next = unequip(c, "shield", "pell");
    expect(next.companionGear["pell"]?.shield).toBeNull();
    expect(next.pack).toEqual(["shield"]);
  });

  it("equipSlot stays a pure slot write (no pack movement)", () => {
    const out = equipSlot({}, "mainHand", "dagger");
    expect(out).toEqual({ mainHand: "dagger" });
  });
});
