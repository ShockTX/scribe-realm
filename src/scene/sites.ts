/**
 * Places outside the town walls. A quest sends you to one of these, and the
 * beats of the run happen in its rooms.
 *
 * Each site is a painted map. Rooms are named areas on it, so the GM has
 * concrete geography to write about instead of inventing a new cave each time.
 */

export interface SiteRoom {
  id: string;
  name: string;
  /** what the GM is told is here, in one line */
  note: string;
  /**
   * Percentages of the site map. Present only when the place is a map
   * the player can walk, not a painting they merely look at.
   */
  hotspot?: { left: number; top: number; width: number; height: number };
}

export interface Site {
  id: string;
  name: string;
  /** how the town refers to it */
  approach: string;
  art: string;
  /** one paragraph, read on arrival */
  description: string;
  /** roughly how far out, in hours */
  travelHours: number;
  rooms: SiteRoom[];
}

export const SITES: Site[] = [
  {
    id: "hill-ruin",
    name: "The Drowned Crown",
    approach: "a headland an hour north, where a ring of old stone sits above the tide",
    art: "/art/sites/hill-ruin.png",
    travelHours: 1,
    description:
      "A broken ring of wall on a green hill, with the sea on three sides and the causeway swallowed twice a day. Someone built here to be seen, and then someone else pulled it down. Gulls nest in the gatehouse. The grass inside the ring is too green, and grows in a circle nobody planted.",
    rooms: [
      { id: "causeway", name: "The Causeway", note: "a stone path that floods at high tide; timing matters" },
      { id: "gatehouse", name: "The Gatehouse", note: "collapsed arch, gull nests, a guard post with something still in it" },
      { id: "ring", name: "The Inner Ring", note: "an open green court walled in fallen stone, unnaturally lush" },
      { id: "stone", name: "The Standing Stone", note: "a single squared block at the centre, worn smooth, warm to touch" },
      { id: "scree", name: "The Seaward Scree", note: "a rubble slope down to the water, loose and treacherous" },
    ],
  },
  {
    id: "crystal-cavern",
    name: "The Glimmering Undercroft",
    approach: "a flooded stair beneath the Drowned Shrine, where the old town still stands",
    art: "/art/sites/crystal-cavern.png",
    travelHours: 0,
    description:
      "Below the shrine, the old town did not fall — it sank, and kept its shape. Streets of masonry run down into a cavern where crystal has grown through the walls like frost through a window, blue and violet and lit from inside. A black lake fills what used to be the market square. The water does not ripple unless something moves it.",
    rooms: [
      { id: "steps", name: "The Sunken Steps", note: "a stair down into the old town, ankle-deep, then knee-deep" },
      { id: "houses", name: "The Drowned Houses", note: "roofed buildings still standing, doors intact, contents not" },
      { id: "plaza", name: "The Cracked Plaza", note: "a wide flagstone court with a fissure across it" },
      { id: "lake", name: "The Black Lake", note: "still deep water, the old market square, something beneath" },
      { id: "crystal", name: "The Crystal Beds", note: "growths taller than a man, humming faintly, sharp as glass" },
      { id: "span", name: "The Broken Span", note: "a bridge over the lake with a section missing" },
      { id: "vault", name: "The Sealed Vault", note: "a door in the deepest wall, still locked, still holding" },
    ],
  },
  {
    id: "deep-vault",
    name: "The Sunken Citadel",
    approach: "three days inland, under a hill the maps refuse to name",
    art: "/art/sites/sunken-citadel.png",
    travelHours: 72,
    description:
      "A whole fortress drowned inside a cavern, its halls still standing in water the colour of bottle glass. Causeways run between barracks and vaults; a broken bridge hangs over the deep. Somebody sealed the Royal Vault from the inside, and the Warden's Tower still has a light in it.",
    rooms: [
      { id: "gate", name: "Moonfall Gate", note: "the way in, a arched gatehouse above the waterline" },
      { id: "echoes", name: "The Hall of Echoes", note: "a pillared hall where every footfall is answered twice" },
      { id: "crypts", name: "The Flooded Crypts", note: "chest-deep water over broken sarcophagi" },
      { id: "bridge", name: "The Broken Bridge", note: "a span with the middle gone, ropes still hanging" },
      { id: "barracks", name: "The Lower Barracks", note: "racked bunks and rusted arms, something living in them now" },
      { id: "forge", name: "The Ember Forge", note: "a forge still hot, which nothing explains" },
      { id: "archive", name: "The Crystal Archive", note: "a shard of blue crystal grown through the shelves" },
      { id: "chapel", name: "The Iron Chapel", note: "black iron pews facing a defaced altar" },
      { id: "tower", name: "The Warden\'s Tower", note: "a lit window at the top, and stairs that go up forever" },
      { id: "vault", name: "The Royal Vault", note: "sealed from the inside, the reason anyone comes" },
    ],
  },
  {
    id: "wilds",
    name: "The Wilds",
    approach: "the wood and water just beyond the town gate",
    art: "/art/sites/wilds.jpg",
    travelHours: 1,
    description:
      "Past the gate the road gives up and becomes a track. A river cuts the wood in two, crossed twice by plank bridges, and the old stones still stand in the grass where someone meant them to. There is a camp that is not quite abandoned, a cave on either cliff, and a boat at a dock nobody is minding.",
    rooms: [
      { id: "waycamp", name: "The Waycamp", note: "a tent, a wagon, and a fire that has been fed", hotspot: { left: 1, top: 23, width: 20, height: 22 } },
      { id: "hanging-tree", name: "The Hanging Tree", note: "an old tree with bones at its roots, overlooking the paths", hotspot: { left: 4, top: 1, width: 26, height: 20 } },
      { id: "west-mouth", name: "The West Mouth", note: "a cave in the rock, with steps cut up to the mouth", hotspot: { left: 2, top: 49, width: 20, height: 16 } },
      { id: "broken-ring", name: "The Broken Ring", note: "standing stones in a circle, one of them still upright", hotspot: { left: 33, top: 32, width: 26, height: 24 } },
      { id: "falls", name: "The Falls", note: "the river comes over the rock here, loud and cold", hotspot: { left: 60, top: 0, width: 14, height: 14 } },
      { id: "high-shelf", name: "The High Shelf", note: "a cliff cave with a fire lit and a chest left behind", hotspot: { left: 79, top: 2, width: 19, height: 23 } },
      { id: "north-bridge", name: "The North Bridge", note: "planks over the river, the cliff path on the far side", hotspot: { left: 75, top: 27, width: 16, height: 10 } },
      { id: "south-bridge", name: "The South Bridge", note: "a longer span, lower down, where the water widens", hotspot: { left: 55, top: 66, width: 24, height: 11 } },
      { id: "reed-dock", name: "The Reed Dock", note: "a jetty, a rowboat, and nets left to dry", hotspot: { left: 27, top: 77, width: 13, height: 15 } },
      { id: "midstream", name: "The Midstream Rock", note: "a rock in the pool, big enough to stand on", hotspot: { left: 41, top: 79, width: 14, height: 13 } },
    ],
  },
];

export function siteById(id: string): Site | undefined {
  return SITES.find((s) => s.id === id);
}

export function roomById(site: Site, id: string): SiteRoom | undefined {
  return site.rooms.find((r) => r.id === id);
}

/** Which site a quest sends you to. The GM names it; this maps loosely. */
export function siteForQuest(where: string, title: string): Site {
  const hay = `${where} ${title}`.toLowerCase();
  if (/(citadel|crypt|tomb|barrow|royal vault)/.test(hay)) {
    return siteById("deep-vault") ?? SITES[2];
  }
  if (/(shrine|crystal|undercroft|drowned town|sunken)/.test(hay)) {
    return siteById("crystal-cavern") ?? SITES[1];
  }
  if (/(headland|drowned crown|causeway)/.test(hay)) {
    return siteById("hill-ruin") ?? SITES[0];
  }
  // Everything else is the wood outside the gate, not a three-day march.
  return siteById("wilds") ?? SITES[0];
}

export function siteIsMapped(site: Site): boolean {
  return site.rooms.some((r) => r.hotspot);
}
