import { describe, it, expect } from "vitest";
import { STOCK, ALL_ITEMS, sellPrice, itemById, stockFor, identifyPack } from "../shops";
import { COMPANIONS, companionOfTheDay, rumourOfTheDay } from "../inn";
import { emptyCharacter } from "../../model/character";
import { LOCATIONS } from "../locations";

describe("shop stock", () => {
  it("stocks every shop that claims to sell things", () => {
    const selling = LOCATIONS.filter((l) =>
      l.services.some((s) => s.kind === "buy"),
    );
    for (const loc of selling) {
      // the tavern sells meals through the inn panel, not a shelf
      if (loc.id === "tavern") continue;
      expect(stockFor(loc.id).length, `${loc.id} has no stock`).toBeGreaterThan(0);
    }
  });

  it("gives every shop a decent spread", () => {
    for (const [id, items] of Object.entries(STOCK)) {
      expect(items.length, `${id} is thin`).toBeGreaterThanOrEqual(7);
    }
  });

  it("uses unique ids across the whole game", () => {
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prices everything above nothing", () => {
    for (const item of ALL_ITEMS) expect(item.price).toBeGreaterThan(0);
  });

  it("stocks alchemist's fire, so the usable is obtainable", () => {
    const found = itemById("alchemist-fire");
    expect(found).toBeDefined();
    expect(found!.price).toBe(50);
    expect(stockFor("general-store").some((i) => i.id === "alchemist-fire")).toBe(true);
  });
});

describe("selling", () => {
  it("pays half, rounded down", () => {
    expect(sellPrice(10)).toBe(5);
    expect(sellPrice(15)).toBe(7);
    expect(sellPrice(50)).toBe(25);
  });

  it("never pays nothing, even for a 1gp item", () => {
    expect(sellPrice(1)).toBe(1);
  });

  it("can price anything that is buyable", () => {
    for (const item of ALL_ITEMS) {
      expect(itemById(item.id)).toBeDefined();
    }
  });
});

describe("identify", () => {
  it("names strange catalog items and skips ordinary gear", () => {
    const said = identifyPack(["dagger", "bag-holding"]);
    expect(said).toContain("Bag of holding");
    expect(said).not.toContain("nothing with a story");
    expect(said).not.toContain("Dagger");
  });

  it("says ordinary gear has no story", () => {
    expect(identifyPack(["rope-50"])).toContain("nothing with a story");
  });

  it("admits what nobody can name", () => {
    expect(identifyPack(["not-a-real-id"])).toContain("nobody here can name");
  });

  it("names a potion", () => {
    expect(identifyPack(["potion-healing"])).toContain("Potion of healing");
  });
});

describe("the inn", () => {
  it("never offers a companion above the character's level", () => {
    const c = emptyCharacter("00000000-0000-0000-0000-000000000001");
    c.classes = [{ classIndex: "fighter", level: 1, subclassIndex: null }];
    for (let day = 1; day <= 40; day++) {
      const who = companionOfTheDay(day, c);
      expect(who).not.toBeNull();
      expect(who!.minLevel).toBeLessThanOrEqual(1);
    }
  });

  it("opens up higher-level help as the character grows", () => {
    const low = emptyCharacter("00000000-0000-0000-0000-000000000002");
    low.classes = [{ classIndex: "fighter", level: 1, subclassIndex: null }];
    const high = emptyCharacter("00000000-0000-0000-0000-000000000003");
    high.classes = [{ classIndex: "fighter", level: 5, subclassIndex: null }];

    const lowPool = new Set(
      Array.from({ length: 60 }, (_, d) => companionOfTheDay(d + 1, low)!.id),
    );
    const highPool = new Set(
      Array.from({ length: 60 }, (_, d) => companionOfTheDay(d + 1, high)!.id),
    );
    expect(highPool.size).toBeGreaterThan(lowPool.size);
  });

  it("offers the same person all through one day", () => {
    const c = emptyCharacter("00000000-0000-0000-0000-000000000001");
    c.classes = [{ classIndex: "rogue", level: 3, subclassIndex: null }];
    expect(companionOfTheDay(7, c)!.id).toBe(companionOfTheDay(7, c)!.id);
  });

  it("changes who is at the bar as days pass", () => {
    const c = emptyCharacter("00000000-0000-0000-0000-000000000001");
    c.classes = [{ classIndex: "rogue", level: 5, subclassIndex: null }];
    const seen = new Set(
      Array.from({ length: 20 }, (_, d) => companionOfTheDay(d + 1, c)!.id),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it("gives every companion a fee, a role and a line", () => {
    for (const c of COMPANIONS) {
      expect(c.fee).toBeGreaterThan(0);
      expect(c.role.length).toBeGreaterThan(2);
      expect(c.line.length).toBeGreaterThan(10);
    }
  });

  it("always has a rumour to tell", () => {
    for (let d = 1; d <= 30; d++) {
      expect(rumourOfTheDay(d).length).toBeGreaterThan(10);
    }
  });
});
