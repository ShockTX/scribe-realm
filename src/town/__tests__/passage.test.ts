import { describe, expect, it } from "vitest";
import { emptyCharacter } from "../../model/character";
import { LOCATIONS } from "../locations";
import { PASSAGE_FEE, afterPassage, passageLine } from "../Town";

describe("passage", () => {
  it("spends the fee and a day", () => {
    const c = emptyCharacter("00000000-0000-0000-0000-000000000010");
    c.coin = { ...c.coin, gp: PASSAGE_FEE };
    c.day = 3;
    const next = afterPassage(c);
    expect(next.coin.gp).toBe(0);
    expect(next.day).toBe(4);
  });

  it("refuses a purse that cannot pay", () => {
    const c = emptyCharacter("00000000-0000-0000-0000-000000000011");
    c.coin = { ...c.coin, gp: PASSAGE_FEE - 1 };
    c.day = 3;
    expect(afterPassage(c)).toBe(c);
  });

  it("lets the ship and the harbourmaster tell different truths", () => {
    const ship = LOCATIONS.find((l) => l.id === "ship")!;
    const harbour = LOCATIONS.find((l) => l.id === "harbormaster")!;
    const shipLabel = ship.services.find((s) => s.kind === "travel")!.label;
    const harbourLabel = harbour.services.find((s) => s.kind === "travel")!.label;
    expect(shipLabel).toBe("Take the day along the coast");
    expect(shipLabel).not.toBe(harbourLabel);
    expect(passageLine("ship")).not.toBe(passageLine("harbormaster"));
    expect(passageLine("ship")).toContain("Fenn");
    expect(passageLine("harbormaster")).toContain("evening tide");
  });
});
