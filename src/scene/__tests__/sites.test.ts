import { describe, expect, it } from "vitest";
import { SITES, siteForQuest, siteIsMapped } from "../sites";

const wilds = SITES.find((s) => s.id === "wilds")!;

describe("the wilds", () => {
  it("is a map, and the painted sites are not", () => {
    expect(siteIsMapped(wilds)).toBe(true);
    expect(wilds.art).toBe("/art/sites/wilds.jpg");
    for (const site of SITES) {
      if (site.id === "wilds") continue;
      expect(siteIsMapped(site), site.id).toBe(false);
    }
  });

  it("starts a walk at the waycamp", () => {
    expect(wilds.rooms[0].id).toBe("waycamp");
  });

  it("keeps every hotspot on the painting and big enough to hit", () => {
    for (const room of wilds.rooms) {
      const h = room.hotspot!;
      expect(h, room.id).toBeTruthy();
      expect(h.left, room.id).toBeGreaterThanOrEqual(0);
      expect(h.top, room.id).toBeGreaterThanOrEqual(0);
      expect(h.left + h.width, room.id).toBeLessThanOrEqual(100);
      expect(h.top + h.height, room.id).toBeLessThanOrEqual(100);
      expect(h.width, room.id).toBeGreaterThanOrEqual(5);
      expect(h.height, room.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("does not stack two places on top of each other", () => {
    const rooms = wilds.rooms;
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i].hotspot!;
        const b = rooms[j].hotspot!;
        const apart =
          a.left + a.width <= b.left ||
          b.left + b.width <= a.left ||
          a.top + a.height <= b.top ||
          b.top + b.height <= a.top;
        expect(apart, `${rooms[i].id} overlaps ${rooms[j].id}`).toBe(true);
      }
    }
  });

  it("sends ordinary work into the wood, and tombs where tombs are", () => {
    expect(siteForQuest("the track past the gate", "A missing goat").id).toBe("wilds");
    expect(siteForQuest("the old stones", "Lights in the ring").id).toBe("wilds");
    expect(siteForQuest("the headland", "The Drowned Crown").id).toBe("hill-ruin");
    expect(siteForQuest("below the shrine", "The sunken stair").id).toBe("crystal-cavern");
    expect(siteForQuest("the tomb inland", "The royal vault").id).toBe("deep-vault");
  });
});
