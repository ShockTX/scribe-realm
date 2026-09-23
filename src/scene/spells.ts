/**
 * Spells that are actually implemented.
 *
 * A spell the character knows but that is not in this table cannot be cast in
 * a fight — the sheet still lists it, but the engine will not pretend. Better
 * a short honest list than 319 spells the model hallucinates the effect of.
 */

export type SpellShape = "attack" | "save" | "heal" | "buff";

export interface SpellEffect {
  index: string;
  name: string;
  level: number;
  shape: SpellShape;
  /** damage or healing dice, e.g. "1d10" */
  dice?: string;
  /** for save spells: which ability the target rolls */
  save?: "dex" | "con" | "wis" | "str" | "int" | "cha";
  /** half damage on a successful save */
  halfOnSave?: boolean;
  /** hits every foe */
  areaOfEffect?: boolean;
  /** temporary AC or to-hit help, for buffs */
  acBonus?: number;
  rounds?: number;
  blurb: string;
}

export const SPELL_EFFECTS: SpellEffect[] = [
  { index: "fire-bolt", name: "Fire Bolt", level: 0, shape: "attack", dice: "1d10", blurb: "A mote of fire, thrown." },
  { index: "ray-of-frost", name: "Ray of Frost", level: 0, shape: "attack", dice: "1d8", blurb: "Cold enough to slow a body." },
  { index: "shocking-grasp", name: "Shocking Grasp", level: 0, shape: "attack", dice: "1d8", blurb: "Lightning off the palm." },
  { index: "sacred-flame", name: "Sacred Flame", level: 0, shape: "save", dice: "1d8", save: "dex", blurb: "Radiance, and no cover from it." },
  { index: "eldritch-blast", name: "Eldritch Blast", level: 0, shape: "attack", dice: "1d10", blurb: "A beam of crackling force." },
  { index: "poison-spray", name: "Poison Spray", level: 0, shape: "save", dice: "1d12", save: "con", blurb: "A puff of foul greenish gas." },
  { index: "chill-touch", name: "Chill Touch", level: 0, shape: "attack", dice: "1d8", blurb: "A skeletal hand closes on them." },
  { index: "magic-missile", name: "Magic Missile", level: 1, shape: "attack", dice: "3d4+3", blurb: "Three darts. They do not miss." },
  { index: "burning-hands", name: "Burning Hands", level: 1, shape: "save", dice: "3d6", save: "dex", halfOnSave: true, areaOfEffect: true, blurb: "A sheet of flame from spread fingers." },
  { index: "thunderwave", name: "Thunderwave", level: 1, shape: "save", dice: "2d8", save: "con", halfOnSave: true, areaOfEffect: true, blurb: "A wave of thunderous force." },
  { index: "guiding-bolt", name: "Guiding Bolt", level: 1, shape: "attack", dice: "4d6", blurb: "A flash of light, and they are easier to hit after." },
  { index: "inflict-wounds", name: "Inflict Wounds", level: 1, shape: "attack", dice: "3d10", blurb: "Necrotic, and close enough to smell." },
  { index: "cure-wounds", name: "Cure Wounds", level: 1, shape: "heal", dice: "1d8+3", blurb: "Flesh knits under your hand." },
  { index: "healing-word", name: "Healing Word", level: 1, shape: "heal", dice: "1d4+3", blurb: "A word, and the bleeding slows." },
  { index: "shield-of-faith", name: "Shield of Faith", level: 1, shape: "buff", acBonus: 2, rounds: 5, blurb: "A shimmering field, quietly held." },
  { index: "mage-armor", name: "Mage Armor", level: 1, shape: "buff", acBonus: 3, rounds: 8, blurb: "Force, worn like a coat." },
  { index: "bless", name: "Bless", level: 1, shape: "buff", acBonus: 1, rounds: 5, blurb: "Your hand is steadier than it was." },
];

export function spellEffect(index: string): SpellEffect | undefined {
  return SPELL_EFFECTS.find((s) => s.index === index);
}

/** Of everything this character knows, what can actually be cast in a fight. */
export function castableIn(known: string[]): SpellEffect[] {
  const seen = new Set<string>();
  const out: SpellEffect[] = [];
  for (const k of known) {
    const e = spellEffect(k);
    if (e && !seen.has(e.index)) {
      seen.add(e.index);
      out.push(e);
    }
  }
  return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}
