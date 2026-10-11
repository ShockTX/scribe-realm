import { describe, it, expect } from "vitest";
import {
  readQuest,
  abandonQuest,
  uniqueQuestId,
  withUniqueId,
  GmSilent,
  completeReward,
  DANGER_WORD,
  rewardFor,
  type Quest,
} from "../quests";

const good = {
  title: "The Bell That Rings Itself",
  giver: "Harbourmaster Enna Doult",
  where: "the Drowned Shrine",
  hook: "Something under the water is ringing the old bell. Find out what.",
  detail: "Three nights running, at the turn of the tide.",
  reward: 18,
  danger: "fair",
};

describe("reading what the GM sends back", () => {
  it("turns a good reply into a quest", () => {
    const q = readQuest(good, 4);
    expect(q.title).toBe(good.title);
    const floor = Math.round(rewardFor(1, "fair") * 0.6);
    expect(q.reward).toBe(floor); // engine floor, not the Warden's 18
    expect(floor).toBeGreaterThan(good.reward);
    expect(q.danger).toBe("fair");
    expect(q.posted).toBe(4);
    expect(q.state).toBe("offered");
  });

  it("gives each posting an id that carries the day", () => {
    expect(readQuest(good, 7).id).toMatch(/-d7$/);
  });

  it("refuses a reply with a missing field", () => {
    const bad = { ...good, hook: "" };
    expect(() => readQuest(bad, 1)).toThrow(GmSilent);
  });

  it("refuses nonsense outright", () => {
    expect(() => readQuest(null, 1)).toThrow(GmSilent);
    expect(() => readQuest("a quest, honest", 1)).toThrow(GmSilent);
  });

  it("falls back to fair odds if the danger word is unknown", () => {
    expect(readQuest({ ...good, danger: "apocalyptic" }, 1).danger).toBe("fair");
  });

  it("never posts work worth nothing", () => {
    expect(readQuest({ ...good, reward: 0 }, 1).reward).toBeGreaterThan(0);
    expect(readQuest({ ...good, reward: -50 }, 1).reward).toBeGreaterThan(0);
  });

  it("pays out exactly what was posted", () => {
    const q = readQuest(good, 1);
    expect(completeReward(q)).toBe(q.reward);
  });

  it("has a plain word for every danger level", () => {
    for (const d of ["low", "fair", "grim"] as const) {
      expect(DANGER_WORD[d]).toBeTruthy();
      expect(DANGER_WORD[d]).not.toMatch(/[0-9]/);
    }
  });
});

function bill(over: Partial<Quest> = {}): Quest {
  return {
    id: "bell-d1",
    title: "The Bell",
    giver: "Enna",
    where: "the Shrine",
    hook: "hook",
    detail: "detail",
    reward: 240,
    danger: "fair",
    posted: 1,
    state: "taken",
    ...over,
  };
}

describe("walking away from work", () => {
  it("removes a taken bill and keeps the rest", () => {
    const board = [bill(), bill({ id: "rats-d1", state: "offered" })];
    const next = abandonQuest(board, "bell-d1");
    expect(next.map((q) => q.id)).toEqual(["rats-d1"]);
    expect(board).toHaveLength(2);
  });

  it("ignores an unknown id", () => {
    const board = [bill()];
    expect(abandonQuest(board, "nope-d9")).toBe(board);
  });

  it("refuses to abandon work that was never taken", () => {
    const board = [bill({ state: "offered" }), bill({ id: "old-d1", state: "done" })];
    expect(abandonQuest(board, "bell-d1")).toBe(board);
    expect(abandonQuest(board, "old-d1")).toBe(board);
  });
});

describe("posting ids never collide", () => {
  it("keeps a fresh id untouched", () => {
    expect(uniqueQuestId("bell-d1", [])).toBe("bell-d1");
    expect(uniqueQuestId("bell-d1", ["rats-d1"])).toBe("bell-d1");
  });

  it("appends -2, -3 until the id is free", () => {
    expect(uniqueQuestId("bell-d1", ["bell-d1"])).toBe("bell-d1-2");
    expect(uniqueQuestId("bell-d1", ["bell-d1", "bell-d1-2"])).toBe("bell-d1-3");
  });

  it("withUniqueId renames only on collision", () => {
    const q = bill();
    expect(withUniqueId(q, [])).toBe(q);
    const renamed = withUniqueId(q, [bill()]);
    expect(renamed.id).toBe("bell-d1-2");
    expect(renamed.title).toBe(q.title);
  });
});
