/**
 * The town of Saltmarrow Reach — the port you start in.
 *
 * Hotspots are percentages of the map image, so the map scales freely.
 * Each one sits on a real building in the painting; if the art is ever
 * replaced, these need re-placing with it.
 */

export type ServiceKind =
  | "buy"
  | "sell"
  | "quests"
  | "rest"
  | "heal"
  | "train"
  | "travel"
  | "identify";

export interface Service {
  kind: ServiceKind;
  /** What the sign over the counter would say. */
  label: string;
}

export interface Hotspot {
  /** All values are percentages of the map's width/height. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TownLocation {
  id: string;
  name: string;
  /** The trade, in two or three words, for the hover label. */
  trade: string;
  /** Shown on arrival. One paragraph, present tense, no stat talk. */
  description: string;
  /** Interior art, or null until it is painted. */
  art: string | null;
  keeper: string;
  services: Service[];
  hotspot: Hotspot;
}

export const TOWN_NAME = "Saltmarrow Reach";

export const TOWN_MAP_ART = "/art/town/harbor-town.png";

export const LOCATIONS: TownLocation[] = [
  {
    id: "weaponsmith",
    name: "The Hammer & Tide",
    trade: "Weapons & smithing",
    keeper: "Berta Holt, smith",
    description:
      "Heat rolls off the forge at the back and settles under the rafters. Blades stand racked along both walls in their dozens, edges catching the lamplight, and the banners overhead are scorched at the hems. Berta does not look up from the anvil until you touch something.",
    art: "/art/town/weaponsmith.png",
    services: [
      { kind: "buy", label: "Look over the racks" },
      { kind: "sell", label: "Offer her steel" },
      { kind: "train", label: "Ask after the weight of a blade" },
    ],
    hotspot: { left: 73, top: 24, width: 14, height: 16 },
  },
  {
    id: "arcanist",
    name: "The Ninefold Door",
    trade: "Arcana & curiosities",
    keeper: "Ospreth, who does not give a surname",
    description:
      "Bottles crowd every shelf, and something in most of them is awake. A lamp turns slowly on its chain without any draught to turn it. At the back a doorway holds a standing sheet of blue light, and the shopkeeper asks you, politely, not to walk through it.",
    art: "/art/town/arcanist.png",
    services: [
      { kind: "buy", label: "Ask what is for sale" },
      { kind: "identify", label: "Set something strange on the counter" },
      { kind: "sell", label: "Trade a curiosity" },
    ],
    hotspot: { left: 12.5, top: 12, width: 11.5, height: 15.5 },
  },
  {
    id: "general-store",
    name: "Dunmarrow's Provisions",
    trade: "Supplies & tools",
    keeper: "Old Dunmarrow",
    description:
      "Light comes in through the gable and falls across a counter worn pale in the middle. Rope, spades, lantern oil, salt fish on a line, wool in every colour the dyer had that season. A sign propped by the door points to a museum that has not existed in thirty years.",
    art: "/art/town/general-store.png",
    services: [
      { kind: "buy", label: "Buy supplies" },
      { kind: "sell", label: "Sell what you hauled back" },
    ],
    hotspot: { left: 15.6, top: 40.5, width: 11.5, height: 15.5 },
  },
  {
    id: "tavern",
    name: "The Salted Gull",
    trade: "Board, beds & talk",
    keeper: "Mirren Vask, landlord",
    description:
      "The long room runs the width of the building and smells of wet wool and frying onions. Every table is taken. The talk drops by a half when you come in, then picks up again, which is as close to a welcome as this town gives strangers.",
    art: "/art/town/tavern.jpg",
    services: [
      { kind: "rest", label: "Take a room for the night" },
      { kind: "quests", label: "Listen to the room" },
      { kind: "buy", label: "Buy a meal" },
    ],
    hotspot: { left: 48, top: 26, width: 24, height: 15.5 },
  },
  {
    id: "temple",
    name: "The Drowned Shrine",
    trade: "Healing & rites",
    keeper: "Sister Calloway",
    description:
      "A round hall, open to the weather on the seaward side, built over the place where the old town went under. Water stands ankle-deep across the floor at high tide and nobody has ever tried to drain it. Candles float in it, in their hundreds.",
    art: "/art/town/temple.jpg",
    services: [
      { kind: "heal", label: "Ask for tending" },
      { kind: "quests", label: "Speak with Sister Calloway" },
    ],
    hotspot: { left: 0.5, top: 40, width: 12, height: 12 },
  },
  {
    id: "guildhall",
    name: "The Reach Register",
    trade: "Work & contracts",
    keeper: "Clerk Ansel Pyne",
    description:
      "A narrow hall with a board the length of one wall, and every inch of it papered over in notices, some of them years deep. The clerk keeps a ledger of who took what work and who came back. He will want your name in it before he will let you read anything.",
    art: "/art/town/guildhall.jpg",
    services: [
      { kind: "quests", label: "Read the board" },
      { kind: "train", label: "Ask about the ledger" },
    ],
    hotspot: { left: 33.5, top: 13, width: 11.5, height: 14.3 },
  },
  {
    id: "apothecary",
    name: "Greel's Remedies",
    trade: "Salves & poisons",
    keeper: "Greel, apothecary",
    description:
      "Low ceiling, bundled herbs hanging close enough to brush your head, and a pot on the boil that nobody is watching. Greel sells three kinds of thing here and is careful to write down which is which, because two of them will kill you.",
    art: "/art/town/apothecary.jpg",
    services: [
      { kind: "buy", label: "Buy remedies" },
      { kind: "heal", label: "Have a wound seen to" },
      { kind: "sell", label: "Sell gathered herbs" },
    ],
    hotspot: { left: 34.5, top: 51, width: 10.5, height: 12 },
  },
  {
    id: "harbormaster",
    name: "The Harbourmaster's Office",
    trade: "Charts & passage",
    keeper: "Harbourmaster Coll",
    description:
      "One room, one desk, and charts pinned over charts until the wall has gone soft with them. Coll knows every keel that has tied up here since the frost and precisely which of them he would not sail on.",
    art: "/art/town/harbormaster.jpg",
    services: [
      { kind: "quests", label: "Ask what has come in" },
      { kind: "travel", label: "Enquire about passage" },
    ],
    hotspot: { left: 72, top: 53.5, width: 11.5, height: 12 },
  },
  {
    id: "wharf-market",
    name: "The Wharf Market",
    trade: "Open-air trade",
    keeper: "whoever is shouting loudest",
    description:
      "Trestles and awnings jammed into the space between the warehouses, packed up and rebuilt twice a day around the tide. Nothing here has a fixed price and nothing here has any provenance worth asking about.",
    art: "/art/town/wharf-market.jpg",
    services: [
      { kind: "buy", label: "Wander the stalls" },
      { kind: "sell", label: "Find a buyer" },
    ],
    hotspot: { left: 87.5, top: 5, width: 12, height: 14 },
  },
  {
    id: "armorer",
    name: "Tallow Row",
    trade: "Armour & leatherwork",
    keeper: "the Tallow family, all of them",
    description:
      "Three sheds built into one another above the beach, where they cure, cut and stitch everything the town wears against a blade. The smell reaches the road. They are unbothered by this and will tell you so.",
    art: "/art/town/armorer.jpg",
    services: [
      { kind: "buy", label: "Be fitted for armour" },
      { kind: "sell", label: "Sell battered plate" },
    ],
    hotspot: { left: 87.5, top: 43, width: 12, height: 19 },
  },
  {
    id: "ship",
    name: "The Marigold",
    trade: "A ship, and a way out",
    keeper: "Captain Idris Fenn",
    description:
      "She sits at the long pier with her sails furled and her deck swept, which in this harbour marks her out as either very well run or very recently bought. Fenn is aboard. Fenn is always aboard.",
    art: "/art/town/ship.jpg",
    services: [
      { kind: "travel", label: "Ask where she is bound" },
      { kind: "quests", label: "Speak with Captain Fenn" },
    ],
    hotspot: { left: 52, top: 68, width: 17, height: 28 },
  },
];

export function locationById(id: string): TownLocation | undefined {
  return LOCATIONS.find((l) => l.id === id);
}
