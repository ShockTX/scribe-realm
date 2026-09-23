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
  if (/(crypt|vault|deep|bone|tomb|barrow|inland|hill)/.test(hay)) {
    return SITES[2];
  }
  if (/(shrine|sunken|drowned town|under|cave|crystal|lake|below)/.test(hay)) {
    return SITES[1];
  }
  if (/(headland|ruin|crown|tide|causeway|coast|cliff|north)/.test(hay)) {
    return SITES[0];
  }
  // Default to the nearest, so a level 1 character is not sent three days out.
  return SITES[0];
}
