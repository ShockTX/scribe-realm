import { describe, it, expect } from "vitest";
import { emptyCharacter } from "../../model/character";
import { maxHp } from "../../rules/derive";
import { beginCombat, optionsFor, playerTurn } from "../combat";

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
