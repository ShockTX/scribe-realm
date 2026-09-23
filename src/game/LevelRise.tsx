/**
 * What a new level gives you, said once, and the subclass the SRD is waiting on.
 */
import type { Character } from "../model/character";
import { chooseSubclass, subclassDue, type LevelNote } from "../rules/advance";

export function LevelRise({
  notes,
  character,
  setCharacter,
  onDismiss,
}: {
  notes: LevelNote[];
  character: Character;
  setCharacter: (c: Character) => void;
  onDismiss?: () => void;
}) {
  const due = subclassDue(character);
  if (!notes.length && !due) return null;

  return (
    <div className="rise" role="status">
      {notes.map((n) => (
        <div key={n.level}>
          <p className="rise__title">
            {n.className} {n.level}
          </p>
          <p className="rise__line">
            {n.hpGain} more hit points, and a hit die back in your pocket.
          </p>
          {n.features.length > 0 && (
            <ul className="rise__feats">
              {n.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {due && (
        <div className="rise__pick">
          <p className="rise__line">Choose a {due.flavor.toLowerCase()}.</p>
          <div className="rise__opts">
            {due.options.map((o) => (
              <button
                key={o.index}
                type="button"
                className="suggest"
                onClick={() => setCharacter(chooseSubclass(character, o.index))}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {notes.length > 0 && onDismiss && (
        <button type="button" className="link" onClick={onDismiss}>
          Noted
        </button>
      )}
    </div>
  );
}
