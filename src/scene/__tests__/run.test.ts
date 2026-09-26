import { describe, it, expect, vi, afterEach } from "vitest";
import { emptyCharacter } from "../../model/character";
import { rememberFacts, worldLedger } from "../../model/memory";
import { maxHp } from "../../rules/derive";
import { SITES } from "../sites";
import {
  adjudicate,
  askScene,
  dangerBase,
  newRun,
  readScene,
  settleRun,
  type SceneSeed,
} from "../run";

function hero() {
  const c = emptyCharacter();
  c.name = "Mira";
  c.classes = [{ classIndex: "fighter", level: 1, subclassIndex: null }];
  c.baseScores = { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 };
  c.currentHp = maxHp(c).value;
  c.coin = { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 };
  return c;
}

function seed(level: number): SceneSeed {
  return {
    character: {
      name: "Mira",
      level,
      klass: "fighter",
      race: "human",
      hp: 10,
      maxHp: 10,
      gp: 10,
      skills: [],
      party: [],
    },
    quest: { title: "A bell", giver: "Enna", objective: "Find it" },
    site: { name: "Ruin", description: "Cold.", rooms: [] },
    roomId: "gate",
    recent: [],
    ledger: [],
    beat: 1,
    of: 6,
  };
}

describe("reading a scene", () => {
  it("clamps a vicious consequence to the level it was given", () => {
    const low = readScene(
      { situation: "Steel.", onSuccess: { text: "It lands.", consequence: { hp: -999, gp: 9999 } } },
      1,
    );
    expect(low.onSuccess?.consequence?.hp).toBe(-(4 + 3));
    expect(low.onSuccess?.consequence?.gp).toBe(25);

    const mid = readScene(
      { situation: "Steel.", onSuccess: { text: "It lands.", consequence: { hp: -999 } } },
      5,
    );
    expect(mid.onSuccess?.consequence?.hp).toBe(-(4 + 15));
  });

  it("keeps a fight the Warden called, and drops an empty one", () => {
    const reply = readScene(
      { situation: "They rush you.", fight: { name: "goblins", count: 2.2 } },
      1,
    );
    expect(reply.fight).toEqual({ name: "goblins", count: 2 });
    expect(readScene({ situation: "Quiet.", fight: { name: "  " } }, 1).fight).toBeUndefined();
  });

  it("asks the parser to use the character's level, not level 1", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          situation: "Steel.",
          onSuccess: { text: "Hit.", consequence: { hp: -999 } },
        }),
      })),
    );
    const reply = await askScene(seed(5));
    expect(reply.onSuccess?.consequence?.hp).toBe(-(4 + 15));
  });
});

describe("adjudicate", () => {
  it("applies a consequence when no check was asked", () => {
    const c = hero();
    const out = adjudicate(c, {
      situation: "The shelf gives.",
      suggestions: [],
      onSuccess: { text: "It falls on you.", consequence: { hp: -3, remember: "The shelf fell." } },
    });
    expect(out.roll).toBeUndefined();
    expect(out.after.currentHp).toBe(c.currentHp - 3);
    expect(out.consequence.remember).toBe("The shelf fell.");
  });

  it("takes the failure branch on a natural one", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const out = adjudicate(hero(), {
      situation: "The lock.",
      suggestions: [],
      check: { ability: "dex", dc: 10, stakes: "The door." },
      onSuccess: { text: "Open.", consequence: { hp: 1 } },
      onFailure: { text: "Jammed.", consequence: { hp: -2 } },
    });
    expect(out.roll?.die).toBe(1);
    expect(out.branch).toBe("failure");
    expect(out.text).toBe("Jammed.");
    expect(out.consequence.hp).toBe(-2);
  });
});

describe("settlement", () => {
  const won = { ...newRun("q", SITES[0]), ending: "won" as const };
  const cost = { ...newRun("q", SITES[0]), ending: "cost" as const };
  const lost = { ...newRun("q", SITES[0]), ending: "lost" as const };

  it("pays the words the board actually uses", () => {
    expect(dangerBase("low")).toBe(40);
    expect(dangerBase("fair")).toBe(75);
    expect(dangerBase("grim")).toBe(120);
    // new curve: share of the gap to next level, not a flat base
    expect(settleRun(won, 20, "grim", 1).xp).toBe(90);
    expect(settleRun(won, 20, "grim", 1).gold).toBe(20);
    expect(settleRun(cost, 20, "fair", 1).xp).toBe(33);
    expect(settleRun(cost, 20, "fair", 1).gold).toBe(10);
    expect(settleRun(lost, 20, "grim", 1).xp).toBe(0);
    expect(settleRun(lost, 20, "grim", 1).gold).toBe(0);
  });

  it("still understands the old danger words", () => {
    expect(settleRun(won, 10, "hard", 1).xp).toBe(90);
    expect(settleRun(won, 10, "risky", 1).xp).toBe(66);
  });
});

describe("town memory", () => {
  it("keeps a fact once, and only so many", () => {
    let c = hero();
    c = rememberFacts(c, ["The shelf fell.", "The shelf fell.", "  "]);
    expect(c.memory).toEqual(["The shelf fell."]);
    const many = Array.from({ length: 30 }, (_, i) => `fact ${i}`);
    c = rememberFacts(c, many);
    expect(c.memory).toHaveLength(24);
    expect(c.memory[0]).toBe("fact 6");
  });

  it("puts the town's memory ahead of this run, without repeating itself", () => {
    const ledger = worldLedger(
      ["The shelf fell.", "The clerk knows your name."],
      ["The shelf fell.", "You left the door open."],
    );
    expect(ledger).toEqual([
      "The shelf fell.",
      "The clerk knows your name.",
      "You left the door open.",
    ]);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
