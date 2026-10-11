/**
 * The Reach Register. A board of work, written fresh by the GM.
 */
import { useEffect, useRef, useState } from "react";
import type { Character } from "../model/character";
import { totalLevel } from "../model/character";
import {
  askForQuest,
  DANGER_WORD,
  GmSilent,
  type QuestSeed,
} from "./quests";
import { rumourOfTheDay } from "./inn";
import { newRun } from "../scene/run";
import { siteForQuest } from "../scene/sites";
import { stageOf } from "./campaign";
import { postedLine } from "./locations";

function seedFrom(c: Character): QuestSeed {
  return {
    name: c.name,
    level: totalLevel(c),
    klass: c.classes[0]?.classIndex ?? "adventurer",
    race: c.raceIndex ?? "human",
    day: c.day,
    gp: c.coin.gp,
    party: 1 + c.companions.length,
    stage: stageOf(c).id,
    stageName: stageOf(c).name,
    situation: stageOf(c).situation,
    leans: stageOf(c).leans,
  };
}

/** setCharacter that also accepts a functional update — required so async
 *  answers (askForQuest) never write over a newer character. */
type SetCharacter = (next: Character | ((prev: Character) => Character)) => void;

export function Board({
  character,
  setCharacter,
  say,
  onVenture,
  autoAsk = false,
  placeId,
}: {
  character: Character;
  setCharacter: SetCharacter;
  say: (s: string) => void;
  onVenture: () => void;
  /** Only the Register asks for a bill the moment you walk in. */
  autoAsk?: boolean;
  placeId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const quests = character.quests ?? [];
  const open = quests.filter((q) => q.state !== "done");
  // P8: StrictMode double-invokes mount effects in dev — the ref keeps the
  // arrival posting to one bill.
  const asked = useRef(false);

  // An empty board on arrival asks for one posting, once.
  useEffect(() => {
    if (autoAsk && quests.length === 0 && !asked.current) {
      asked.current = true;
      void post();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function post() {
    if (busy) return;
    setBusy(true);
    setTrouble(null);
    try {
      const q = await askForQuest(
        seedFrom(character),
        quests.map((x) => x.title),
        rumourOfTheDay(character.day),
        character.memory,
      );
      // P8: functional update — the fetch above can outlive re-renders, so
      // appending to the closed-over quests array could drop newer bills.
      setCharacter((prev) => ({ ...prev, quests: [...(prev.quests ?? []), q] }));
      say(postedLine(placeId, q.title));
    } catch (e) {
      setTrouble(
        e instanceof GmSilent ? e.message : "the board would not answer",
      );
    } finally {
      setBusy(false);
    }
  }

  function take(id: string) {
    // P8: never interleave a take with a posting in flight.
    if (busy) return;
    setCharacter((prev) => ({
      ...prev,
      quests: (prev.quests ?? []).map((q) => (q.id === id ? { ...q, state: "taken" } : q)),
    }));
    const q = quests.find((x) => x.id === id);
    if (q) say(`You take down the bill for ${q.title}. It is yours now.`);
  }

  function venture(id: string) {
    // P8: never venture twice (or mid-post) — the second run would overwrite
    // the first before it is ever played.
    if (busy) return;
    const q = quests.find((x) => x.id === id);
    if (!q) return;
    const site = siteForQuest(q.where, q.title);
    const run = newRun(q.id, site);
    setCharacter((prev) => ({ ...prev, activeRun: run }));
    onVenture();
  }

  return (
    <div className="counter">
      <div className="counter__tabs">
        <span className="tab tab--on">The board</span>
        <button className="tab" onClick={post} disabled={busy}>
          {busy ? "Writing a bill…" : "Ask for new work"}
        </button>
      </div>

      {trouble && <p className="board__trouble">The board is quiet — {trouble}.</p>}

      {open.length === 0 && !busy && !trouble && (
        <p className="counter__empty">Nothing is pinned up. Ask the clerk.</p>
      )}

      <ul className="wares">
        {open.map((q) => (
          <li key={q.id} className="ware ware--quest">
            <div className="ware__text">
              <strong>{q.title}</strong>
              <span className="ware__note">
                {q.giver} — {q.where}
              </span>
              <span className="quest__hook">“{q.hook}”</span>
              {q.state === "taken" && (
                <span className="quest__detail">{q.detail}</span>
              )}
              <span className="quest__meta">
                {DANGER_WORD[q.danger]} · {q.reward} gp · posted day {q.posted}
              </span>
            </div>
            {q.state === "offered" ? (
              <button className="ware__buy" onClick={() => take(q.id)} disabled={busy}>
                Take it down
              </button>
            ) : (
              <button className="ware__buy" onClick={() => venture(q.id)} disabled={busy}>
                Venture out
              </button>
            )}
          </li>
        ))}
      </ul>

      {quests.some((q) => q.state === "done") && (
        <p className="board__past">
          Finished: {quests.filter((q) => q.state === "done").map((q) => q.title).join("; ")}
        </p>
      )}
    </div>
  );
}
