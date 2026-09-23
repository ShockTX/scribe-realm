/**
 * The table: where a quest is actually played.
 *
 * Centre is the scene — the site's art, then the Warden's narration.
 * Bottom is a real action bar: type anything, or tap something legal.
 * Every roll is shown in the open. The player's dice are never fudged.
 */
import { useEffect, useRef, useState } from "react";
import type { Character } from "../model/character";
import { totalLevel } from "../model/character";
import { worldLedger, rememberFacts } from "../model/memory";
import { applyLevels, type LevelNote } from "../rules/advance";
import { LevelRise } from "../game/LevelRise";
import { maxHp } from "../rules/derive";
import { COMPANIONS } from "../town/inn";
import type { Quest } from "../town/quests";
import { OUTCOME_WORD, type Roll } from "./dice";
import {
  adjudicate,
  askScene,
  beatLine,
  GmSilent,
  newRun,
  settleRun,
  type Beat,
  type Run,
  type SceneReply,
  type SceneSeed,
  type Settlement,
} from "./run";
import { roomById, siteById, siteForQuest } from "./sites";
import { CombatPanel } from "./CombatPanel";
import { beginCombat, type CombatState } from "./combat";
import { pickFoe } from "./foes";

function seedFor(
  c: Character,
  quest: Quest,
  run: Run,
  extra: Partial<SceneSeed>,
): SceneSeed {
  const site = siteById(run.siteId)!;
  const hpMax = maxHp(c).value;
  return {
    character: {
      name: c.name,
      level: totalLevel(c) || 1,
      klass: c.classes[0]?.classIndex ?? "adventurer",
      race: c.raceIndex ?? "human",
      hp: c.currentHp || hpMax,
      maxHp: hpMax,
      gp: c.coin.gp,
      skills: c.skillProficiencies,
      party: c.companions.map(
        (id) => COMPANIONS.find((x) => x.id === id)?.name ?? id,
      ),
    },
    quest: { title: quest.title, giver: quest.giver, objective: quest.detail },
    site: {
      name: site.name,
      description: site.description,
      rooms: site.rooms.map((r) => ({ id: r.id, name: r.name, note: r.note })),
    },
    roomId: run.roomId,
    recent: run.beats.slice(-4).map(beatLine),
    ledger: worldLedger(c.memory, run.ledger),
    beat: run.beats.length + 1,
    of: run.length,
    ...extra,
  };
}

function DiceTray({ roll }: { roll: Roll }) {
  const cls =
    roll.outcome === "critical" || roll.outcome === "success"
      ? "tray tray--good"
      : roll.outcome === "partial"
        ? "tray tray--half"
        : "tray tray--bad";
  return (
    <div className={cls}>
      <span className="tray__die">{roll.die}</span>
      <span className="tray__sum">
        {roll.label} — {roll.die} {roll.bonus >= 0 ? "+" : "−"}{" "}
        {Math.abs(roll.bonus)} = <strong>{roll.total}</strong> against DC {roll.dc}
      </span>
      <span className="tray__word">{OUTCOME_WORD[roll.outcome]}</span>
    </div>
  );
}

export function SceneView({
  character,
  setCharacter,
  quest,
  run,
  setRun,
  onLeave,
}: {
  character: Character;
  setCharacter: (c: Character) => void;
  quest: Quest;
  run: Run;
  setRun: (r: Run) => void;
  onLeave: () => void;
}) {
  const site = siteById(run.siteId)!;
  const room = roomById(site, run.roomId);
  const [pending, setPending] = useState<SceneReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [fight, setFight] = useState<CombatState | null>(null);
  const [paid, setPaid] = useState<Settlement | null>(null);
  const [rise, setRise] = useState<LevelNote[]>([]);
  const opened = useRef(false);
  const foughtBeat = useRef<number | null>(null);
  // Settlement: the only place a finished run pays out. Runs once.
  const settled = useRef(false);
  useEffect(() => {
    if (!run.ending || settled.current) return;
    settled.current = true;
    const s = settleRun(run, quest.reward, quest.danger, totalLevel(character) || 1);
    setPaid(s);
    const paidChar = rememberFacts(
      {
        ...character,
        xp: (character.xp ?? 0) + s.xp,
        coin: { ...character.coin, gp: character.coin.gp + s.gold },
        pack: [...character.pack, ...s.loot],
        quests: (character.quests ?? []).map((q) =>
          q.id === quest.id ? { ...q, state: "done" as const } : q,
        ),
      },
      run.ledger,
    );
    const risen = applyLevels(paidChar);
    setRise(risen.notes);
    setCharacter(risen.character);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.ending]);

  function startFight(name: string, count: number) {
    if (foughtBeat.current === run.beats.length) return;
    foughtBeat.current = run.beats.length;
    setFight(beginCombat(character, name, count));
  }

  useEffect(() => {
    if (!pending?.fight || fight || run.ending) return;
    startFight(pending.fight.name, pending.fight.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, fight, run.ending, run.beats.length]);

  const tail = useRef<HTMLDivElement | null>(null);

  // The opening beat, asked for once.
  useEffect(() => {
    if (opened.current || run.beats.length > 0 || run.ending) return;
    opened.current = true;
    void open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    tail.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [run.beats.length, pending, busy]);

  async function open() {
    setBusy(true);
    setTrouble(null);
    try {
      const reply = await askScene(seedFor(character, quest, run, {}));
      setPending(reply);
      setCharacter(rememberFacts(character, [reply.remember]));
      setRun({
        ...run,
        beats: [
          { n: 1, roomId: run.roomId, situation: reply.situation },
        ],
        ledger: reply.remember ? [...run.ledger, reply.remember] : run.ledger,
      });
    } catch (e) {
      setTrouble(e instanceof GmSilent ? e.message : "the Warden is silent");
    } finally {
      setBusy(false);
    }
  }

  /** The player acts. The engine rolls. Then the Warden narrates the fact. */
  async function act(action: string) {
    if (busy || !pending || run.ending) return;
    setBusy(true);
    setTrouble(null);
    setTyped("");

    const judged = adjudicate(character, pending);
    const carry = (extra?: string) =>
      rememberFacts(judged.after, [judged.consequence.remember, extra]);
    const done: Beat = {
      ...run.beats[run.beats.length - 1],
      action,
      roll: judged.roll,
      result: judged.text,
      consequence: judged.consequence,
    };

    const ledger = [...run.ledger];
    if (judged.consequence.remember) ledger.push(judged.consequence.remember);

    const beats = [...run.beats.slice(0, -1), done];
    const roomId = pending.moveTo && roomById(site, pending.moveTo) ? pending.moveTo : run.roomId;
    const mid: Run = { ...run, beats, ledger, roomId };

    // Death ends a run regardless of what the Warden intended.
    const hpNow = judged.after.currentHp;
    if (hpNow <= 0) {
      setCharacter(carry());
      setRun({
        ...mid,
        ending: "lost",
        epilogue:
          "You go down in the dark, and the place keeps whatever it was holding. Someone finds you, eventually.",
      });
      setPending(null);
      setBusy(false);
      return;
    }

    if (beats.length >= mid.length + 2) {
      // Hard stop, so a Warden that never resolves cannot run forever.
      setCharacter(carry());
      setRun({ ...mid, ending: "cost", epilogue: "You have had enough of this place, and you leave with what you have." });
      setPending(null);
      setBusy(false);
      return;
    }

    try {
      const reply = await askScene(
        seedFor(judged.after, quest, mid, {
          action,
          roll: judged.roll
            ? {
                label: judged.roll.label,
                die: judged.roll.die,
                total: judged.roll.total,
                dc: judged.roll.dc,
                outcome: judged.roll.outcome,
              }
            : undefined,
        }),
      );
      setCharacter(carry(reply.remember));
      if (reply.ending) {
        setRun({
          ...mid,
          ending: reply.ending,
          epilogue: reply.epilogue ?? reply.situation,
          ledger: reply.remember ? [...ledger, reply.remember] : ledger,
        });
        setPending(null);
      } else {
        setPending(reply);
        setRun({
          ...mid,
          beats: [
            ...beats,
            { n: beats.length + 1, roomId, situation: reply.situation },
          ],
          ledger: reply.remember ? [...ledger, reply.remember] : ledger,
        });
      }
    } catch (e) {
      setTrouble(e instanceof GmSilent ? e.message : "the Warden is silent");
      setCharacter(carry());
      setRun(mid);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scene-run">
      <header className="run__head">
        <div>
          <h1>{site.name}</h1>
          <p>
            {room ? room.name : run.roomId} · {quest.title}
          </p>
        </div>
        <span className="run__beat">
          {run.ending ? "Over" : `Beat ${run.beats.length} of ${run.length}`}
        </span>
      </header>

      <div className="run__body">
        <div className="run__stage">
          <img className="run__art" src={site.art} alt={site.name} />
        </div>

        <div className="run__log">
          {run.beats.map((b) => (
            <article key={b.n} className="beat">
              <p className="beat__said">{b.situation}</p>
              {b.action && <p className="beat__did">“{b.action}”</p>}
              {b.roll && <DiceTray roll={b.roll} />}
              {b.result && <p className="beat__out">{b.result}</p>}
              {b.consequence?.hp != null && b.consequence.hp !== 0 && (
                <p className="beat__cost">
                  {b.consequence.hp < 0
                    ? `${-b.consequence.hp} damage`
                    : `${b.consequence.hp} healed`}
                </p>
              )}
              {b.consequence?.gp != null && b.consequence.gp !== 0 && (
                <p className="beat__cost">
                  {b.consequence.gp > 0
                    ? `${b.consequence.gp} gp gained`
                    : `${-b.consequence.gp} gp spent`}
                </p>
              )}
            </article>
          ))}

          {busy && <p className="beat__waiting">The Warden is writing…</p>}
          {trouble && (
            <p className="beat__trouble">
              {trouble}. <button className="link" onClick={() => void open()}>Try again</button>
            </p>
          )}

          {run.ending && (
            <LevelRise
              notes={rise}
              character={character}
              setCharacter={setCharacter}
              onDismiss={() => setRise([])}
            />
          )}

          {run.ending && (
            <div className={`ending ending--${run.ending}`}>
              <h2>
                {run.ending === "won"
                  ? "Done, and done well"
                  : run.ending === "cost"
                    ? "Done — but it cost you"
                    : "It got away"}
              </h2>
              <p>{run.epilogue}</p>
              {paid && (
                <ul className="ending__paid">
                  {paid.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div ref={tail} />
        </div>
      </div>

      {fight && (
        <CombatPanel
          character={character}
          state={fight}
          setState={setFight}
          setCharacter={setCharacter}
          onDone={(summary, ended) => {
            setFight(null);
            if (ended === "down") {
              setRun({
                ...run,
                ending: "lost",
                epilogue: "You go down fighting, and the place keeps you a while.",
              });
              setPending(null);
            } else {
              void act(summary);
            }
          }}
        />
      )}

      {!run.ending && !fight && pending && (
        <div className="run__bar">
          {pending.check && (
            <p className="run__stakes">
              At stake: {pending.check.stakes}
            </p>
          )}
          <div className="run__suggest">
            <button
              className="suggest suggest--fight"
              disabled={busy}
              onClick={() => {
                const foe = pickFoe(site.id, totalLevel(character) || 1);
                startFight(foe.name, foe.count);
              }}
            >
              ⚔ Fight
            </button>
            {pending.suggestions.map((s) => (
              <button key={s} className="suggest" disabled={busy} onClick={() => void act(s)}>
                {s}
              </button>
            ))}
          </div>
          <form
            className="run__type"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) void act(typed.trim());
            }}
          >
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Or do something else entirely…"
              disabled={busy}
              aria-label="What do you do?"
            />
            <button type="submit" disabled={busy || !typed.trim()}>
              Do it
            </button>
          </form>
        </div>
      )}

      <button className="link link--back" onClick={onLeave}>
        {run.ending ? "← Back to town" : "← Leave (the work stays open)"}
      </button>
    </div>
  );
}

export { newRun, siteForQuest };
