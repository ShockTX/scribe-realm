/**
 * The Reach Register's board.
 *
 * Postings are not written here. They come from the GM service on the
 * server, which asks Claude for work suited to this character on this day,
 * and is told what has already been taken so it never repeats itself.
 *
 * The game must stay playable if the GM is silent, so a failed fetch is a
 * plain message on the board, never a crash.
 */

export type Danger = "low" | "fair" | "grim";

export interface Quest {
  id: string;
  title: string;
  giver: string;
  where: string;
  hook: string;
  detail: string;
  /** gold on completion */
  reward: number;
  danger: Danger;
  /** the in-game day it was posted */
  posted: number;
  state: "offered" | "taken" | "done";
}

export interface QuestSeed {
  name: string;
  level: number;
  klass: string;
  race: string;
  day: number;
  gp: number;
  party: number;
  /** where the Salt Rise has got to, so the board escalates with the world */
  stage?: string;
  stageName?: string;
  situation?: string;
  leans?: Danger;
}

/** Where the GM lives. Same origin, so it inherits the site's password. */
const GM_QUEST = "/gm/quest";
const GM_HEALTH = "/gm/health";

export class GmSilent extends Error {}

function slug(title: string, day: number): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) + `-d${day}`
  );
}

/** The danger words the service is allowed to use. */
function asDanger(v: unknown): Danger {
  return v === "low" || v === "fair" || v === "grim" ? v : "fair";
}

/** How much a danger word is worth, as a multiple of the base purse. */
export const REWARD_MULT: Record<Danger, number> = {
  low: 0.7,
  fair: 1,
  grim: 1.5,
};

/**
 * Coin per level, per job. The Warden used to name the purse itself at
 * "10-25 gp per level", which could not pay a training fee and a potion in
 * the same week, let alone the 300-750 gp gear at the top of the shops.
 * The engine sizes the purse now; two won jobs buy a level and leave
 * enough over to actually equip the character who earned it.
 */
export const BASE_PURSE = 60;

export function rewardFor(level: number, danger: Danger): number {
  const lv = Math.min(20, Math.max(1, Math.round(level) || 1));
  return Math.round(BASE_PURSE * lv * REWARD_MULT[danger]);
}

/**
 * The Warden may still argue about the purse, but only within a band around
 * what the work is worth. Same proposer-inside-a-clamp shape as hp and gp:
 * its judgement colours the number, it never sets it.
 */
export function readReward(raw: unknown, level: number, danger: Danger): number {
  const want = rewardFor(level, danger);
  if (typeof raw !== "number" || !Number.isFinite(raw)) return want;
  return Math.max(Math.round(want * 0.6), Math.min(Math.round(want * 1.6), Math.round(raw)));
}

/**
 * Turn whatever the service returned into a Quest, or throw.
 * Kept separate from the fetch so it can be tested without a network.
 */
export function readQuest(raw: unknown, day: number, level = 1): Quest {
  if (!raw || typeof raw !== "object") throw new GmSilent("empty reply");
  const q = raw as Record<string, unknown>;
  const need = ["title", "giver", "where", "hook", "detail"] as const;
  for (const f of need) {
    if (typeof q[f] !== "string" || !(q[f] as string).trim()) {
      throw new GmSilent(`the posting had no ${f}`);
    }
  }
  const reward = readReward(q.reward, level, asDanger(q.danger));
  return {
    id: slug(q.title as string, day),
    title: q.title as string,
    giver: q.giver as string,
    where: q.where as string,
    hook: q.hook as string,
    detail: q.detail as string,
    reward,
    danger: asDanger(q.danger),
    posted: day,
    state: "offered",
  };
}

/** Ask the GM for one new posting. */
export async function askForQuest(
  seed: QuestSeed,
  taken: string[],
  rumour?: string,
  memory?: string[],
): Promise<Quest> {
  let res: Response;
  try {
    res = await fetch(GM_QUEST, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        character: seed,
        stage: seed.stage,
        situation: seed.situation,
        leans: seed.leans,
        taken,
        rumour,
        memory: (memory ?? []).slice(-24),
      }),
    });
  } catch {
    throw new GmSilent("the road to the Register is out");
  }
  if (!res.ok) {
    throw new GmSilent(
      res.status === 502
        ? "the clerk is out, and the board is bare"
        : `the board would not answer (${res.status})`,
    );
  }
  return readQuest(await res.json(), seed.day, seed.level);
}

export async function gmAwake(): Promise<boolean> {
  try {
    const r = await fetch(GM_HEALTH);
    if (!r.ok) return false;
    const j = await r.json();
    return j?.ok === true;
  } catch {
    return false;
  }
}

/** The coin posted on the bill. Experience is settled by the run, not here. */
export function completeReward(q: Quest): number {
  return q.reward;
}

export const DANGER_WORD: Record<Danger, string> = {
  low: "Little danger",
  fair: "Fair odds",
  grim: "Grim work",
};
