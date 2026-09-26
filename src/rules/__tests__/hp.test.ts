/**
 * Regression tests for the falsy-zero hit point bug.
 *
 * `c.currentHp || maxHp(c).value` read a character who had just been dropped
 * to 0 as undamaged, in six different files. Going down in a fight therefore
 * cost nothing: you walked back into Saltmarrow at full health, and the
 * Warden was told you were at full health too. These tests exist so that
 * idiom cannot quietly return.
 */
import { describe, it, expect } from "vitest";
import { hpOf, maxHp } from "../derive";
import { normalize } from "../../model/normalize";
import { applyConsequence } from "../../scene/dice";
import type { Character } from "../../model/character";

function hero(over: Partial<Character> = {}): Character {
  return normalize({
    version: 2,
    id: "t",
    name: "Test",
    baseScores: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    classes: [{ classIndex: "fighter", level: 1, subclassIndex: null }],
    ...over,
  })!;
}

describe("hpOf", () => {
  it("reports zero as zero, not as full health", () => {
    const c = hero({ currentHp: 0 });
    expect(hpOf(c)).toBe(0);
    expect(hpOf(c)).not.toBe(maxHp(c).value);
  });

  it("reports a wounded character honestly", () => {
    expect(hpOf(hero({ currentHp: 3 }))).toBe(3);
  });

  it("treats a save with no currentHp at all as unhurt", () => {
    expect(hpOf(hero())).toBe(maxHp(hero()).value);
  });

  it("never returns more than the maximum or less than nothing", () => {
    expect(hpOf(hero({ currentHp: 9999 }))).toBe(maxHp(hero()).value);
    expect(hpOf(hero({ currentHp: -40 }))).toBe(0);
  });
});

describe("a downed character survives a reload", () => {
  it("keeps an explicit 0 through normalize", () => {
    const reloaded = normalize(JSON.parse(JSON.stringify(hero({ currentHp: 0 }))))!;
    expect(reloaded.currentHp).toBe(0);
  });

  it("still heals to full when the field was never written", () => {
    const raw = hero();
    delete (raw as unknown as Record<string, unknown>).currentHp;
    const reloaded = normalize(JSON.parse(JSON.stringify(raw)))!;
    expect(reloaded.currentHp).toBe(maxHp(reloaded).value);
  });
});

describe("consequences applied to a downed character", () => {
  it("does not treat 0 hp as full when the Warden deals more damage", () => {
    const c = hero({ currentHp: 0 });
    const after = applyConsequence(c, maxHp(c).value, { hp: -3 });
    expect(after.currentHp).toBe(0);
  });

  it("heals upward from zero, not from full", () => {
    const c = hero({ currentHp: 0 });
    const after = applyConsequence(c, maxHp(c).value, { hp: 4 });
    expect(after.currentHp).toBe(4);
  });
});
