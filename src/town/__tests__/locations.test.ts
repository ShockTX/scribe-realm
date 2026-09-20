import { describe, expect, it } from "vitest";
import { LOCATIONS, locationById } from "../locations";

describe("Saltmarrow Reach", () => {
  it("has a worthwhile number of places to visit", () => {
    expect(LOCATIONS.length).toBeGreaterThanOrEqual(10);
  });

  it("gives every location a unique id", () => {
    const ids = LOCATIONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every hotspot inside the map", () => {
    for (const l of LOCATIONS) {
      const h = l.hotspot;
      expect(h.left, l.id).toBeGreaterThanOrEqual(0);
      expect(h.top, l.id).toBeGreaterThanOrEqual(0);
      expect(h.left + h.width, l.id).toBeLessThanOrEqual(100);
      expect(h.top + h.height, l.id).toBeLessThanOrEqual(100);
    }
  });

  it("makes every hotspot big enough to hit", () => {
    for (const l of LOCATIONS) {
      expect(l.hotspot.width, l.id).toBeGreaterThanOrEqual(5);
      expect(l.hotspot.height, l.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("does not overlap two hotspots", () => {
    for (let i = 0; i < LOCATIONS.length; i++) {
      for (let j = i + 1; j < LOCATIONS.length; j++) {
        const a = LOCATIONS[i].hotspot;
        const b = LOCATIONS[j].hotspot;
        const apart =
          a.left + a.width <= b.left ||
          b.left + b.width <= a.left ||
          a.top + a.height <= b.top ||
          b.top + b.height <= a.top;
        expect(apart, `${LOCATIONS[i].id} overlaps ${LOCATIONS[j].id}`).toBe(true);
      }
    }
  });

  it("gives every location something to do", () => {
    for (const l of LOCATIONS) {
      expect(l.services.length, l.id).toBeGreaterThan(0);
      expect(l.description.length, l.id).toBeGreaterThan(60);
      expect(l.keeper.length, l.id).toBeGreaterThan(0);
    }
  });

  it("covers buying, selling, quests, rest, healing and travel somewhere", () => {
    const kinds = new Set(LOCATIONS.flatMap((l) => l.services.map((s) => s.kind)));
    for (const k of ["buy", "sell", "quests", "rest", "heal", "travel"]) {
      expect(kinds.has(k as never), k).toBe(true);
    }
  });

  it("points every painted interior at a real file path", () => {
    for (const l of LOCATIONS) {
      if (l.art) expect(l.art.startsWith("/art/town/"), l.id).toBe(true);
    }
  });

  it("finds a location by id", () => {
    expect(locationById("weaponsmith")?.name).toBe("The Hammer & Tide");
    expect(locationById("nowhere")).toBeUndefined();
  });
});
