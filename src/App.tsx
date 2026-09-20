import { useEffect, useState } from "react";
import { Creator } from "./creator/Creator";
import { TownView } from "./town/Town";
import { Boundary } from "./Boundary";
import { normalize } from "./model/normalize";
import type { Character } from "./model/character";

const SAVE_KEY = "scribe-realm:character";

function load(): Character | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

function save(c: Character) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(c));
  } catch { /* storage full or blocked; play on */ }
}

export function App() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [screen, setScreen] = useState<"title" | "create" | "town">("title");
  const [saved, setSaved] = useState<Character | null>(null);

  useEffect(() => { setSaved(load()); }, []);

  const reset = () => {
    localStorage.removeItem(SAVE_KEY);
    setSaved(null);
    setCharacter(null);
    setScreen("title");
  };

  const bind = (c: Character) => { save(c); setCharacter(c); setScreen("town"); };

  let body;
  if (screen === "create") {
    body = <Creator onBind={bind} />;
  } else if (screen === "town" && character) {
    body = (
      <TownView
        character={character}
        onChange={(c) => { save(c); setCharacter(c); }}
      />
    );
  } else {
    body = (
      <div className="title">
        <h1>Scribe Realm</h1>
        <p>A character, a town, and whatever you make of it.</p>
        <div className="title__acts">
          <button className="bind" onClick={() => setScreen("create")}>New character</button>
          {saved && (
            <button
              className="link"
              onClick={() => { const c = normalize(saved); if (c) { save(c); setCharacter(c); setScreen("town"); } }}
            >
              Continue as {saved.name}
            </button>
          )}
        </div>
      </div>
    );
  }

  return <Boundary onReset={reset}>{body}</Boundary>;
}
