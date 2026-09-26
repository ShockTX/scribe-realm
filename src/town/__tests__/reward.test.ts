import { describe, it, expect } from "vitest";
import { rewardFor, readReward, readQuest, BASE_PURSE } from "../quests";

const good = {
  title: "The Salt Door", giver: "Coll", where: "the Drowned Crown",
  hook: "Something is under it.", detail: "Go and see.", danger: "fair", reward: 12,
};

describe("the purse", () => {
  it("scales with level and danger", () => {
    expect(rewardFor(1, "fair")).toBe(BASE_PURSE);
    expect(rewardFor(4, "fair")).toBe(BASE_PURSE * 4);
    expect(rewardFor(3, "grim")).toBeGreaterThan(rewardFor(3, "fair"));
    expect(rewardFor(3, "low")).toBeLessThan(rewardFor(3, "fair"));
  });

  it("clamps what the Warden proposes instead of trusting it", () => {
    expect(readReward(12, 4, "fair")).toBeGreaterThan(100);
    expect(readReward(999999, 1, "fair")).toBeLessThanOrEqual(Math.round(BASE_PURSE * 1.6));
    expect(readReward("a bag of teeth", 2, "fair")).toBe(rewardFor(2, "fair"));
  });

  it("pays a level's training fee and leaves gear money over", () => {
    for (let lv = 1; lv <= 10; lv++) {
      const twoJobs = rewardFor(lv, "fair") * 2;
      const trainFee = 25 * lv;
      expect(twoJobs - trainFee).toBeGreaterThan(rewardFor(lv, "fair"));
    }
  });

  it("sizes the posting off the character, not the reply", () => {
    expect(readQuest(good, 1, 5).reward).toBe(180); // floor of the level-5 fair band, not the reply's 12
  });
});
