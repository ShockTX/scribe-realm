import { describe, it, expect } from "vitest";
import { normalize } from "../normalize";

describe("loading an old save", () => {
  it("survives a save written before the town existed", () => {
    const old = {
      version: 2, id: "x", name: "Mira Vell",
      baseScores: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
      coin: { gp: 32 },
      classes: [{ classIndex: "wizard", level: 1, subclassIndex: null }],
    };
    const c = normalize(old)!;
    expect(c.name).toBe("Mira Vell");
    expect(c.pack).toEqual([]);
    expect(c.companions).toEqual([]);
    expect(c.day).toBe(1);
    expect(c.coin.gp).toBe(32);
    expect(c.coin.sp).toBe(0);
    expect(c.spells.known).toEqual([]);
  });

  it("keeps a current save untouched", () => {
    const now = { version: 2, id: "y", name: "Kestrel", pack: ["rope"], day: 4, companions: ["pell"], coin: { gp: 5, cp: 0, sp: 0, ep: 0, pp: 0 } };
    const c = normalize(now)!;
    expect(c.pack).toEqual(["rope"]);
    expect(c.day).toBe(4);
    expect(c.companions).toEqual(["pell"]);
  });

  it("refuses junk rather than half-loading it", () => {
    expect(normalize(null)).toBeNull();
    expect(normalize({})).toBeNull();
    expect(normalize({ name: "" })).toBeNull();
  });
});
