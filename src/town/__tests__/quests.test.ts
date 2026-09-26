import { describe, it, expect } from "vitest";
import { readQuest, GmSilent, completeReward, DANGER_WORD } from "../quests";

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
    expect(q.reward).toBe(36); // engine floor, not the Warden's 18
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
    expect(completeReward(q)).toBe(36);
  });

  it("has a plain word for every danger level", () => {
    for (const d of ["low", "fair", "grim"] as const) {
      expect(DANGER_WORD[d]).toBeTruthy();
      expect(DANGER_WORD[d]).not.toMatch(/[0-9]/);
    }
  });
});
