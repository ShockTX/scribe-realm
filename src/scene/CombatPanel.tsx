/**
 * The fight, inside a beat. Real d20s against real AC, real slots, real items.
 * The engine owns every number here; the Warden only says a fight started.
 */
import type { Character } from "../model/character";
import {
  applyCombat,
  combatSummary,
  livingFoes,
  optionsFor,
  playerAc,
  playerTurn,
  type CombatState,
  type Option,
} from "./combat";

export function CombatPanel({
  character,
  state,
  setState,
  setCharacter,
  onDone,
}: {
  character: Character;
  state: CombatState;
  setState: (s: CombatState) => void;
  setCharacter: (c: Character) => void;
  onDone: (summary: string, ended: "won" | "fled" | "down") => void;
}) {
  const options = optionsFor(character, state);
  const standing = livingFoes(state);

  function take(o: Option) {
    if (o.disabled || state.over) return;
    const next = playerTurn(character, state, o);
    setState(next);
    if (next.over) {
      setCharacter(applyCombat(character, next));
    }
  }

  return (
    <div className="fight">
      <header className="fight__head">
        <h2>Fight — round {state.round}</h2>
        <span className="fight__you">
          You: {state.hpNow} hp · AC {playerAc(character, state)}
          {state.wardRounds > 0 ? ` (warded ${state.wardRounds})` : ""}
        </span>
      </header>

      <ul className="fight__foes">
        {state.foes.map((f, i) => (
          <li key={f.id + i} className={f.down ? "foe foe--down" : "foe"}>
            <strong>{f.name}</strong>
            <span>
              {f.down ? "down" : `${f.hp}/${f.maxHp} hp · AC ${f.ac}`}
            </span>
          </li>
        ))}
      </ul>

      <div className="fight__log">
        {state.log.slice(-10).map((l, i) => (
          <p key={i} className={l.who === "you" ? "fl fl--you" : "fl fl--them"}>
            {l.die != null && (
              <span className="fl__die">{l.die}</span>
            )}
            {l.text}
            {l.damage != null && l.damage > 0 && (
              <span className="fl__dmg"> {l.damage} damage</span>
            )}
          </p>
        ))}
      </div>

      {state.over ? (
        <div className="fight__end">
          <p>{combatSummary(state)}</p>
          <button
            className="fight__go"
            onClick={() => onDone(combatSummary(state), state.over!)}
          >
            {state.over === "down" ? "…" : "Carry on"}
          </button>
        </div>
      ) : (
        <div className="fight__opts">
          {options.map((o) => (
            <button
              key={o.kind + o.id}
              className={`opt opt--${o.kind}`}
              disabled={!!o.disabled || standing.length === 0}
              title={o.disabled ?? o.detail}
              onClick={() => take(o)}
            >
              <span className="opt__label">{o.label}</span>
              <span className="opt__detail">{o.disabled ?? o.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
