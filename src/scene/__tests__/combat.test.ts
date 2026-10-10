import { describe, it, expect, vi } from "vitest";
import { emptyCharacter } from "../../model/character";
import { maxHp } from "../../rules/derive";
import { beginCombat, optionsFor, playerAc, playerTurn } from "../combat";

function hero() {
  const c = emptyCharacter();
  c.name = "Mira";
  c.classes = [{ classIndex: "fighter", level: 1, subclassIndex: null }];
  c.currentHp = maxHp(c).value;
  return c;
}

describe("starting a fight", () => {
  it("will not field a wight against a first-level character", () => {
    const s = beginCombat(hero(), "wight", 9);
    expect(s.foes).toHaveLength(3);
    expect(s.foes[0].name).toBe("Bandit");
    expect(s.foes[0].maxHp).toBe(11);
    expect(s.over).toBeNull();
  });

  it("matches a plural name to the real stat block", () => {
    const s = beginCombat(hero(), "goblins", 1);
    expect(s.foes).toHaveLength(1);
    expect(s.foes[0].name).toBe("Goblin");
    expect(s.foes[0].ac).toBe(15);
  });

  it("guards at +2 armour class, and the foe rolls against that", () => {
    const c = hero();
    const s0 = beginCombat(c, "bandit", 1);
    const defend = optionsFor(c, s0).find((o) => o.kind === "defend");
    expect(defend).toBeDefined();
    const s1 = playerTurn(c, s0, defend!);
    const blow = s1.log.find((l) => l.who === "them" && l.against != null);
    expect(blow?.against).toBe(12);
    expect(s1.log.some((l) => l.text.includes("set your feet"))).toBe(true);
  });
});

describe("worn armour", () => {
  it("makes a chain shirt the number enemies roll against", () => {
    const c = hero();
    c.equipped = { armor: "chain-shirt" };
    const s0 = beginCombat(c, "bandit", 1);
    expect(playerAc(c, s0)).toBe(13);
    const defend = optionsFor(c, s0).find((o) => o.kind === "defend")!;
    const blow = playerTurn(c, s0, defend).log.find((l) => l.who === "them" && l.against != null);
    expect(blow?.against).toBe(15);
  });

  it("caps dexterity on a chain shirt and still adds a shield", () => {
    const c = hero();
    c.baseScores = { ...c.baseScores, dex: 16 };
    c.equipped = { armor: "chain-shirt" };
    const bare = beginCombat(c, "bandit", 1);
    expect(playerAc(c, bare)).toBe(15);
    c.equipped = { armor: "chain-shirt", shield: "shield" };
    expect(playerAc(c, beginCombat(c, "bandit", 1))).toBe(17);
  });

  it("keeps a hand-set armour class ahead of what is worn", () => {
    const c = hero();
    c.equipped = { armor: "chain-shirt", shield: "shield" };
    c.overrides = { armorClass: { value: 18, note: "test" } };
    expect(playerAc(c, beginCombat(c, "bandit", 1))).toBe(18);
  });
});

describe("the weapon in hand", () => {
  it("uses the two-handed die only when the other hand is empty", () => {
    const c = hero();
    c.equipped = { mainHand: "longsword" };
    const open = optionsFor(c, beginCombat(c, "bandit", 1)).find((o) => o.kind === "attack")!;
    expect(open.detail).toContain("1d10");
    c.equipped = { mainHand: "longsword", shield: "shield" };
    const guarded = optionsFor(c, beginCombat(c, "bandit", 1)).find((o) => o.kind === "attack")!;
    expect(guarded.detail).toContain("1d8");
    expect(guarded.detail).not.toContain("1d10");
  });

  it("says a bow is at disadvantage up close", () => {
    const c = hero();
    c.equipped = { mainHand: "shortbow" };
    const attack = optionsFor(c, beginCombat(c, "bandit", 1)).find((o) => o.kind === "attack")!;
    expect(attack.detail).toContain("disadvantage up close");
  });

  it("keeps the worse die when a bow is fired in reach", () => {
    const c = hero();
    c.equipped = { mainHand: "shortbow" };
    const s0 = beginCombat(c, "bandit", 1);
    const attack = optionsFor(c, s0).find((o) => o.kind === "attack")!;
    const spy = vi.spyOn(Math, "random").mockReturnValueOnce(0.99).mockReturnValueOnce(0);
    const swing = playerTurn(c, s0, attack).log.find((l) => l.who === "you" && l.die != null);
    spy.mockRestore();
    expect(swing?.die).toBe(1);
    expect(swing?.crit).toBe(false);
  });

  it("swings the off hand for weapon dice only", () => {
    const c = hero();
    c.baseScores = { ...c.baseScores, str: 16 };
    c.equipped = { mainHand: "longsword", offHand: "dagger" };
    const s0 = beginCombat(c, "bandit", 1);
    s0.foes[0].hp = 500;
    const attack = optionsFor(c, s0).find((o) => o.kind === "attack")!;
    const queue = [0.72, 0, 0.72, 0];
    const spy = vi.spyOn(Math, "random").mockImplementation(() => queue.shift() ?? 0.5);
    const swings = playerTurn(c, s0, attack).log.filter((l) => l.who === "you" && l.die != null);
    spy.mockRestore();
    expect(swings.map((l) => l.damage)).toEqual([4, 1]);
  });

  it("puts poison on the main hit and leaves it there if that hit misses", () => {
    const c = hero();
    c.equipped = { mainHand: "longsword", offHand: "dagger" };
    const s0 = beginCombat(c, "bandit", 1);
    s0.foes[0].hp = 500;
    s0.coating = "1d4";
    const attack = optionsFor(c, s0).find((o) => o.kind === "attack")!;
    const queue = [0, 0.72, 0, 0.99];
    const spy = vi.spyOn(Math, "random").mockImplementation(() => queue.shift() ?? 0.5);
    const after = playerTurn(c, s0, attack);
    spy.mockRestore();
    const swings = after.log.filter((l) => l.who === "you" && l.die != null);
    expect(swings[0]?.hit).toBe(false);
    expect(swings[1]?.damage).toBe(1);
    expect(after.coating).toBe("1d4");
  });
});
