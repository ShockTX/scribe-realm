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
    name: "The Bonehold",
    approach: "three days inland, under a hill the maps refuse to name",
    art: "/art/sites/deep-vault.jpg",
    travelHours: 72,
    description:
      "A worked complex beneath a hill, half natural cave and half something older that cut square rooms out of the rock and then left. Underground lakes feed a river that runs through the halls. The air is dry where it should be wet. Nothing here has rotted, which is the wrong kind of good news.",
    rooms: [
      { id: "approach", name: "The Lower Lake", note: "an underground shore, the way in, cold and echoing" },
      { id: "pillar", name: "The Pillar of Skulls", note: "a natural column carved over with faces" },
      { id: "trophies", name: "The Hall of Trophies", note: "racked arms and armour of a dozen makes, all dusty, none rusted" },
      { id: "lab", name: "The Alchemical Lab", note: "glassware intact, ingredients labelled in no living script" },
      { id: "audience", name: "The Audience Hall", note: "a long room built for someone to be looked at in" },
      { id: "screams", name: "The Chamber of Screams", note: "acoustics that turn a whisper into a voice" },
      { id: "vault", name: "The Grand Vault", note: "the deep room, the reason anyone comes, sealed" },
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
