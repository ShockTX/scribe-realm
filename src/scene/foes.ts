/**
 * What you fight.
 *
 * The Warden may ask for a fight and name the enemy. It may NOT invent the
 * enemy's numbers — it picks from this table by id, or names something close
 * and we match it. Statblocks are SRD-shaped and deliberately small.
 */

export interface FoeSpec {
  id: string;
  name: string;
  ac: number;
  hp: number;
  attack: string;
  toHit: number;
  damage: string;
  /** rough tier, used to keep a level 1 party alive */
  tier: 1 | 2 | 3;
  undead?: boolean;
  note?: string;
}

export const FOES: FoeSpec[] = [
  { id: "rat-swarm", name: "Swarm of rats", ac: 10, hp: 7, attack: "Bites", toHit: 2, damage: "1d6", tier: 1 },
  { id: "bandit", name: "Bandit", ac: 12, hp: 11, attack: "Scimitar", toHit: 3, damage: "1d6+1", tier: 1 },
  { id: "goblin", name: "Goblin", ac: 15, hp: 7, attack: "Scimitar", toHit: 4, damage: "1d6+2", tier: 1 },
  { id: "kobold", name: "Kobold", ac: 12, hp: 5, attack: "Dagger", toHit: 4, damage: "1d4+2", tier: 1 },
  { id: "giant-rat", name: "Giant rat", ac: 12, hp: 7, attack: "Bite", toHit: 4, damage: "1d4+2", tier: 1 },
  { id: "skeleton", name: "Skeleton", ac: 13, hp: 13, attack: "Shortsword", toHit: 4, damage: "1d6+2", tier: 1, undead: true },
  { id: "zombie", name: "Zombie", ac: 8, hp: 22, attack: "Slam", toHit: 3, damage: "1d6+1", tier: 1, undead: true, note: "Slow, and hard to put down." },
  { id: "stirge", name: "Stirge", ac: 14, hp: 5, attack: "Blood drain", toHit: 5, damage: "1d4+3", tier: 1 },
  { id: "crystal-crawler", name: "Crystal crawler", ac: 14, hp: 13, attack: "Shard claws", toHit: 4, damage: "1d6+2", tier: 2, note: "Glass grown into a shape that hunts." },
  { id: "drowned-one", name: "Drowned one", ac: 11, hp: 18, attack: "Cold grip", toHit: 4, damage: "1d8+1", tier: 2, undead: true },
  { id: "cultist", name: "Cultist", ac: 12, hp: 9, attack: "Sickle", toHit: 3, damage: "1d4+1", tier: 1 },
  { id: "hobgoblin", name: "Hobgoblin", ac: 18, hp: 11, attack: "Longsword", toHit: 3, damage: "1d8+1", tier: 2 },
  { id: "ghoul", name: "Ghoul", ac: 12, hp: 22, attack: "Claws", toHit: 4, damage: "2d4+2", tier: 3, undead: true },
  { id: "wight", name: "Wight", ac: 14, hp: 45, attack: "Longsword", toHit: 4, damage: "1d8+2", tier: 3, undead: true },
  { id: "bone-guard", name: "Bone guard", ac: 16, hp: 30, attack: "Greataxe", toHit: 5, damage: "1d12+3", tier: 3, undead: true },
];

export function foeById(id: string): FoeSpec | undefined {
  return FOES.find((f) => f.id === id);
}

/** The Warden says "goblins"; we find the nearest real statblock. */
export function matchFoe(name: string): FoeSpec {
  const n = name.toLowerCase().trim().replace(/s$/, "");
  const exact = FOES.find((f) => f.id === n || f.name.toLowerCase() === n);
  if (exact) return exact;
  const loose = FOES.find((f) => f.name.toLowerCase().includes(n) || n.includes(f.id.split("-")[0]));
  return loose ?? FOES[1];
}

/** Never throw a wight at a level 1 character because the model felt like it. */
export function tierCap(level: number): 1 | 2 | 3 {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

/**
 * Pick a foe suited to the place and the character's level.
 * Used by the FIGHT button, where the player picks the fight rather than the
 * Warden. Site flavour decides the pool; tier cap decides what's survivable.
 */
export function pickFoe(siteId: string, level: number): { name: string; count: number } {
  const cap = tierCap(level);
  const flavour: Record<string, string[]> = {
    "crystal-cavern": ["crystal-crawler", "giant-rat", "kobold", "stirge"],
    "hill-ruin": ["bandit", "goblin", "hobgoblin", "cultist"],
    "deep-vault": ["skeleton", "zombie", "drowned-one", "ghoul", "bone-guard"],
  };
  const ids = flavour[siteId] ?? FOES.map((f) => f.id);
  const pool = ids
    .map((id) => foeById(id))
    .filter((f): f is FoeSpec => !!f && f.tier <= cap);
  const spec = pool.length ? pool[Math.floor(Math.random() * pool.length)] : FOES[1];
  const count = spec.tier >= cap && spec.hp > 20 ? 1 : 1 + (Math.random() < 0.4 ? 1 : 0);
  return { name: spec.name, count };
}
