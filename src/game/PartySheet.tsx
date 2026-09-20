import { useState } from "react";
import type { Character } from "../model/character";
import {
  ABILITIES,
  type Ability,
} from "../model/character";
import {
  modifiers,
  finalScores,
  formatModifier,
  proficiencyBonus,
  passivePerception,
  initiative,
  speed,
  savingThrow,
  skillBonus,
  spellSaveDc,
  spellAttackBonus,
  spellSlots,
  spellName,
  hitDie,
} from "../rules/derive";
import { itemById } from "../town/shops";
import {
  SLOTS,
  ARMOR,
  WEAPONS,
  slotsFor,
  isEquippable,
  equip,
  unequip,
  armorClassFrom,
  type Slot,
  type Equipped,
} from "./gear";
import { partyOf, type SheetMember } from "./party";
import { skillByIndex } from "../rules/srd";

const ABILITY_NAMES: Record<Ability, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

const SKILL_ORDER = [
  "acrobatics", "animal-handling", "arcana", "athletics", "deception",
  "history", "insight", "intimidation", "investigation", "medicine",
  "nature", "perception", "performance", "persuasion", "religion",
  "sleight-of-hand", "stealth", "survival",
];

function itemName(id: string): string {
  return itemById(id)?.name ?? id;
}

/** The slot rail: nine places a thing can go, each either filled or waiting. */
function Slots({
  equipped,
  onClear,
  onPick,
  active,
}: {
  equipped: Equipped;
  onClear: (slot: Slot) => void;
  onPick: (slot: Slot) => void;
  active: Slot | null;
}) {
  return (
    <ul className="slots">
      {SLOTS.map((s) => {
        const worn = equipped[s.id] ?? null;
        return (
          <li key={s.id} className={worn ? "slot slot--filled" : "slot"}>
            <button
              className={active === s.id ? "slot__face slot__face--active" : "slot__face"}
              onClick={() => onPick(s.id)}
              aria-label={`${s.label}: ${worn ? itemName(worn) : "empty"}`}
            >
              <span className="slot__label">{s.label}</span>
              <span className="slot__value">{worn ? itemName(worn) : s.hint}</span>
            </button>
            {worn && (
              <button
                className="slot__off"
                onClick={() => onClear(s.id)}
                aria-label={`Take off ${itemName(worn)}`}
                title="Take it off"
              >
                ×
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** What in the pack could go in the slot you just tapped. */
function Candidates({
  slot,
  pack,
  onEquip,
  onClose,
}: {
  slot: Slot;
  pack: string[];
  onEquip: (id: string) => void;
  onClose: () => void;
}) {
  const seen = new Set<string>();
  const options = pack.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return slotsFor(id).includes(slot);
  });
  const label = SLOTS.find((s) => s.id === slot)?.label ?? slot;

  return (
    <div className="picker">
      <div className="picker__head">
        <h4>{label}</h4>
        <button className="link" onClick={onClose}>close</button>
      </div>
      {options.length === 0 ? (
        <p className="muted">Nothing in the pack fits here. The shops in town will.</p>
      ) : (
        <ul className="picker__list">
          {options.map((id) => {
            const armor = ARMOR[id];
            const weapon = WEAPONS[id];
            return (
              <li key={id}>
                <button className="picker__opt" onClick={() => onEquip(id)}>
                  <strong>{itemName(id)}</strong>
                  <span className="muted">
                    {armor
                      ? armor.weight === "shield"
                        ? "+2 armour class"
                        : `Armour class ${armor.base}${armor.dexCap === null ? " + dexterity" : armor.dexCap === 0 ? "" : ` + dexterity (max ${armor.dexCap})`}`
                      : weapon
                        ? `${weapon.damage}${weapon.hands === 2 ? ", two hands" : ""}`
                        : "Worn"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The hero's full sheet: numbers on the left, gear and skills to the right. */
function HeroSheet({
  character,
  setCharacter,
}: {
  character: Character;
  setCharacter: (c: Character) => void;
}) {
  const [picking, setPicking] = useState<Slot | null>(null);
  const mods = modifiers(character);
  const scores = finalScores(character);
  const equipped = (character.equipped ?? {}) as Equipped;
  const ac = armorClassFrom(equipped, mods.dex);
  const prof = proficiencyBonus(character).value;
  const dc = spellSaveDc(character);
  const atk = spellAttackBonus(character);
  const slots = spellSlots(character);

  const setEquipped = (next: Equipped) =>
    setCharacter({ ...character, equipped: next });

  const counts = new Map<string, number>();
  for (const id of character.pack ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  const carried = [...counts.entries()].filter(([id]) => !isEquippable(id));

  return (
    <div className="sheet">
      <div className="sheet__rail">
        <div className="vitals">
          <div className="vital vital--big">
            <span className="vital__n">{ac.value}</span>
            <span className="vital__k">Armour class</span>
            <span className="vital__sub">{ac.from === "unarmoured" ? "unarmoured" : itemName(ac.from.split(" + ")[0]) + (ac.from.includes("shield") ? " + shield" : "")}</span>
          </div>
          <div className="vital">
            <span className="vital__n">{character.currentHp || 0}</span>
            <span className="vital__k">Hit points</span>
          </div>
          <div className="vital">
            <span className="vital__n">{formatModifier(initiative(character).value)}</span>
            <span className="vital__k">Initiative</span>
          </div>
          <div className="vital">
            <span className="vital__n">{speed(character).value}</span>
            <span className="vital__k">Speed</span>
          </div>
          <div className="vital">
            <span className="vital__n">{formatModifier(prof)}</span>
            <span className="vital__k">Proficiency</span>
          </div>
          <div className="vital">
            <span className="vital__n">{passivePerception(character).value}</span>
            <span className="vital__k">Passive perception</span>
          </div>
          <div className="vital">
            <span className="vital__n">d{hitDie(character)}</span>
            <span className="vital__k">Hit die</span>
          </div>
        </div>

        <div className="abilities">
          {ABILITIES.map((a) => (
            <div key={a} className="ability">
              <span className="ability__k">{ABILITY_NAMES[a].slice(0, 3).toUpperCase()}</span>
              <span className="ability__n">{scores[a]}</span>
              <span className="ability__m">{formatModifier(mods[a])}</span>
              <span className="ability__save">
                save {formatModifier(savingThrow(character, a).bonus)}
                {savingThrow(character, a).proficient ? " ●" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="sheet__main">
        <section className="panel">
          <h3>Worn and wielded</h3>
          <Slots
            equipped={equipped}
            active={picking}
            onPick={(s) => setPicking((p) => (p === s ? null : s))}
            onClear={(s) => setEquipped(unequip(equipped, s))}
          />
          {picking && (
            <Candidates
              slot={picking}
              pack={character.pack ?? []}
              onEquip={(id) => {
                setEquipped(equip(equipped, picking, id));
                setPicking(null);
              }}
              onClose={() => setPicking(null)}
            />
          )}
        </section>

        <section className="panel">
          <h3>Skills</h3>
          <ul className="skills">
            {SKILL_ORDER.map((idx) => {
              const s = skillBonus(character, idx);
              const name = skillByIndex.get(idx)?.name ?? idx;
              return (
                <li key={idx} className={s.proficient ? "skill skill--on" : "skill"}>
                  <span className="skill__dot" aria-hidden="true" />
                  <span className="skill__name">{name}</span>
                  <span className="skill__n">{formatModifier(s.bonus)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {dc && (
          <section className="panel">
            <h3>Spellcasting</h3>
            <div className="spellbar">
              <span>Save DC <strong>{dc.value}</strong></span>
              <span>Attack <strong>{formatModifier(atk?.value ?? 0)}</strong></span>
              {slots.map((n, i) =>
                n > 0 ? (
                  <span key={i}>
                    Level {i + 1} <strong>{n}</strong>
                  </span>
                ) : null,
              )}
            </div>
            {(character.spells?.known ?? []).length > 0 && (
              <ul className="spells">
                {character.spells.known.map((s) => (
                  <li key={s}>{spellName(s)}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="panel">
          <h3>Carried</h3>
          {carried.length === 0 ? (
            <p className="muted">Nothing but what you are wearing.</p>
          ) : (
            <ul className="carried">
              {carried.map(([id, n]) => (
                <li key={id}>
                  {itemName(id)}
                  {n > 1 ? ` ×${n}` : ""}
                </li>
              ))}
            </ul>
          )}
          <p className="muted">{character.coin.gp} gp in the purse.</p>
        </section>
      </div>
    </div>
  );
}

/** A hire's page: smaller, but the same shape so it never feels second-class. */
function CompanionSheet({
  member,
  character,
  setCharacter,
}: {
  member: SheetMember;
  character: Character;
  setCharacter: (c: Character) => void;
}) {
  const [picking, setPicking] = useState<Slot | null>(null);
  const gear = ((character.companionGear ?? {}) as Record<string, Equipped>)[member.key] ?? {};
  const ac = armorClassFrom(gear, 1);
  const note = (character.memberNotes ?? {})[member.key] ?? "";

  const setGear = (next: Equipped) =>
    setCharacter({
      ...character,
      companionGear: { ...(character.companionGear ?? {}), [member.key]: next },
    });

  return (
    <div className="sheet">
      <div className="sheet__rail">
        <div className="vitals">
          <div className="vital vital--big">
            <span className="vital__n">{Math.max(member.ac, ac.value)}</span>
            <span className="vital__k">Armour class</span>
          </div>
          <div className="vital">
            <span className="vital__n">{member.hp}</span>
            <span className="vital__k">Hit points</span>
          </div>
        </div>
        <blockquote className="saying">“{member.line}”</blockquote>
      </div>

      <div className="sheet__main">
        <section className="panel">
          <h3>What you have given them</h3>
          <Slots
            equipped={gear}
            active={picking}
            onPick={(s) => setPicking((p) => (p === s ? null : s))}
            onClear={(s) => setGear(unequip(gear, s))}
          />
          {picking && (
            <Candidates
              slot={picking}
              pack={character.pack ?? []}
              onEquip={(id) => {
                setGear(equip(gear, picking, id));
                setPicking(null);
              }}
              onClose={() => setPicking(null)}
            />
          )}
          <p className="muted">
            Anything you hand over comes out of your own pack.
          </p>
        </section>

        <section className="panel">
          <h3>Notes</h3>
          <textarea
            className="notes"
            value={note}
            placeholder={`What ${member.name.split(" ")[0]} is for.`}
            onChange={(e) =>
              setCharacter({
                ...character,
                memberNotes: { ...(character.memberNotes ?? {}), [member.key]: e.target.value },
              })
            }
          />
        </section>
      </div>
    </div>
  );
}

/** The whole thing: a tab per member, one page each. */
export function PartySheet({
  character,
  setCharacter,
  onClose,
}: {
  character: Character;
  setCharacter: (c: Character) => void;
  onClose: () => void;
}) {
  const party = partyOf(character);
  const [who, setWho] = useState(party[0]?.key ?? "hero");
  const member = party.find((m) => m.key === who) ?? party[0];

  return (
    <div className="party">
      <header className="party__head">
        <nav className="party__tabs">
          {party.map((m) => (
            <button
              key={m.key}
              className={m.key === who ? "ptab ptab--on" : "ptab"}
              onClick={() => setWho(m.key)}
            >
              <span className="ptab__name">{m.name}</span>
              <span className="ptab__bill">{m.billing}</span>
            </button>
          ))}
        </nav>
        <button className="link" onClick={onClose}>
          ← Back to the street
        </button>
      </header>

      {member && member.kind === "hero" ? (
        <HeroSheet character={character} setCharacter={setCharacter} />
      ) : member ? (
        <CompanionSheet
          member={member}
          character={character}
          setCharacter={setCharacter}
        />
      ) : null}
    </div>
  );
}
