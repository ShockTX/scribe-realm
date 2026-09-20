import { useEffect, useState } from "react";
import { Creator } from "./creator/Creator";
import { TownView } from "./town/Town";
import type { Character } from "./model/character";

const SAVE_KEY = "scribe-realm:character";

function load(): Character | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Character;
    return c && c.version === 2 ? c : null;
  } catch { return null; }
}

export function App() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [screen, setScreen] = useState<"title" | "create" | "town">("title");
  const [saved, setSaved] = useState<Character | null>(null);

  useEffect(() => { setSaved(load()); }, []);

  const bind = (c: Character) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(c));
    setCharacter(c);
    setScreen("town");
  };

  if (screen === "create") return <Creator onBind={bind} />;
  if (screen === "town" && character) return <TownView character={character} />;

  return (
    <div className="title">
      <h1>Scribe Realm</h1>
      <p>A character, a town, and whatever you make of it.</p>
      <div className="title__acts">
        <button className="bind" onClick={() => setScreen("create")}>New character</button>
        {saved && (
          <button className="link" onClick={() => { setCharacter(saved); setScreen("town"); }}>
            Continue as {saved.name}
          </button>
        )}
      </div>
    </div>
  );
}
