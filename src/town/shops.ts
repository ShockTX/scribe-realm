/**
 * What each shop has on the shelves.
 *
 * Prices are in whole gold pieces, close to the 5e equipment tables but
 * rounded so a player never has to think in copper. Anything a shop sells,
 * it will also buy back — at half, which is the oldest rule in the game.
 */

export type Wares =
  | "weapon"
  | "armor"
  | "gear"
  | "potion"
  | "scroll"
  | "arcana"
  | "food"
  | "trinket";

export interface ShopItem {
  id: string;
  name: string;
  /** whole gold pieces */
  price: number;
  kind: Wares;
  /** one line, said the way the keeper would say it */
  note: string;
}

/** Shops buy at half, rounded down, and never for nothing. */
export function sellPrice(price: number): number {
  return Math.max(1, Math.floor(price / 2));
}

export const STOCK: Record<string, ShopItem[]> = {
  weaponsmith: [
    { id: "dagger", name: "Dagger", price: 2, kind: "weapon", note: "Finger-light. Everyone should own two." },
    { id: "handaxe", name: "Handaxe", price: 5, kind: "weapon", note: "Cuts wood as happily as anything else." },
    { id: "shortsword", name: "Shortsword", price: 10, kind: "weapon", note: "Honest, fast, forgiving of a bad grip." },
    { id: "spear", name: "Spear", price: 1, kind: "weapon", note: "Reach, and the cheapest reach there is." },
    { id: "mace", name: "Mace", price: 5, kind: "weapon", note: "For what armour will not let a blade through." },
    { id: "warhammer", name: "Warhammer", price: 15, kind: "weapon", note: "Berta's own pattern. Heavier than it looks." },
    { id: "longsword", name: "Longsword", price: 15, kind: "weapon", note: "A soldier's weapon. Wants a soldier's arm." },
    { id: "battleaxe", name: "Battleaxe", price: 10, kind: "weapon", note: "Bites deep, pulls hard on the backswing." },
    { id: "rapier", name: "Rapier", price: 25, kind: "weapon", note: "Southern steel. Thin, mean, expensive." },
    { id: "greatsword", name: "Greatsword", price: 50, kind: "weapon", note: "Two hands, both feet, and room behind you." },
    { id: "greataxe", name: "Greataxe", price: 30, kind: "weapon", note: "She made this one angry." },
    { id: "shortbow", name: "Shortbow", price: 25, kind: "weapon", note: "Strung with gut. Keep it dry." },
    { id: "longbow", name: "Longbow", price: 50, kind: "weapon", note: "Takes a year to learn and a life to keep." },
    { id: "light-crossbow", name: "Light crossbow", price: 25, kind: "weapon", note: "Slow, and does not care how strong you are." },
    { id: "sling", name: "Sling", price: 1, kind: "weapon", note: "Stones are free. That is the whole argument." },
    { id: "arrows-20", name: "Arrows (20)", price: 1, kind: "gear", note: "Bundled in oiled cloth." },
    { id: "bolts-20", name: "Crossbow bolts (20)", price: 1, kind: "gear", note: "Straighter than the arrows, she says." },
    { id: "whetstone", name: "Whetstone", price: 1, kind: "gear", note: "She will not sell you a blade without one." },
  ],

  armorer: [
    { id: "padded", name: "Padded armour", price: 5, kind: "armor", note: "Quilted. Hot. Better than nothing." },
    { id: "leather", name: "Leather armour", price: 10, kind: "armor", note: "Boiled hard across the chest." },
    { id: "studded-leather", name: "Studded leather", price: 45, kind: "armor", note: "Every rivet set by one of the nieces." },
    { id: "hide", name: "Hide armour", price: 10, kind: "armor", note: "Off something that did not want to give it up." },
    { id: "chain-shirt", name: "Chain shirt", price: 50, kind: "armor", note: "Worn under a coat, if you are the careful sort." },
    { id: "scale-mail", name: "Scale mail", price: 50, kind: "armor", note: "Loud. Everything good about it is worth the noise." },
    { id: "breastplate", name: "Breastplate", price: 400, kind: "armor", note: "The best thing in the shed, and they know it." },
    { id: "half-plate", name: "Half plate", price: 750, kind: "armor", note: "Made for a captain who never came back for it." },
    { id: "ring-mail", name: "Ring mail", price: 30, kind: "armor", note: "Old work, sound work." },
    { id: "chain-mail", name: "Chain mail", price: 75, kind: "armor", note: "Sixty pounds of patience." },
    { id: "shield", name: "Shield", price: 10, kind: "armor", note: "Elm, banded. Replaceable, which is the point." },
    { id: "helm", name: "Open helm", price: 8, kind: "armor", note: "You will hate it until the day you do not." },
    { id: "bracers", name: "Leather bracers", price: 4, kind: "armor", note: "Saves the forearms from a bowstring." },
    { id: "boots-travel", name: "Travelling boots", price: 3, kind: "gear", note: "Double-stitched, stinking of tallow." },
    { id: "cloak-oiled", name: "Oiled cloak", price: 2, kind: "gear", note: "Sheds rain for about a season." },
    { id: "repair-kit", name: "Armourer's repair kit", price: 12, kind: "gear", note: "Rivets, wire, a small stubborn hammer." },
  ],

  apothecary: [
    { id: "potion-healing", name: "Potion of healing", price: 50, kind: "potion", note: "Tastes of iron and violets. Works." },
    { id: "potion-healing-greater", name: "Greater healing potion", price: 150, kind: "potion", note: "Greel makes two a month and no more." },
    { id: "antitoxin", name: "Antitoxin", price: 50, kind: "potion", note: "For after. Never instead of." },
    { id: "salve-burn", name: "Burn salve", price: 8, kind: "potion", note: "Goose fat, comfrey, something he will not name." },
    { id: "poultice", name: "Wound poultice", price: 5, kind: "potion", note: "Bind it on and leave it alone for a day." },
    { id: "herbalism-kit", name: "Herbalism kit", price: 5, kind: "gear", note: "Shears, pestle, a book of bad drawings." },
    { id: "poison-basic", name: "Vial of basic poison", price: 100, kind: "potion", note: "He writes your name in the ledger for this one." },
    { id: "sleep-draught", name: "Sleeping draught", price: 20, kind: "potion", note: "For the patient, or for the guard." },
    { id: "purgative", name: "Purgative", price: 6, kind: "potion", note: "Unpleasant and occasionally life-saving." },
    { id: "smelling-salts", name: "Smelling salts", price: 4, kind: "potion", note: "Brings a man back from the edge of the dark." },
    { id: "tonic-fever", name: "Fever tonic", price: 10, kind: "potion", note: "Bitter. Drink it in one." },
    { id: "bandages", name: "Bundle of bandages", price: 1, kind: "gear", note: "Boiled clean, which is rarer than you think." },
    { id: "leech-jar", name: "Jar of leeches", price: 3, kind: "gear", note: "Greel swears by them. Nobody else does." },
    { id: "mushroom-dried", name: "Dried cave mushrooms", price: 2, kind: "food", note: "Edible. Mostly." },
  ],

  "general-store": [
    { id: "rope-50", name: "Hempen rope (50 ft)", price: 1, kind: "gear", note: "The single most useful thing in here." },
    { id: "rope-silk", name: "Silk rope (50 ft)", price: 10, kind: "gear", note: "Light, strong, and shows every fray." },
    { id: "rations-5", name: "Rations (5 days)", price: 3, kind: "food", note: "Hard bread, harder cheese, salt fish." },
    { id: "waterskin", name: "Waterskin", price: 1, kind: "gear", note: "Fill it before the gate, not after." },
    { id: "lantern", name: "Hooded lantern", price: 5, kind: "gear", note: "Shutter it and you keep your night eyes." },
    { id: "oil-flask", name: "Flask of oil", price: 1, kind: "gear", note: "Burns for six hours, or all at once." },
    { id: "torches-5", name: "Torches (5)", price: 1, kind: "gear", note: "Pitch-dipped. They gutter in wind." },
    { id: "bedroll", name: "Bedroll", price: 1, kind: "gear", note: "Wool over oilcloth." },
    { id: "tinderbox", name: "Tinderbox", price: 1, kind: "gear", note: "Flint, steel, and a scrap of charcloth." },
    { id: "backpack", name: "Backpack", price: 2, kind: "gear", note: "Canvas, two straps, one broken buckle." },
    { id: "crowbar", name: "Crowbar", price: 2, kind: "gear", note: "Dunmarrow sells a great many of these." },
    { id: "hammer-pitons", name: "Hammer & pitons", price: 3, kind: "gear", note: "For going up, or not coming down fast." },
    { id: "grappling-hook", name: "Grappling hook", price: 2, kind: "gear", note: "Three barbs, one prayer." },
    { id: "shovel", name: "Shovel", price: 2, kind: "gear", note: "Nobody asks what it is for." },
    { id: "mirror-steel", name: "Steel mirror", price: 5, kind: "gear", note: "Around corners, mostly." },
    { id: "chalk", name: "Chalk (10 pieces)", price: 1, kind: "gear", note: "Mark your turnings. Everyone forgets." },
    { id: "sack", name: "Sack", price: 1, kind: "gear", note: "Empty, and optimistic." },
    { id: "fishing-tackle", name: "Fishing tackle", price: 1, kind: "gear", note: "This town's second currency." },
    { id: "blanket", name: "Wool blanket", price: 1, kind: "gear", note: "Dyed whatever colour the dyer had." },
    { id: "soap", name: "Soap", price: 1, kind: "gear", note: "He will suggest it. Take no offence." },
  ],

  "wharf-market": [
    { id: "spices", name: "Sack of spices", price: 12, kind: "trinket", note: "Off a ship that did not stop long." },
    { id: "silk-bolt", name: "Bolt of silk", price: 30, kind: "trinket", note: "No provenance. None offered." },
    { id: "salt-fish", name: "Barrel of salt fish", price: 4, kind: "food", note: "The smell is included." },
    { id: "cheese-wheel", name: "Wheel of hard cheese", price: 3, kind: "food", note: "Keeps a month in the cold." },
    { id: "apples", name: "Basket of apples", price: 1, kind: "food", note: "Small, sharp, honest." },
    { id: "wine-bottle", name: "Bottle of southern wine", price: 8, kind: "food", note: "Better than the inn pours." },
    { id: "lamp-oil-cask", name: "Cask of lamp oil", price: 6, kind: "gear", note: "Heavy. Someone will carry it for a coin." },
    { id: "glass-beads", name: "String of glass beads", price: 5, kind: "trinket", note: "Traded inland for real money." },
    { id: "ivory-comb", name: "Ivory comb", price: 15, kind: "trinket", note: "Whalebone, if you press them." },
    { id: "brass-spyglass", name: "Brass spyglass", price: 200, kind: "gear", note: "The one genuinely good thing on the wharf." },
    { id: "gull-charm", name: "Gull-bone charm", price: 2, kind: "trinket", note: "Against drowning. Sold by the hundred." },
    { id: "foreign-coin", name: "Handful of foreign coin", price: 9, kind: "trinket", note: "Worth more inland than here." },
    { id: "net", name: "Fishing net", price: 1, kind: "gear", note: "Mended so often it is mostly mending." },
    { id: "parrot-cage", name: "Caged parrot", price: 25, kind: "trinket", note: "It swears. That is the selling point." },
    { id: "canvas", name: "Roll of sailcloth", price: 7, kind: "gear", note: "Patches a tent, a sail, or a man." },
  ],

  temple: [
    { id: "holy-water", name: "Flask of holy water", price: 25, kind: "potion", note: "Drawn at the tide-turn, blessed twice." },
    { id: "holy-symbol", name: "Wooden holy symbol", price: 5, kind: "gear", note: "Carved by the shrine's own hands." },
    { id: "holy-symbol-silver", name: "Silver holy symbol", price: 25, kind: "gear", note: "For those who intend to be seen believing." },
    { id: "candle-votive", name: "Votive candles (10)", price: 1, kind: "gear", note: "They float. That is the whole rite." },
    { id: "incense", name: "Block of incense", price: 2, kind: "gear", note: "Burns out the smell of the tide." },
    { id: "prayer-book", name: "Book of rites", price: 12, kind: "gear", note: "Water-stained on every page." },
    { id: "burial-shroud", name: "Burial shroud", price: 3, kind: "gear", note: "Sister Calloway sells these without comment." },
  ],

  arcanist: [
    { id: "scroll-light", name: "Scroll of light", price: 25, kind: "scroll", note: "One use. Ospreth writes them badly on purpose." },
    { id: "scroll-mage-armor", name: "Scroll of mage armour", price: 60, kind: "scroll", note: "Lasts a night. Sleep in it." },
    { id: "scroll-magic-missile", name: "Scroll of magic missile", price: 75, kind: "scroll", note: "Never misses. Never impresses." },
    { id: "scroll-identify", name: "Scroll of identify", price: 80, kind: "scroll", note: "Cheaper than asking Ospreth to do it." },
    { id: "spellbook-blank", name: "Blank spellbook", price: 50, kind: "arcana", note: "Hundred leaves, calf-bound, unruled." },
    { id: "component-pouch", name: "Component pouch", price: 25, kind: "arcana", note: "Pre-filled. Do not look inside." },
    { id: "arcane-focus", name: "Arcane focus (crystal)", price: 10, kind: "arcana", note: "Flawed, which she says helps." },
    { id: "ink-vial", name: "Vial of ink", price: 10, kind: "arcana", note: "For copying. Black as a closed eye." },
    { id: "potion-invisibility", name: "Potion of invisibility", price: 300, kind: "potion", note: "One hour. She times it herself." },
    { id: "everburning-torch", name: "Everburning torch", price: 110, kind: "arcana", note: "Cold light, no smoke, no end to it." },
    { id: "bag-holding", name: "Bag of holding", price: 500, kind: "arcana", note: "She will ask what you mean to put in it." },
    { id: "charm-warding", name: "Warding charm", price: 40, kind: "arcana", note: "Works once. She is honest about that." },
    { id: "crystal-ball-cracked", name: "Cracked scrying crystal", price: 90, kind: "arcana", note: "Shows yesterday, not today. Sold as seen." },
  ],
};

export function stockFor(locationId: string): ShopItem[] {
  return STOCK[locationId] ?? [];
}

/** Every item in the game, for looking up a sell price on something in the pack. */
export const ALL_ITEMS: ShopItem[] = Object.values(STOCK).flat();

export function itemById(id: string): ShopItem | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}
