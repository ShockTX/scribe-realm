import { describe, it, expect } from "vitest";
import { normalize } from "../normalize";
import { emptyCharacter } from "../character";

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
    expect(c.memory).toEqual([]);
  });

  it("keeps facts the town already remembers", () => {
    const c = normalize({
      version: 2, id: "z", name: "Mira",
      memory: ["The shelf fell.", 4, "  ", "The clerk knows your name."],
    })!;
    expect(c.memory).toEqual(["The shelf fell.", "The clerk knows your name."]);
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

describe("save validation", () => {
  it("defaults xp NaN / negative / fractional to a safe int", () => {
    expect(normalize({ name: "A", xp: NaN })!.xp).toBe(0);
    expect(normalize({ name: "A", xp: Infinity })!.xp).toBe(0);
    expect(normalize({ name: "A", xp: -5 })!.xp).toBe(0);
    expect(normalize({ name: "A", xp: 12.9 })!.xp).toBe(12);
    expect(normalize({ name: "A", xp: 40 })!.xp).toBe(40);
  });

  it("clamps baseScores strings and out-of-range numbers", () => {
    const c = normalize({
      name: "B",
      baseScores: { str: "18", dex: 999, con: -4, int: NaN, wis: Infinity, cha: 12 },
    })!;
    expect(c.baseScores.str).toBe(10);
    expect(c.baseScores.dex).toBe(30);
    expect(c.baseScores.con).toBe(1);
    expect(c.baseScores.int).toBe(10);
    expect(c.baseScores.wis).toBe(10);
    expect(c.baseScores.cha).toBe(12);
  });

  it("drops malformed class entries and clamps levels", () => {
    const c = normalize({
      name: "C",
      classes: [
        { classIndex: "wizard", level: 1, subclassIndex: null },
        { classIndex: "", level: 3, subclassIndex: null },
        { classIndex: 42, level: 2, subclassIndex: null },
        { classIndex: "fighter", level: 99, subclassIndex: "champion" },
        { classIndex: "rogue", level: 0, subclassIndex: 7 },
        { classIndex: "cleric", level: NaN, subclassIndex: undefined },
        "wizard",
        null,
      ],
    })!;
    expect(c.classes).toEqual([
      { classIndex: "wizard", level: 1, subclassIndex: null },
      { classIndex: "fighter", level: 20, subclassIndex: "champion" },
      { classIndex: "rogue", level: 1, subclassIndex: null },
      { classIndex: "cleric", level: 1, subclassIndex: null },
    ]);
  });

  it("keeps only well-shaped overrides on known fields", () => {
    const c = normalize({
      name: "D",
      overrides: {
        maxHp: { value: 30, note: "homebrew" },
        speed: { value: NaN, note: "bad" },
        armorClass: { value: 15 },
        initiative: "fast",
        notAField: { value: 5, note: "x" },
      },
    })!;
    expect(c.overrides).toEqual({ maxHp: { value: 30, note: "homebrew" } });
  });

  it("clamps death saves, day, tempHp, hit dice and runsDone", () => {
    const c = normalize({
      name: "E",
      day: 0,
      tempHp: -3,
      hitDiceRemaining: -2,
      deathSaveSuccesses: 9,
      deathSaveFailures: -4,
      runsDone: -1,
    })!;
    expect(c.day).toBe(1);
    expect(c.tempHp).toBe(0);
    expect(c.hitDiceRemaining).toBe(0);
    expect(c.deathSaveSuccesses).toBe(3);
    expect(c.deathSaveFailures).toBe(0);
    expect(c.runsDone).toBe(0);
    const c2 = normalize({
      name: "E",
      day: 3.9,
      deathSaveSuccesses: 2.7,
      runsDone: 2.9,
    })!;
    expect(c2.day).toBe(3);
    expect(c2.deathSaveSuccesses).toBe(2);
    expect(c2.runsDone).toBe(2);
  });

  it("rejects arrays for equipped / companionGear / memberNotes", () => {
    const c = normalize({
      name: "F",
      equipped: [],
      companionGear: [],
      memberNotes: [],
    })!;
    expect(c.equipped).toEqual({});
    expect(c.companionGear).toEqual({});
    expect(c.memberNotes).toEqual({});
  });

  it("discards a corrupt activeRun instead of crashing", () => {
    expect(normalize({ name: "G", activeRun: null })!.activeRun).toBeUndefined();
    expect(normalize({ name: "G", activeRun: "in-town" })!.activeRun).toBeUndefined();
    expect(
      normalize({ name: "G", activeRun: { questId: "q" } })!.activeRun,
    ).toBeUndefined();
    expect(
      normalize({
        name: "G",
        activeRun: { questId: "q", siteId: "s", roomId: "r", beats: [], ledger: [], length: 6, ending: "bogus" },
      })!.activeRun,
    ).toBeUndefined();
    const good = {
      questId: "q", siteId: "s", roomId: "r", beats: [], ledger: ["f"], length: 6, ending: null,
    };
    expect(normalize({ name: "G", activeRun: good })!.activeRun).toEqual(good);
  });

  it("defaults hit dice to 1 for new and legacy saves", () => {
    expect(emptyCharacter().hitDiceRemaining).toBe(1);
    // absent field falls back to the same default as normalize
    expect(normalize({ name: "H" })!.hitDiceRemaining).toBe(1);
  });

  it("keeps a well-shaped campaign resolution and drops a bogus one", () => {
    expect(
      normalize({ name: "I", campaignOver: { outcome: "won", day: 30 } })!.campaignOver,
    ).toEqual({ outcome: "won", day: 30 });
    expect(
      normalize({ name: "I", campaignOver: { outcome: "maybe", day: 30 } })!.campaignOver,
    ).toBeUndefined();
    expect(normalize({ name: "I" })!.campaignOver).toBeUndefined();
  });
});
