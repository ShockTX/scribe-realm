/**
 * The Reach Register. A board of work, written fresh by the GM.
 */
import { useEffect, useState } from "react";
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

export function Board({
  character,
  setCharacter,
  say,
  onVenture,
}: {
  character: Character;
  setCharacter: (c: Character) => void;
  say: (s: string) => void;
  onVenture: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const quests = character.quests ?? [];
  const open = quests.filter((q) => q.state !== "done");

  // An empty board on arrival asks for one posting, once.
  useEffect(() => {
    if (quests.length === 0) void post();
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
      setCharacter({ ...character, quests: [...quests, q] });
      say(`The clerk pins up a new bill: ${q.title}.`);
    } catch (e) {
      setTrouble(
        e instanceof GmSilent ? e.message : "the board would not answer",
      );
    } finally {
      setBusy(false);
    }
  }

  function take(id: string) {
    setCharacter({
      ...character,
      quests: quests.map((q) => (q.id === id ? { ...q, state: "taken" } : q)),
    });
    const q = quests.find((x) => x.id === id);
    if (q) say(`You take down the bill for ${q.title}. It is yours now.`);
  }

  function venture(id: string) {
    const q = quests.find((x) => x.id === id);
    if (!q) return;
    const site = siteForQuest(q.where, q.title);
    setCharacter({ ...character, activeRun: newRun(q.id, site) });
    onVenture();
  }

  return (
    <div className="counter">
      <div className="counter__tabs">
        <span className="tab tab--on">The board</span>
        <button className="tab" onClick={post} disabled={busy}>
          {busy ? "The clerk is writing…" : "Ask for new work"}
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
              <button className="ware__buy" onClick={() => take(q.id)}>
                Take it down
              </button>
            ) : (
              <button className="ware__buy" onClick={() => venture(q.id)}>
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
