import { useMemo, useState } from "react";
import {
  ABILITIES, type Ability, type Character, emptyCharacter,
} from "../model/character";
import {
  BACKGROUND_OPTIONS, CLASS_OPTIONS, POINT_BUY_BUDGET, RACE_OPTIONS,
  STANDARD_ARRAY, pointBuyLegal, pointBuySpend, rollAbility, skillChoice,
  spellPlan, startingGold,
} from "./choices";
import {
  armorClass, finalScores, formatModifier, initiative, maxHp, modifiers,
  passivePerception, proficiencyBonus, savingThrow, speed, spellAttackBonus,
  spellSaveDc, spellSlots,
} from "../rules/derive";
import { classByIndex, raceByIndex, backgroundByIndex, spellByIndex } from "../rules/srd";

const ABILITY_NAMES: Record<Ability, string> = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
};

type StepId = "name" | "race" | "class" | "background" | "abilities" | "spells" | "review";

function Choice({
  options, value, onPick,
}: {
  options: { index: string; name: string }[];
  value: string | null;
  onPick: (i: string) => void;
}) {
  return (
    <div className="choices">
      {options.map((o) => (
        <button
          key={o.index}
          className={"choice" + (value === o.index ? " choice--on" : "")}
          onClick={() => onPick(o.index)}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

export function Creator({ onBind }: { onBind: (c: Character) => void }) {
  const [c, setC] = useState<Character>(() => emptyCharacter());
  const [step, setStep] = useState<StepId>("name");
  const [method, setMethod] = useState<"roll" | "array" | "buy">("array");
  const [pool, setPool] = useState<number[]>(STANDARD_ARRAY);

  const set = (patch: Partial<Character>) => setC((prev) => ({ ...prev, ...patch }));
  const plan = useMemo(() => spellPlan(c), [c]);
  const skills = useMemo(
    () => skillChoice(c.classes[0]?.classIndex ?? null, c.backgroundIndex),
    [c.classes, c.backgroundIndex],
  );

  const steps: StepId[] = plan.casts
    ? ["name", "race", "class", "background", "abilities", "spells", "review"]
    : ["name", "race", "class", "background", "abilities", "review"];
  const at = steps.indexOf(step);

  const chosenCantrips = c.spells.known.filter((i) => spellByIndex.get(i)?.level === 0);
  const chosenSpells = c.spells.known.filter((i) => (spellByIndex.get(i)?.level ?? 0) > 0);

  const canAdvance = (): boolean => {
    switch (step) {
      case "name": return c.name.trim().length > 0;
      case "race": return !!c.raceIndex;
      case "class": return c.classes.length > 0;
      case "background":
        return !!c.backgroundIndex && c.skillProficiencies.length === skills.choose;
      case "abilities": return true;
      case "spells":
        return chosenCantrips.length === plan.cantrips && chosenSpells.length === plan.spells;
      default: return true;
    }
  };

  const toggleSkill = (index: string) => {
    setC((prev) => {
      const has = prev.skillProficiencies.includes(index);
      if (has) {
        return { ...prev, skillProficiencies: prev.skillProficiencies.filter((s) => s !== index) };
      }
      if (prev.skillProficiencies.length >= skills.choose) return prev;
      return { ...prev, skillProficiencies: [...prev.skillProficiencies, index] };
    });
  };

  const toggleSpell = (index: string, isCantrip: boolean) => {
    setC((prev) => {
      const known = prev.spells.known;
      if (known.includes(index)) {
        return { ...prev, spells: { ...prev.spells, known: known.filter((s) => s !== index) } };
      }
      const current = known.filter((i) =>
        isCantrip ? spellByIndex.get(i)?.level === 0 : (spellByIndex.get(i)?.level ?? 0) > 0,
      ).length;
      const cap = isCantrip ? plan.cantrips : plan.spells;
      if (current >= cap) return prev;
      return { ...prev, spells: { ...prev.spells, known: [...known, index] } };
    });
  };

  const assign = (a: Ability, v: number) =>
    setC((prev) => ({ ...prev, baseScores: { ...prev.baseScores, [a]: v } }));

  const bind = () => {
    const gold = startingGold(c.classes[0]?.classIndex ?? null);
    const hp = maxHp(c).value;
    onBind({
      ...c,
      currentHp: hp,
      hitDiceRemaining: Math.max(1, c.classes[0]?.level ?? 1),
      coin: { ...c.coin, gp: gold },
    });
  };

  const scores = finalScores(c);
  const mods = modifiers(c);
  const cls = c.classes[0] ? classByIndex.get(c.classes[0].classIndex) : undefined;

  return (
    <div className="creator">
      <header className="creator__head">
        <h1>Scribe Realm</h1>
        <ol className="creator__steps">
          {steps.map((s, i) => (
            <li key={s} className={i === at ? "on" : i < at ? "done" : ""}>{s}</li>
          ))}
        </ol>
      </header>

      <div className="creator__body">
        <section className="creator__choose">
          {step === "name" && (
            <>
              <h2>Who are you?</h2>
              <input
                className="field" autoFocus placeholder="Your name"
                value={c.name} onChange={(e) => set({ name: e.target.value })}
              />
            </>
          )}

          {step === "race" && (
            <>
              <h2>What blood?</h2>
              <Choice options={RACE_OPTIONS} value={c.raceIndex} onPick={(i) => set({ raceIndex: i })} />
            </>
          )}

          {step === "class" && (
            <>
              <h2>What calling?</h2>
              <Choice
                options={CLASS_OPTIONS}
                value={c.classes[0]?.classIndex ?? null}
                onPick={(i) => set({ classes: [{ classIndex: i, level: 1, subclassIndex: null }], spells: { known: [], prepared: [] } })}
              />
            </>
          )}

          {step === "background" && (
            <>
              <h2>Where from?</h2>
              <Choice
                options={BACKGROUND_OPTIONS}
                value={c.backgroundIndex}
                onPick={(i) => set({ backgroundIndex: i })}
              />
              {skills.choose > 0 && (
                <>
                  <h3>
                    Skills — choose {skills.choose}
                    <span className="count">{c.skillProficiencies.length} of {skills.choose}</span>
                  </h3>
                  <div className="choices choices--small">
                    {skills.options.map((s) => (
                      <button
                        key={s.index}
                        className={"choice" + (c.skillProficiencies.includes(s.index) ? " choice--on" : "")}
                        onClick={() => toggleSkill(s.index)}
                      >{s.name}</button>
                    ))}
                  </div>
                  {skills.granted.length > 0 && (
                    <p className="hint">
                      Your background also grants {skills.granted.map((g) => g.name).join(" and ")}.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {step === "abilities" && (
            <>
              <h2>What are you made of?</h2>
              <div className="methods">
                {(["array", "roll", "buy"] as const).map((m) => (
                  <button
                    key={m}
                    className={"choice" + (method === m ? " choice--on" : "")}
                    onClick={() => {
                      setMethod(m);
                      if (m === "array") setPool(STANDARD_ARRAY);
                      if (m === "roll") setPool(Array.from({ length: 6 }, rollAbility));
                      if (m === "buy") {
                        setC((p) => ({ ...p, baseScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } }));
                      }
                    }}
                  >
                    {m === "array" ? "Standard array" : m === "roll" ? "Roll 4d6" : "Point buy"}
                  </button>
                ))}
                {method === "roll" && (
                  <button className="choice" onClick={() => setPool(Array.from({ length: 6 }, rollAbility))}>
                    Roll again
                  </button>
                )}
              </div>

              {method === "buy" ? (
                <>
                  <p className="hint">
                    {POINT_BUY_BUDGET - pointBuySpend(c.baseScores)} points left
                  </p>
                  <div className="scores">
                    {ABILITIES.map((a) => (
                      <div className="score" key={a}>
                        <label>{ABILITY_NAMES[a]}</label>
                        <div className="score__row">
                          <button
                            onClick={() => pointBuyLegal(c.baseScores[a] - 1) && assign(a, c.baseScores[a] - 1)}
                          >−</button>
                          <strong>{c.baseScores[a]}</strong>
                          <button
                            onClick={() => {
                              const next = c.baseScores[a] + 1;
                              const after = { ...c.baseScores, [a]: next };
                              if (pointBuyLegal(next) && pointBuySpend(after) <= POINT_BUY_BUDGET) assign(a, next);
                            }}
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="hint">Assign these six numbers: {pool.join(", ")}</p>
                  <div className="scores">
                    {ABILITIES.map((a) => (
                      <div className="score" key={a}>
                        <label>{ABILITY_NAMES[a]}</label>
                        <select
                          value={c.baseScores[a]}
                          onChange={(e) => assign(a, Number(e.target.value))}
                        >
                          {[...new Set([...pool, c.baseScores[a]])].sort((x, y) => y - x).map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {step === "spells" && (
            <>
              <h2>What have you learned?</h2>
              <p className="hint">{plan.note}</p>
              {plan.cantrips > 0 && (
                <>
                  <h3>Cantrips<span className="count">{chosenCantrips.length} of {plan.cantrips}</span></h3>
                  <div className="spelllist">
                    {plan.cantripOptions.map((s) => (
                      <button
                        key={s.index}
                        className={"spell" + (c.spells.known.includes(s.index) ? " spell--on" : "")}
                        onClick={() => toggleSpell(s.index, true)}
                      >
                        <strong>{s.name}</strong>
                        <em>{s.casting_time} · {s.range}</em>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {plan.spells > 0 && (
                <>
                  <h3>Spells<span className="count">{chosenSpells.length} of {plan.spells}</span></h3>
                  <div className="spelllist">
                    {plan.spellOptions.map((s) => (
                      <button
                        key={s.index}
                        className={"spell" + (c.spells.known.includes(s.index) ? " spell--on" : "")}
                        onClick={() => toggleSpell(s.index, false)}
                      >
                        <strong>{s.name}</strong>
                        <em>lvl {s.level} · {s.casting_time} · {s.range}</em>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {step === "review" && (
            <>
              <h2>{c.name}</h2>
              <p className="hint">
                {raceByIndex.get(c.raceIndex ?? "")?.name} {cls?.name}
                {c.backgroundIndex ? ` — ${backgroundByIndex.get(c.backgroundIndex)?.name}` : ""}
              </p>
              <p className="hint">
                You will walk into Saltmarrow Reach with {startingGold(c.classes[0]?.classIndex ?? null)} gold.
              </p>
              <button className="bind" onClick={bind}>Bind the chronicle</button>
            </>
          )}
        </section>

        <aside className="creator__sheet">
          <h3>{c.name || "Unnamed"}</h3>
          <p className="sheet__sub">
            {raceByIndex.get(c.raceIndex ?? "")?.name ?? "—"} {cls?.name ?? ""}
          </p>
          <div className="sheet__scores">
            {ABILITIES.map((a) => (
              <div key={a}>
                <span>{a.toUpperCase()}</span>
                <strong>{scores[a]}</strong>
                <em>{formatModifier(mods[a])}</em>
              </div>
            ))}
          </div>
          <dl className="sheet__stats">
            <div><dt>Hit points</dt><dd>{cls ? maxHp(c).value : "—"}</dd></div>
            <div><dt>Armour class</dt><dd>{armorClass(c).value}</dd></div>
            <div><dt>Initiative</dt><dd>{formatModifier(initiative(c).value)}</dd></div>
            <div><dt>Speed</dt><dd>{speed(c).value} ft</dd></div>
            <div><dt>Proficiency</dt><dd>{formatModifier(proficiencyBonus(c).value)}</dd></div>
            <div><dt>Passive perception</dt><dd>{passivePerception(c).value}</dd></div>
            {spellSaveDc(c) && <div><dt>Spell save DC</dt><dd>{spellSaveDc(c)!.value}</dd></div>}
            {spellAttackBonus(c) && (
              <div><dt>Spell attack</dt><dd>{formatModifier(spellAttackBonus(c)!.value)}</dd></div>
            )}
          </dl>
          {cls && (
            <p className="sheet__saves">
              Saves: {ABILITIES.filter((a) => savingThrow(c, a).proficient)
                .map((a) => ABILITY_NAMES[a]).join(", ") || "none"}
            </p>
          )}
          {spellSlots(c).some((n) => n > 0) && (
            <p className="sheet__saves">
              Slots: {spellSlots(c).map((n, i) => n > 0 ? `L${i + 1}×${n}` : null)
                .filter(Boolean).join("  ")}
            </p>
          )}
          {c.skillProficiencies.length > 0 && (
            <p className="sheet__saves">
              Skills: {c.skillProficiencies.map((s) => skillChoice(null, null) && s).join(", ")}
            </p>
          )}
        </aside>
      </div>

      <footer className="creator__foot">
        <button className="link" disabled={at === 0} onClick={() => setStep(steps[at - 1])}>
          ← Back
        </button>
        {step !== "review" && (
          <button className="next" disabled={!canAdvance()} onClick={() => setStep(steps[at + 1])}>
            Next →
          </button>
        )}
      </footer>
    </div>
  );
}
