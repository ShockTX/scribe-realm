/**
 * What a bought item actually does once you put it on.
 *
 * The shop sells ids; this file is the only place that knows an id means
 * "18 pounds of scale mail, AC 14, and your dexterity barely counts".
 * Anything not listed here is simply carried, which is a legitimate answer.
 */

export type Slot =
  | "armor"
  | "shield"
  | "mainHand"
  | "offHand"
  | "head"
  | "hands"
  | "cloak"
  | "feet"
  | "focus";

export const SLOTS: { id: Slot; label: string; hint: string }[] = [
  { id: "armor", label: "Body", hint: "Armour, worn" },
  { id: "shield", label: "Shield arm", hint: "A shield, strapped" },
  { id: "mainHand", label: "Main hand", hint: "The weapon you lead with" },
  { id: "offHand", label: "Off hand", hint: "A second weapon, or nothing" },
  { id: "head", label: "Head", hint: "Helm" },
  { id: "hands", label: "Forearms", hint: "Bracers" },
  { id: "cloak", label: "Shoulders", hint: "Cloak" },
  { id: "feet", label: "Feet", hint: "Boots" },
  { id: "focus", label: "Focus", hint: "What a caster channels through" },
];

export type ArmorWeight = "light" | "medium" | "heavy" | "shield";

export interface ArmorSpec {
  /** the number on the plate before dexterity */
  base: number;
  weight: ArmorWeight;
  /** how much dexterity it will let you keep; null means all of it */
  dexCap: number | null;
  /** strength you need before it slows you down */
  minStr?: number;
  stealthPenalty?: boolean;
}

export const ARMOR: Record<string, ArmorSpec> = {
  padded: { base: 11, weight: "light", dexCap: null, stealthPenalty: true },
  leather: { base: 11, weight: "light", dexCap: null },
  "studded-leather": { base: 12, weight: "light", dexCap: null },
  hide: { base: 12, weight: "medium", dexCap: 2 },
  "chain-shirt": { base: 13, weight: "medium", dexCap: 2 },
  "scale-mail": { base: 14, weight: "medium", dexCap: 2, stealthPenalty: true },
  breastplate: { base: 14, weight: "medium", dexCap: 2 },
  "half-plate": { base: 15, weight: "medium", dexCap: 2, stealthPenalty: true },
  "ring-mail": { base: 14, weight: "heavy", dexCap: 0, stealthPenalty: true },
  "chain-mail": { base: 16, weight: "heavy", dexCap: 0, minStr: 13, stealthPenalty: true },
  shield: { base: 2, weight: "shield", dexCap: null },
};

export interface WeaponSpec {
  damage: string;
  /** ability the attack uses; "finesse" means take the better of str/dex */
  uses: "str" | "dex" | "finesse";
  hands: 1 | 2;
  ranged?: boolean;
  note?: string;
}

export const WEAPONS: Record<string, WeaponSpec> = {
  dagger: { damage: "1d4 piercing", uses: "finesse", hands: 1, note: "Thrown, if it comes to that." },
  handaxe: { damage: "1d6 slashing", uses: "str", hands: 1, note: "Thrown 20/60." },
  shortsword: { damage: "1d6 piercing", uses: "finesse", hands: 1 },
  spear: { damage: "1d6 piercing", uses: "str", hands: 1, note: "1d8 in two hands." },
  mace: { damage: "1d6 bludgeoning", uses: "str", hands: 1 },
  warhammer: { damage: "1d8 bludgeoning", uses: "str", hands: 1 },
  longsword: { damage: "1d8 slashing", uses: "str", hands: 1, note: "1d10 in two hands." },
  battleaxe: { damage: "1d8 slashing", uses: "str", hands: 1 },
  rapier: { damage: "1d8 piercing", uses: "finesse", hands: 1 },
  greatsword: { damage: "2d6 slashing", uses: "str", hands: 2 },
  greataxe: { damage: "1d12 slashing", uses: "str", hands: 2 },
  shortbow: { damage: "1d6 piercing", uses: "dex", hands: 2, ranged: true },
  longbow: { damage: "1d8 piercing", uses: "dex", hands: 2, ranged: true },
  "light-crossbow": { damage: "1d8 piercing", uses: "dex", hands: 2, ranged: true },
  sling: { damage: "1d4 bludgeoning", uses: "dex", hands: 1, ranged: true },
};

/** Odds and ends that sit in a slot without changing a number. */
const WEARABLE: Record<string, Slot> = {
  helm: "head",
  bracers: "hands",
  "cloak-oiled": "cloak",
  "boots-travel": "feet",
  "arcane-focus": "focus",
  "component-pouch": "focus",
  "holy-symbol": "focus",
  "holy-symbol-silver": "focus",
  "spellbook-blank": "focus",
  "crystal-ball-cracked": "focus",
  "everburning-torch": "offHand",
};

/** Which slots an item id may legally go into, best first. */
export function slotsFor(itemId: string): Slot[] {
  const armor = ARMOR[itemId];
  if (armor) return armor.weight === "shield" ? ["shield"] : ["armor"];
  const weapon = WEAPONS[itemId];
  if (weapon) return weapon.hands === 2 ? ["mainHand"] : ["mainHand", "offHand"];
  const worn = WEARABLE[itemId];
  if (worn) return [worn];
  return [];
}

export function isEquippable(itemId: string): boolean {
  return slotsFor(itemId).length > 0;
}

export type Equipped = Partial<Record<Slot, string | null>>;

export function emptyEquipped(): Equipped {
  return {};
}

/**
 * Armour class from what is actually worn.
 * Unarmoured is 10 + dex, which is where everyone starts.
 */
export function armorClassFrom(equipped: Equipped, dexMod: number): {
  value: number;
  from: string;
} {
  const bodyId = equipped.armor ?? null;
  const body = bodyId ? ARMOR[bodyId] : undefined;

  let value: number;
  let from: string;

  if (body && body.weight !== "shield") {
    const dex = body.dexCap === null ? dexMod : Math.min(dexMod, body.dexCap);
    value = body.base + dex;
    from = bodyId!;
  } else {
    value = 10 + dexMod;
    from = "unarmoured";
  }

  const shieldId = equipped.shield ?? null;
  if (shieldId && ARMOR[shieldId]?.weight === "shield") {
    value += ARMOR[shieldId].base;
    from += " + shield";
  }

  return { value, from };
}

/** A two-handed weapon takes the off hand with it. */
export function equip(
  equipped: Equipped,
  slot: Slot,
  itemId: string,
): Equipped {
  const next: Equipped = { ...equipped, [slot]: itemId };
  const weapon = WEAPONS[itemId];
  if (slot === "mainHand" && weapon?.hands === 2) next.offHand = null;
  if (slot === "offHand") {
    const main = next.mainHand ? WEAPONS[next.mainHand] : undefined;
    if (main?.hands === 2) next.mainHand = null;
  }
  return next;
}

export function unequip(equipped: Equipped, slot: Slot): Equipped {
  return { ...equipped, [slot]: null };
}

/** Everything currently worn, as a flat list of item ids. */
export function wornIds(equipped: Equipped): string[] {
  return Object.values(equipped).filter((v): v is string => typeof v === "string" && v.length > 0);
}
