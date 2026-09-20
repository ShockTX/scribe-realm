/**
 * The party is you plus whoever you bought a drink for.
 *
 * A companion is not a full character — they have no class levels and no
 * spellbook — so they get their own small block. The sheet renders either,
 * which is why both shapes agree on the fields that matter.
 */
import type { Character } from "../model/character";
import { COMPANIONS, type Companion } from "../town/inn";
import { maxHp, armorClass, modifiers } from "../rules/derive";
import { armorClassFrom, type Equipped } from "./gear";

export interface SheetMember {
  key: string;
  name: string;
  /** "Wizard 3" for the hero, "Sellsword" for a hire */
  billing: string;
  kind: "hero" | "companion";
  hp: number;
  maxHp: number;
  ac: number;
  /** the one line that makes them a person rather than a number */
  line: string;
  equipped: Equipped;
  pack: string[];
  gp: number;
}

/** A companion's numbers, scaled from what they charge. Cheap help is thin help. */
export function companionStats(c: Companion): { hp: number; ac: number } {
  const tier = Math.max(1, Math.round(c.fee / 8));
  return { hp: 6 + tier * 4, ac: 10 + Math.min(6, tier + 1) };
}

export function heroBilling(c: Character): string {
  if (c.classes.length === 0) return "Unclassed";
  return c.classes
    .map((e) => `${e.classIndex[0].toUpperCase()}${e.classIndex.slice(1)} ${e.level}`)
    .join(" / ");
}

export function partyOf(c: Character): SheetMember[] {
  const dex = modifiers(c).dex;
  const equipped = (c.equipped ?? {}) as Equipped;
  const overridden = c.overrides?.armorClass;
  const ac = overridden ? armorClass(c).value : armorClassFrom(equipped, dex).value;
  const full = maxHp(c).value;

  const hero: SheetMember = {
    key: "hero",
    name: c.name,
    billing: heroBilling(c),
    kind: "hero",
    hp: c.currentHp || full,
    maxHp: full,
    ac,
    line: c.flaws || c.ideals || "Whatever happens next is yours to write.",
    equipped,
    pack: c.pack ?? [],
    gp: c.coin.gp,
  };

  const hires: SheetMember[] = (c.companions ?? []).flatMap((id) => {
    const comp = COMPANIONS.find((x) => x.id === id);
    if (!comp) return [];
    const stats = companionStats(comp);
    const gear = ((c.companionGear ?? {}) as Record<string, Equipped>)[id] ?? {};
    const acFromGear = armorClassFrom(gear, 1);
    return [{
      key: id,
      name: comp.name,
      billing: comp.role,
      kind: "companion" as const,
      hp: stats.hp,
      maxHp: stats.hp,
      ac: Math.max(stats.ac, acFromGear.value),
      line: comp.line,
      equipped: gear,
      pack: [],
      gp: 0,
    }];
  });

  return [hero, ...hires];
}
