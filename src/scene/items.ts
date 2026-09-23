/**
 * Things in your pack you can use mid-fight.
 *
 * Buying a healing potion and never being able to drink it is the kind of
 * hollowness this file exists to remove. Ids match the shop's ids exactly.
 */

export interface UsableItem {
  id: string;
  verb: string;
  /** healing dice, if it heals */
  heal?: string;
  /** damage dice thrown at one foe */
  damage?: string;
  /** dex save to avoid, for thrown things */
  save?: "dex" | "con";
  /** double damage against undead */
  vsUndead?: boolean;
  /** added to the next weapon hit */
  weaponBonus?: string;
  blurb: string;
}

export const USABLES: UsableItem[] = [
  { id: "potion-healing", verb: "Drink a healing potion", heal: "2d4+2", blurb: "Iron and violets." },
  { id: "potion-healing-greater", verb: "Drink a greater potion", heal: "4d4+4", blurb: "Greel's best." },
  { id: "poultice", verb: "Bind a poultice", heal: "1d4", blurb: "Crude, but it is something." },
  { id: "salve-burn", verb: "Smear burn salve", heal: "1d4", blurb: "Goose fat and comfrey." },
  { id: "smelling-salts", verb: "Crack the salts", heal: "1d3", blurb: "Back from the edge of the dark." },
  { id: "bandages", verb: "Bandage the worst of it", heal: "1d3", blurb: "Boiled clean." },
  { id: "oil-flask", verb: "Throw a flask of oil", damage: "2d6", save: "dex", blurb: "Burns all at once." },
  { id: "holy-water", verb: "Throw holy water", damage: "2d6", save: "dex", vsUndead: true, blurb: "Drawn at the tide-turn." },
  { id: "poison-basic", verb: "Coat your blade", weaponBonus: "1d4", blurb: "He wrote your name in the ledger for this." },
  { id: "alchemist-fire", verb: "Throw alchemist's fire", damage: "1d4", save: "dex", blurb: "Sticks, and keeps burning." },
];

export function usable(id: string): UsableItem | undefined {
  return USABLES.find((u) => u.id === id);
}

/** What in this pack can be used right now, folded to one row per kind. */
export function usablesIn(pack: string[]): { item: UsableItem; count: number }[] {
  const counts = new Map<string, number>();
  for (const id of pack) if (usable(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => ({ item: usable(id)!, count }));
}
