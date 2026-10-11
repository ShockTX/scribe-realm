/**
 * Saves written before the town existed lack pack/day/companions, yet still
 * claim version 2. Reading them blanked the screen. Anything loaded from
 * storage goes through here first, so a missing field is a default, never a
 * crash.
 */
import { ABILITIES, DEFAULT_SCORES, emptyCharacter, type Ability, type Character, type ClassEntry, type OverridableField } from "./character";
import { maxHp } from "../rules/derive";
import { MEMORY_CAP } from "./memory";

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function list<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeBaseScores(raw: unknown): Character["baseScores"] {
  const out = { ...DEFAULT_SCORES };
  const src: Record<string, unknown> = isPlainObject(raw) ? raw : {};
  for (const a of ABILITIES) {
    const v = src[a];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      out[a] = 10;
    } else {
      out[a] = Math.min(30, Math.max(1, Math.round(v)));
    }
  }
  return out;
}

function normalizeXp(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
}

function normalizeClasses(raw: unknown): ClassEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ClassEntry[] = [];
  for (const e of raw) {
    if (!isPlainObject(e)) continue;
    const rec = e as Record<string, unknown>;
    if (typeof rec.classIndex !== "string" || !rec.classIndex.trim()) continue;
    const lvlRaw = rec.level;
    const level =
      typeof lvlRaw === "number" && Number.isFinite(lvlRaw)
        ? Math.min(20, Math.max(1, Math.round(lvlRaw)))
        : 1;
    const subRaw = rec.subclassIndex;
    const subclassIndex = typeof subRaw === "string" ? subRaw : null;
    out.push({ classIndex: rec.classIndex, level, subclassIndex });
  }
  return out;
}

const OVERRIDABLE_FIELDS: ReadonlySet<OverridableField> = new Set<OverridableField>([
  "maxHp",
  "armorClass",
  "speed",
  "initiative",
  "proficiencyBonus",
  "passivePerception",
  "spellSaveDc",
  "spellAttackBonus",
]);

function normalizeOverrides(raw: unknown): Character["overrides"] {
  if (!isPlainObject(raw)) return {};
  const out: Character["overrides"] = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!OVERRIDABLE_FIELDS.has(k as OverridableField)) continue;
    if (!isPlainObject(v)) continue;
    const rec = v as Record<string, unknown>;
    if (typeof rec.value !== "number" || !Number.isFinite(rec.value)) continue;
    if (typeof rec.note !== "string") continue;
    out[k as OverridableField] = { value: rec.value, note: rec.note };
  }
  return out;
}

function normalizeCampaignOver(raw: unknown): Character["campaignOver"] {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  if (r.outcome !== "won" && r.outcome !== "lost") return undefined;
  const d = r.day;
  const day =
    typeof d === "number" && Number.isFinite(d) ? Math.max(1, Math.floor(d)) : 1;
  return { outcome: r.outcome, day };
}

function normalizeActiveRun(raw: unknown): unknown {
  if (raw === undefined || raw === null) return undefined;
  if (!isPlainObject(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.questId !== "string" || typeof r.siteId !== "string" || typeof r.roomId !== "string") {
    return undefined;
  }
  if (!Array.isArray(r.beats) || !Array.isArray(r.ledger)) return undefined;
  if (typeof r.length !== "number" || !Number.isFinite(r.length)) return undefined;
  const e = r.ending;
  if (!(e === null || e === "won" || e === "cost" || e === "lost")) return undefined;
  return raw;
}

export function normalize(raw: unknown): Character | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<Character> & Record<string, unknown>;
  if (typeof c.name !== "string" || !c.name) return null;

  const base = emptyCharacter();
  if (typeof c.id === "string" && c.id) base.id = c.id as Character["id"];

  const built = {
    ...base,
    ...c,
    version: 2,
    name: c.name,
    baseScores: normalizeBaseScores(c.baseScores),
    coin: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...(isPlainObject(c.coin) ? c.coin : {}) },
    pack: stringList(c.pack),
    companions: stringList(c.companions),
    xp: normalizeXp((c as { xp?: unknown }).xp),
    memory: list<unknown>(c.memory)
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(-MEMORY_CAP),
    quests: list(c.quests),
    activeRun: normalizeActiveRun((c as { activeRun?: unknown }).activeRun),
    equipped: (isPlainObject(c.equipped) ? c.equipped : {}) as Character["equipped"],
    companionGear: (isPlainObject(c.companionGear) ? c.companionGear : {}) as Character["companionGear"],
    memberNotes: (isPlainObject(c.memberNotes) ? c.memberNotes : {}) as Character["memberNotes"],
    attacks: list(c.attacks),
    classes: normalizeClasses(c.classes),
    skillProficiencies: stringList(c.skillProficiencies),
    racialBonusChoices: Array.isArray((c as { racialBonusChoices?: unknown }).racialBonusChoices)
      ? ((c as { racialBonusChoices?: unknown }).racialBonusChoices as unknown[]).filter(
          (x): x is Ability => typeof x === "string" && (ABILITIES as readonly string[]).includes(x),
        )
      : undefined,
    expertise: stringList(c.expertise),
    toolProficiencies: stringList(c.toolProficiencies),
    languageIndexes: stringList(c.languageIndexes),
    spells: {
      known: list<string>((c.spells as { known?: unknown } | undefined)?.known),
      prepared: list<string>((c.spells as { prepared?: unknown } | undefined)?.prepared),
    },
    overrides: normalizeOverrides(c.overrides),
    day: Math.max(1, Math.floor(num(c.day, 1))),
    currentHp: num(c.currentHp, 0),
    tempHp: Math.max(0, num(c.tempHp, 0)),
    hitDiceRemaining: Math.max(0, Math.floor(num(c.hitDiceRemaining, 1))),
    deathSaveSuccesses: Math.min(3, Math.max(0, Math.floor(num(c.deathSaveSuccesses, 0)))),
    deathSaveFailures: Math.min(3, Math.max(0, Math.floor(num(c.deathSaveFailures, 0)))),
    runsDone: Math.max(0, Math.floor(num((c as { runsDone?: unknown }).runsDone, 0))),
    campaignOver: normalizeCampaignOver((c as { campaignOver?: unknown }).campaignOver),
    campaignEnd:
      typeof (c as { campaignEnd?: unknown }).campaignEnd === "string" &&
      ((c as { campaignEnd?: unknown }).campaignEnd as string)
        ? ((c as { campaignEnd?: unknown }).campaignEnd as string)
        : undefined,
    inspiration: c.inspiration === true,
  } as Character;

  // Old saves predate currentHp. Absent means "never been hurt" — full.
  // An explicit 0 means the character went down, and must survive the load.
  const hadHp = typeof c.currentHp === "number" && Number.isFinite(c.currentHp);
  const max = maxHp(built).value;
  built.currentHp = hadHp ? Math.max(0, Math.min(max, c.currentHp as number)) : max;
  return built;
}
