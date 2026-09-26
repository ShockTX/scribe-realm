/**
 * The campaign spine and the XP curve.
 *
 * These two exist to stop the game being an infinite errand generator.
 * The tests below are the shape of that promise, not the implementation.
 */
import { describe, it, expect } from "vitest";
import { emptyCharacter, type Character } from "../../model/character";
import { STAGES, stageOf, atReckoning, townLine } from "../campaign";
import { settleRun, dangerShare, type Run } from "../../scene/run";
import { XP_THRESHOLDS, levelFromXp } from "../../rules/advance";
import { LOCATIONS } from "../locations";

function at(day: number, runs = 0): Character {
  return { ...emptyCharacter("t-t-t-t-t"), day, runsDone: runs };
}

function wonRun(): Run {
  return {
    questId: "q",
    site: { id: "drowned-crown" },
    beats: [],
    ledger: [],
    ending: "won",
    loot: [],
  } as unknown as Run;
}

describe("the Salt Rise advances on its own", () => {
  it("starts at rumour on day one", () => {
    expect(stageOf(at(1)).id).toBe("rumour");
  });

  it("moves with days even if the player never ventures out", () => {
    expect(stageOf(at(12)).id).toBe("pressure");
    expect(stageOf(at(30)).id).toBe("reckoning");
  });

  it("moves with runs even if the player never sleeps", () => {
    expect(stageOf(at(1, 7)).id).toBe("pressure");
    expect(stageOf(at(1, 18)).id).toBe("reckoning");
  });

  it("takes whichever clock is further along", () => {
    expect(stageOf(at(20, 0)).id).toBe("crisis");
    expect(stageOf(at(1, 12)).id).toBe("crisis");
  });

  it("never goes backwards through the stage list", () => {
    let last = 0;
    for (let d = 1; d <= 40; d++) {
      const o = stageOf(at(d)).order;
      expect(o).toBeGreaterThanOrEqual(last);
      last = o;
    }
  });

  it("reaches a final stage, so the campaign can end", () => {
    expect(atReckoning(at(30))).toBe(true);
    expect(STAGES[STAGES.length - 1].id).toBe("reckoning");
  });

  it("survives an old save with no run counter", () => {
    const old = { ...emptyCharacter("t-t-t-t-t"), day: 3 } as Character;
    delete (old as Partial<Character>).runsDone;
    expect(stageOf(old).id).toBe("rumour");
  });
});

describe("the town notices", () => {
  it("says nothing new early on", () => {
    expect(townLine("guildhall", at(1))).toBeNull();
  });

  it("changes a location's prose once the Rise bites", () => {
    const line = townLine("guildhall", at(12));
    expect(line).toBeTruthy();
    expect(line).not.toBe(townLine("guildhall", at(30)));
  });

  it("only names locations that exist", () => {
    const ids = new Set(LOCATIONS.map((l) => l.id));
    for (const loc of ["guildhall", "harbormaster", "temple", "tavern", "wharf-market", "weaponsmith"]) {
      expect(ids.has(loc)).toBe(true);
    }
  });
});

describe("the XP curve holds its shape at every level", () => {
  it("pays a share of the gap, not danger times level", () => {
    for (let lv = 1; lv <= 12; lv++) {
      const gap = XP_THRESHOLDS[lv] - XP_THRESHOLDS[lv - 1];
      const s = settleRun(wonRun(), 20, "fair", lv);
      expect(s.xp).toBeCloseTo(Math.round(gap * dangerShare("fair")), -1);
    }
  });

  it("keeps runs-per-level between three and seven at every level", () => {
    for (let lv = 1; lv <= 15; lv++) {
      const gap = XP_THRESHOLDS[lv] - XP_THRESHOLDS[lv - 1];
      for (const danger of ["low", "fair", "grim"]) {
        const s = settleRun(wonRun(), 20, danger, lv);
        const runs = gap / s.xp;
        expect(runs).toBeGreaterThanOrEqual(3);
        expect(runs).toBeLessThanOrEqual(7);
      }
    }
  });

  it("no longer needs thirteen identical errands for level five", () => {
    const gap = XP_THRESHOLDS[4] - XP_THRESHOLDS[3];
    const grim = settleRun(wonRun(), 20, "grim", 4);
    expect(gap / grim.xp).toBeLessThan(7);
  });

  it("pays half for a costly ending and nothing for a lost one", () => {
    const won = settleRun(wonRun(), 20, "fair", 3);
    const cost = settleRun({ ...wonRun(), ending: "cost" } as Run, 20, "fair", 3);
    const lost = settleRun({ ...wonRun(), ending: "lost" } as Run, 20, "fair", 3);
    expect(cost.xp).toBe(Math.round(won.xp / 2));
    expect(lost.xp).toBe(0);
  });

  it("still pays at level 20, where there is no gap left", () => {
    expect(settleRun(wonRun(), 20, "grim", 20).xp).toBeGreaterThan(0);
  });

  it("a level earned is a level the table justifies", () => {
    let xp = 0;
    for (let i = 0; i < 6; i++) xp += settleRun(wonRun(), 20, "fair", levelFromXp(xp)).xp;
    expect(levelFromXp(xp)).toBeGreaterThan(1);
  });
});

describe("every declared service is reachable", () => {
  const HANDLED = new Set(["buy", "sell", "rest", "quests", "heal", "train", "travel", "identify"]);

  it("has a handler for every kind the town declares", () => {
    for (const loc of LOCATIONS) {
      for (const sv of loc.services) {
        expect(HANDLED.has(sv.kind)).toBe(true);
      }
    }
  });

  it("still declares the four that used to do nothing", () => {
    const kinds = new Set(LOCATIONS.flatMap((l) => l.services.map((s) => s.kind)));
    for (const k of ["heal", "train", "travel", "identify"]) {
      expect(kinds.has(k as never)).toBe(true);
    }
  });
});
