/**
 * The Salted Gull. Three things happen here: you sleep, you listen, and
 * occasionally someone at the bar decides to come with you.
 *
 * The companion on offer changes with the in-game day, so it is worth
 * coming back. Who it is depends on the day and the character's level,
 * so a level 1 hero is never offered a veteran.
 */

import type { Character } from "../model/character";
import { totalLevel } from "../model/character";

export const ROOM_PRICE = 2;
export const MEAL_PRICE = 1;

export interface Companion {
  id: string;
  name: string;
  role: string;
  /** what they cost up front, in gold */
  fee: number;
  /** the minimum character level before they will be seen at the bar */
  minLevel: number;
  line: string;
}

/** Everyone who ever drinks in the Gull. */
export const COMPANIONS: Companion[] = [
  { id: "pell", name: "Pell Marrow", role: "Torchbearer", fee: 2, minLevel: 1,
    line: "I carry the light and I run when told. That is the whole of it." },
  { id: "tam", name: "Tam Aldry", role: "Hunter", fee: 5, minLevel: 1,
    line: "I can put an arrow in a thing at sixty paces. Further, if it is standing still." },
  { id: "wick", name: "Sister Wick", role: "Field medic", fee: 8, minLevel: 1,
    line: "I will keep you breathing. I will not keep you out of trouble." },
  { id: "dorn", name: "Dorn Kettle", role: "Porter", fee: 1, minLevel: 1,
    line: "Whatever you find down there, I'll carry it up." },
  { id: "silves", name: "Silves Ar", role: "Hedge-mage", fee: 15, minLevel: 2,
    line: "Three spells, reliably. A fourth, if the wind is kind." },
  { id: "brackwater", name: "Ona Brackwater", role: "Scout", fee: 12, minLevel: 2,
    line: "I go first. You pay me for the going, not the coming back." },
  { id: "hask", name: "Hask", role: "Sellsword", fee: 20, minLevel: 3,
    line: "I stand where you point and I stay there. Ask about the rest later." },
  { id: "ferren", name: "Ferren Dole", role: "Locksmith", fee: 18, minLevel: 3,
    line: "There is no door in this province I have not had a polite word with." },
  { id: "mora", name: "Mora Tallow", role: "Shield-bearer", fee: 30, minLevel: 4,
    line: "Family trade is armour. I decided I would rather be inside it." },
  { id: "isk", name: "Captain Isk", role: "Veteran", fee: 60, minLevel: 5,
    line: "I have buried more employers than I care to count. Let us both be careful." },
];

/**
 * Who is at the bar today. Deterministic: the same day always offers the
 * same person, so the game does not change under the player's feet, but a
 * night's sleep brings someone new.
 */
export function companionOfTheDay(day: number, character: Character): Companion | null {
  const level = Math.max(1, totalLevel(character));
  const eligible = COMPANIONS.filter((c) => c.minLevel <= level);
  if (eligible.length === 0) return null;
  // A simple stable hash of the day, so it looks random but never wobbles.
  const pick = (day * 2654435761) % eligible.length;
  return eligible[Math.abs(pick)];
}

export const RUMOURS: string[] = [
  "A fishing boat came back three men short and nobody aboard will say from where.",
  "The tide has been an hour late all week. The priests have noticed.",
  "Somebody has been digging in the old town, below the waterline, at night.",
  "Coll turned away a ship yesterday and won't name her.",
  "There's a light out on the Scaur that wasn't there last winter.",
  "Greel paid coin for a dead thing last month. It was not a fish.",
  "The Register has a contract on the board that nobody has taken in a year.",
  "Ospreth has stopped selling to anyone from up the coast. Ask her why and she smiles.",
  "Two of the Tallows have gone inland and left the sheds short-handed.",
  "A woman came off the Marigold with no luggage and hasn't left her room since.",
];

export function rumourOfTheDay(day: number): string {
  return RUMOURS[Math.abs(day * 40503) % RUMOURS.length];
}

/** A night in a room: full hit points, hit dice back, a new day. */
export function restResult(maxHitPoints: number): { hp: number; note: string } {
  return {
    hp: maxHitPoints,
    note: "You sleep through until the gulls start, and wake up whole.",
  };
}
