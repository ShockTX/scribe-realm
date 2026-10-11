/**
 * What a bought item actually does once you put it on.
 *
 * The shop sells ids; this file is the only place that knows an id means
 * "18 pounds of scale mail, AC 14, and your dexterity barely counts".
 * Anything not listed here is simply carried, which is a legitimate answer.
 *
 * P8 — the single-copy invariant: one pack copy outfits one slot. equip()
 * consumes a copy from the pack and returns the previous occupant to it
 * (a swap); unequip() returns the worn copy. Nothing worn is ever conjured
 * out of nothing, so one bought dagger can never outfit the whole party.
 */

import type { Character } from "../model/character";

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
  /** die used when the other hand is empty, e.g. a longsword's 1d10 */
  twoHands?: string;
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
  spear: { damage: "1d6 piercing", twoHands: "1d8", uses: "str", hands: 1, note: "1d8 in two hands." },
  mace: { damage: "1d6 bludgeoning", uses: "str", hands: 1 },
  warhammer: { damage: "1d8 bludgeoning", uses: "str", hands: 1 },
  longsword: { damage: "1d8 slashing", twoHands: "1d10", uses: "str", hands: 1, note: "1d10 in two hands." },
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

/** The die a swing actually uses. Two hands only when the other is empty. */
export function damageExpr(spec: WeaponSpec, bothHands: boolean): string {
  const raw = bothHands && spec.twoHands ? spec.twoHands : spec.damage;
  return raw.replace(/\s.*$/, "");
}

/** A shield or anything in the off hand keeps a weapon one-handed. */
export function bothHandsFree(equipped: Equipped): boolean {
  if (equipped.offHand) return false;
  const shield = equipped.shield ? ARMOR[equipped.shield] : undefined;
  return !(shield && shield.weight === "shield");
}

export function offHandWeapon(equipped: Equipped): { id: string; spec: WeaponSpec } | null {
  const id = equipped.offHand ?? null;
  if (!id) return null;
  const spec = WEAPONS[id];
  return spec ? { id, spec } : null;
}

/** A two-handed weapon takes the off hand with it. Pure slot write — no pack
 *  movement. Prefer the Character-level equip()/unequip() below, which keep
 *  the single-copy invariant; this stays exported for the displacement math
 *  and for tests. */
export function equipSlot(
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

/** Pure slot clear — no pack movement. Prefer Character-level unequip(). */
export function unequipSlot(equipped: Equipped, slot: Slot): Equipped {
  return { ...equipped, [slot]: null };
}

/** Everything currently worn, as a flat list of item ids. */
export function wornIds(equipped: Equipped): string[] {
  return Object.values(equipped).filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** Every id worn by anyone — the hero plus every hire. Used to keep one
 *  bought copy from outfitting two bodies, and to hide worn ghosts from the
 *  pick lists. */
export function allWornIds(character: {
  equipped?: Equipped;
  companionGear?: Record<string, Equipped>;
}): string[] {
  const ids = wornIds((character.equipped ?? {}) as Equipped);
  for (const gear of Object.values(character.companionGear ?? {})) {
    ids.push(...wornIds((gear ?? {}) as Equipped));
  }
  return ids;
}

/**
 * Strip every slot holding `id`. Selling (or any pack removal) must not
 * leave a ghost on the sheet — a sold thing is unworn everywhere first.
 */
export function unequipId(equipped: Equipped, id: string): Equipped {
  const next: Equipped = { ...equipped };
  for (const slot of Object.keys(next) as Slot[]) {
    if (next[slot] === id) next[slot] = null;
  }
  return next;
}

function gearOf(character: Character, holder: string): Equipped {
  if (holder === "hero") return ((character.equipped ?? {}) as Equipped);
  return (((character.companionGear ?? {})[holder] ?? {}) as Equipped);
}

function withGear(character: Character, holder: string, gear: Equipped, pack: string[]): Character {
  if (holder === "hero") return { ...character, equipped: gear, pack };
  return {
    ...character,
    pack,
    companionGear: { ...(character.companionGear ?? {}), [holder]: gear },
  };
}

/**
 * Put on what the pack holds. Requires a pack copy of `itemId` — one copy
 * outfits one slot — consumes it, and returns the previous occupant of the
 * slot to the pack (a swap). A two-handed weapon displaces the off hand
 * (and vice versa); the displaced copy goes back to the pack too, never to
 * the void. Stale taps (no copy, illegal slot) return the character
 * unchanged. `holder` is "hero" or a companion id; every hire draws from the
 * same pack, so companions can never duplicate an id without buying a copy.
 */
export function equip(
  character: Character,
  slot: Slot,
  itemId: string,
  holder: string = "hero",
): Character {
  if (!slotsFor(itemId).includes(slot)) return character;
  const pack = [...character.pack];
  const i = pack.indexOf(itemId);
  if (i === -1) return character;
  const current = gearOf(character, holder);
  const prevId = current[slot] ?? null;
  const beforeMain = current.mainHand ?? null;
  const beforeOff = current.offHand ?? null;
  const next = equipSlot(current, slot, itemId);
  pack.splice(i, 1);
  if (prevId) pack.push(prevId);
  // Two-handed clearing vacates the other hand — hand its copy back too
  // (even when both hands held the same id: those were two copies).
  if (slot === "mainHand" && beforeOff && !next.offHand) pack.push(beforeOff);
  if (slot === "offHand" && beforeMain && !next.mainHand) pack.push(beforeMain);
  return withGear(character, holder, next, pack);
}

/**
 * Take it off — the worn copy returns to the pack. An empty slot returns the
 * character unchanged.
 */
export function unequip(
  character: Character,
  slot: Slot,
  holder: string = "hero",
): Character {
  const current = gearOf(character, holder);
  const id = current[slot] ?? null;
  if (!id) return character;
  return withGear(character, holder, unequipSlot(current, slot), [...character.pack, id]);
}
