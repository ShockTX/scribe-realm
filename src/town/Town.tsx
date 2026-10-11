import { useEffect, useRef, useState } from "react";
import { totalLevel, type Character } from "../model/character";
import { maxHp, hpOf } from "../rules/derive";
import {
  LOCATIONS,
  TOWN_MAP_ART,
  TOWN_NAME,
  locationById,
  placePanels,
  type TownLocation,
  type ServiceKind,
} from "./locations";
import { townLine, stageOf } from "./campaign";
import { stockFor, itemById, sellPrice, identifyPack, type ShopItem } from "./shops";
import { Board } from "./Board";
import { SceneView } from "../scene/SceneView";
import type { Run } from "../scene/run";
import { PartySheet } from "../game/PartySheet";
import { LevelRise } from "../game/LevelRise";
import { applyLevels, levelFromXp, xpToNext, type LevelNote } from "../rules/advance";
import { rememberFacts } from "../model/memory";
import { heroArmorClass } from "../game/party";
import { unequipId, type Equipped } from "../game/gear";
import {
  ROOM_PRICE,
  MEAL_PRICE,
  companionOfTheDay,
  rumourOfTheDay,
} from "./inn";

/** Coin the trainer wants per level taken, scaled by how far you have come. */
export const TRAIN_FEE = 25;
/** A berth up the coast: coin, and a day of the Salt Rise getting worse. */
export const PASSAGE_FEE = 10;

/** Same coastal day for every captain. Too poor, and the character is unchanged. */
export function afterPassage(character: Character): Character {
  if (character.coin.gp < PASSAGE_FEE) return character;
  return {
    ...character,
    coin: { ...character.coin, gp: character.coin.gp - PASSAGE_FEE },
    day: character.day + 1,
  };
}

export function passageLine(locationId: string): string {
  if (locationId === "ship") {
    return "Fenn takes you up the coast and back before dark. A day gone, and the water higher than it was.";
  }
  return "You take the coast and come back on the evening tide. A day gone, and the water higher than it was.";
}

/** The map, with every door on it clickable. */
function TownMap({ onEnter }: { onEnter: (id: string) => void }) {
  const [hovered, setHovered] = useState<TownLocation | null>(null);

  return (
    <div className="town town--map">
      <header className="town__head">
        <h1>{TOWN_NAME}</h1>
        <p>{hovered ? hovered.trade : "A port town, and a place to begin."}</p>
      </header>

      <div className="map">
        <img className="map__art" src={TOWN_MAP_ART} alt={`A map of ${TOWN_NAME}`} />
        {LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            className="map__spot"
            style={{
              left: `${loc.hotspot.left}%`,
              top: `${loc.hotspot.top}%`,
              width: `${loc.hotspot.width}%`,
              height: `${loc.hotspot.height}%`,
            }}
            onMouseEnter={() => setHovered(loc)}
            onMouseLeave={() => setHovered((h) => (h === loc ? null : h))}
            onFocus={() => setHovered(loc)}
            onBlur={() => setHovered((h) => (h === loc ? null : h))}
            onClick={() => onEnter(loc.id)}
            aria-label={`${loc.name} — ${loc.trade}`}
          >
            <span className="map__tag">{loc.name}</span>
          </button>
        ))}
      </div>

      <ul className="town__index">
        {LOCATIONS.map((loc) => (
          <li key={loc.id}>
            <button
              className="link"
              onClick={() => onEnter(loc.id)}
              onMouseEnter={() => setHovered(loc)}
              onMouseLeave={() => setHovered((h) => (h === loc ? null : h))}
            >
              {loc.name}
            </button>
            <span className="town__trade">{loc.trade}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Counter({
  stock,
  character,
  onBuy,
  onSell,
}: {
  stock: ShopItem[];
  character: Character;
  onBuy: (item: ShopItem) => void;
  onSell: (itemId: string) => void;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");

  // The pack, folded into counts so five torches are one row.
  const counts = new Map<string, number>();
  for (const id of character.pack) counts.set(id, (counts.get(id) ?? 0) + 1);

  return (
    <div className="counter">
      <div className="counter__tabs">
        <button
          className={tab === "buy" ? "tab tab--on" : "tab"}
          onClick={() => setTab("buy")}
        >
          On the shelves
        </button>
        <button
          className={tab === "sell" ? "tab tab--on" : "tab"}
          onClick={() => setTab("sell")}
        >
          Sell from your pack
        </button>
      </div>

      {tab === "buy" ? (
        <ul className="wares">
          {stock.map((item) => {
            const afford = character.coin.gp >= item.price;
            return (
              <li key={item.id} className={afford ? "ware" : "ware ware--dear"}>
                <div className="ware__text">
                  <strong>{item.name}</strong>
                  <span className="ware__note">{item.note}</span>
                </div>
                <button
                  className="ware__buy"
                  disabled={!afford}
                  onClick={() => onBuy(item)}
                >
                  {afford ? `${item.price} gp` : `${item.price} gp — too dear`}
                </button>
              </li>
            );
          })}
        </ul>
      ) : counts.size === 0 ? (
        <p className="counter__empty">Your pack is empty.</p>
      ) : (
        <ul className="wares">
          {[...counts.entries()].map(([id, n]) => {
            const item = itemById(id);
            const name = item ? item.name : id;
            // P8: unknown ids pay nothing — a 1gp fallback mints coin from junk.
            const price = item ? sellPrice(item.price) : 0;
            return (
              <li key={id} className="ware">
                <div className="ware__text">
                  <strong>
                    {name}
                    {n > 1 ? ` ×${n}` : ""}
                  </strong>
                  <span className="ware__note">Half of what it sold for.</span>
                </div>
                <button className="ware__buy" onClick={() => onSell(id)}>
                  Sell for {price} gp
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function InnCounter({
  character,
  onRest,
  onHire,
  onMeal,
}: {
  character: Character;
  onRest: () => void;
  onHire: (fee: number, id: string, name: string) => void;
  onMeal: () => void;
}) {
  const companion = companionOfTheDay(character.day, character);
  const hired = companion ? character.companions.includes(companion.id) : false;
  const hp = hpOf(character);
  const full = hp >= maxHp(character).value;

  return (
    <div className="counter">
      <div className="inn">
        <section className="inn__block">
          <h3>A room for the night</h3>
          <p className="ware__note">{rumourOfTheDay(character.day)}</p>
          <button
            className="ware__buy"
            disabled={character.coin.gp < ROOM_PRICE}
            onClick={onRest}
          >
            {full
              ? `Sleep anyway — ${ROOM_PRICE} gp`
              : `Take a room — ${ROOM_PRICE} gp`}
          </button>
        </section>

        <section className="inn__block">
          <h3>A hot meal</h3>
          <p className="ware__note">Onions, fish, and bread that fights back.</p>
          <button
            className="ware__buy"
            disabled={character.coin.gp < MEAL_PRICE}
            onClick={onMeal}
          >
            Eat — {MEAL_PRICE} gp
          </button>
        </section>

        <section className="inn__block">
          <h3>At the far table</h3>
          {companion ? (
            <>
              <p>
                <strong>{companion.name}</strong>, {companion.role.toLowerCase()}
              </p>
              <p className="ware__note">“{companion.line}”</p>
              <button
                className="ware__buy"
                disabled={hired || character.coin.gp < companion.fee}
                onClick={() => onHire(companion.fee, companion.id, companion.name)}
              >
                {hired
                  ? "Already with you"
                  : `Buy them in — ${companion.fee} gp`}
              </button>
            </>
          ) : (
            <p className="ware__note">Nobody worth your coin tonight.</p>
          )}
        </section>
      </div>
    </div>
  );
}

/** setCharacter that also accepts a functional update (Board needs it). */
type SetCharacter = (next: Character | ((prev: Character) => Character)) => void;

/** Inside one building. */
function Interior({
  loc,
  character,
  setCharacter,
  onLeave,
  onVenture,
}: {
  loc: TownLocation;
  character: Character;
  setCharacter: SetCharacter;
  onLeave: () => void;
  onVenture: () => void;
}) {
  const [said, setSaid] = useState<string | null>(null);
  const stock = stockFor(loc.id);
  const panels = placePanels(loc, stock.length);

  const buy = (item: ShopItem) => {
    // P8: the button disables when poor, but a stale render could still fire
    // — never sell on credit.
    if (character.coin.gp < item.price) return;
    setCharacter({
      ...character,
      coin: { ...character.coin, gp: character.coin.gp - item.price },
      pack: [...character.pack, item.id],
    });
    setSaid(`${item.name} — ${item.price} gp. It goes in the pack.`);
  };

  const sell = (itemId: string) => {
    // P8: splice(-1) would eat the LAST pack item while paying for this one.
    // Nothing of that id in the pack means no sale and no pay.
    const idx = character.pack.indexOf(itemId);
    if (idx === -1) return setSaid("There's nothing like that in the pack to sell.");
    const item = itemById(itemId);
    // P8: unknown ids pay nothing — no mint for unsellable junk.
    const price = item ? sellPrice(item.price) : 0;
    const pack = [...character.pack];
    pack.splice(idx, 1);
    // P8: a sold copy that is also worn (older saves kept worn ids in the
    // pack) comes off first, or the sheet keeps showing a ghost. A spare
    // copy still in the pack keeps its slot — only the last copy unwears.
    // Armour class re-derives from what is worn, so no stored number to fix.
    const lastCopy = !pack.includes(itemId);
    const equipped = lastCopy
      ? unequipId((character.equipped ?? {}) as Equipped, itemId)
      : character.equipped;
    const companionGear = lastCopy
      ? Object.fromEntries(
          Object.entries(character.companionGear ?? {}).map(([k, g]) => [k, unequipId(g as Equipped, itemId)]),
        )
      : character.companionGear;
    setCharacter({
      ...character,
      equipped,
      companionGear,
      coin: { ...character.coin, gp: character.coin.gp + price },
      pack,
    });
    setSaid(`${item ? item.name : itemId} — ${price} gp, and no questions.`);
  };

  const rest = () => {
    // P8: stale-state safe — the button disables, the guard decides.
    if (character.coin.gp < ROOM_PRICE) return;
    const full = maxHp(character).value;
    setCharacter({
      ...character,
      coin: { ...character.coin, gp: character.coin.gp - ROOM_PRICE },
      currentHp: full,
      hitDiceRemaining: Math.max(1, Math.floor(character.classes[0]?.level ?? 1)),
      day: character.day + 1,
    });
    setSaid("You sleep until the gulls start, and wake up whole. A new day.");
  };

  const meal = () => {
    // P8: stale-state safe — the button disables, the guard decides.
    if (character.coin.gp < MEAL_PRICE) return;
    const full = maxHp(character).value;
    const hp = hpOf(character);
    setCharacter({
      ...character,
      coin: { ...character.coin, gp: character.coin.gp - MEAL_PRICE },
      currentHp: Math.min(full, hp + 1),
    });
    setSaid("Hot food, and you feel a little more like yourself.");
  };

  const hire = (fee: number, id: string, name: string) => {
    // P8: no double-hire and no credit — stale double-taps do nothing.
    if (character.companions.includes(id) || character.coin.gp < fee) return;
    setCharacter({
      ...character,
      coin: { ...character.coin, gp: character.coin.gp - fee },
      companions: [...character.companions, id],
    });
    setSaid(`${name} drains the cup, stands, and follows you out.`);
  };

  const HEAL_PER_HP = 4;
  const full = maxHp(character).value;
  const hurt = Math.max(0, full - hpOf(character));

  /** Pay for tending. Coin buys hit points, capped by what you can afford. */
  const heal = () => {
    const want = Math.min(hurt, Math.floor(character.coin.gp / HEAL_PER_HP));
    if (hurt <= 0) return setSaid("You are whole. Save your coin.");
    if (want <= 0) return setSaid("Tending costs coin, and you have none to spare.");
    setCharacter({
      ...character,
      coin: { ...character.coin, gp: character.coin.gp - want * HEAL_PER_HP },
      currentHp: hpOf(character) + want,
    });
    setSaid(`Salt, thread and a poultice. ${want} hit point${want > 1 ? "s" : ""} back, for ${want * HEAL_PER_HP} gp.`);
  };

  /** Training is where earned levels are actually taken, and paid for. */
  const owed = levelFromXp(character.xp ?? 0) - (totalLevel(character) || 1);
  const trainFee = TRAIN_FEE * Math.max(1, totalLevel(character) || 1);
  const train = () => {
    if (owed <= 0) {
      return setSaid("There is nothing here you have not already learned. Come back with more behind you.");
    }
    if (character.coin.gp < trainFee) {
      return setSaid(`The work is yours when you can pay for it — ${trainFee} gp.`);
    }
    const paid = { ...character, coin: { ...character.coin, gp: character.coin.gp - trainFee } };
    const { character: raised, notes } = applyLevels(paid);
    setCharacter(raised);
    const top = notes[notes.length - 1];
    setSaid(
      top
        ? `Days of it, and it takes. Level ${top.level}. ${trainFee} gp.`
        : `Level taken. ${trainFee} gp.`,
    );
  };

  /** Passage costs a day, which is what gives the Salt Rise its teeth. */
  const travel = () => {
    const next = afterPassage(character);
    if (next === character) {
      return setSaid(`Passage is ${PASSAGE_FEE} gp, and nobody sails on credit.`);
    }
    setCharacter(next);
    setSaid(passageLine(loc.id));
  };

  const identify = () => {
    setSaid(identifyPack(character.pack));
  };

  const stageLine = townLine(loc.id, character);
  const doService = (kind: ServiceKind) => {
    if (kind === "heal") return heal();
    if (kind === "train") return train();
    if (kind === "travel") return travel();
    if (kind === "identify") return identify();
  };
  const extras = loc.services.filter(
    (s) => s.kind === "heal" || s.kind === "train" || s.kind === "travel" || s.kind === "identify",
  );

  return (
    <div className="town">
      <header className="town__head">
        <h1>{loc.name}</h1>
        <p>{loc.keeper}</p>
      </header>

      <div className="interior">
        <div className="stage">
          <div className={loc.art ? "scene" : "scene scene--unpainted"}>
            {loc.art ? (
              <img className="scene__art" src={loc.art} alt={`Inside ${loc.name}`} />
            ) : (
              <p className="scene__pending">This room has not been painted yet.</p>
            )}
          </div>
          <p className={said ? "scene__text scene__text--said" : "scene__text"}>
            {said ?? stageLine ?? loc.description}
          </p>
        </div>

        {panels.shop && (
          <Counter
            stock={stock}
            character={character}
            onBuy={buy}
            onSell={sell}
          />
        )}
        {panels.inn && (
          <InnCounter
            character={character}
            onRest={rest}
            onHire={hire}
            onMeal={meal}
          />
        )}
        {panels.board && (
          <Board
            character={character}
            setCharacter={setCharacter}
            say={setSaid}
            onVenture={onVenture}
            autoAsk={loc.id === "guildhall"}
            placeId={loc.id}
          />
        )}
        {!panels.shop && !panels.inn && !panels.board && (
          <div className="counter">
            <p className="counter__empty">
              There is nothing for sale here — only talk, and not much of that
              yet.
            </p>
          </div>
        )}
        {extras.length > 0 && (
          <div className="services">
            {extras.map((sv) => (
              <button
                key={sv.kind}
                className="services__act"
                onClick={() => doService(sv.kind)}
              >
                {sv.label}
                {sv.kind === "train" && owed > 0 ? ` (${trainFee} gp)` : ""}
                {sv.kind === "heal" && hurt > 0 ? ` (${HEAL_PER_HP} gp a point)` : ""}
                {sv.kind === "travel" ? ` (${PASSAGE_FEE} gp, a day)` : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="link link--back" onClick={onLeave}>
        ← Back to the street
      </button>
    </div>
  );
}

export function TownView({
  character,
  onChange,
}: {
  character: Character;
  onChange?: (c: Character) => void;
}) {
  const [local, setLocal] = useState<Character>(character);
  const [where, setWhere] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [rise, setRise] = useState<LevelNote[]>([]);
  const localRef = useRef(local);
  localRef.current = local;
  const loc = where ? locationById(where) : undefined;

  const update = (next: Character | ((prev: Character) => Character)) => {
    const c = typeof next === "function" ? next(localRef.current) : next;
    localRef.current = c;
    setLocal(c);
    onChange?.(c);
  };

  // A save can hold XP from before levels existed. Catch it up in town,
  // never mid-run — the scene announces a level earned at the table.
  useEffect(() => {
    if (local.activeRun) return;
    const risen = applyLevels(local);
    if (!risen.notes.length) return;
    update(risen.character);
    setRise(risen.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.xp, local.activeRun]);

  const hp = hpOf(local);

  const run = local.activeRun as Run | undefined;
  const runQuest = run
    ? (local.quests ?? []).find((q) => q.id === run.questId)
    : undefined;

  if (run && runQuest) {
    return (
      <SceneView
        character={local}
        setCharacter={update}
        quest={runQuest}
        run={run}
        setRun={(r) => update({ ...localRef.current, activeRun: r })}
        onLeave={() => {
          const current = localRef.current;
          const runNow = current.activeRun as Run | undefined;
          update(rememberFacts({ ...current, activeRun: undefined }, runNow?.ledger ?? []));
        }}
      />
    );
  }

  return (
    <>
      <div className="purse">
        <button className="purse__who" onClick={() => setSheet((v) => !v)}>
          {local.name}
        </button>
        <span>Level {totalLevel(local) || 1}</span>
        <span title="Experience, and what the next level asks for">
          XP {local.xp ?? 0}
          {xpToNext(totalLevel(local) || 1) != null
            ? ` / ${xpToNext(totalLevel(local) || 1)}`
            : ""}
        </span>
        {levelFromXp(local.xp ?? 0) > (totalLevel(local) || 1) && (
          <span className="purse__owed" title="Earned. Pay the trainer at the yard to take it.">
            Level earned — train
          </span>
        )}
        <span>Day {local.day} · {stageOf(local).name}</span>
        <span>
          HP {hp}/{maxHp(local).value}
        </span>
        <span>AC {heroArmorClass(local)}</span>
        <span>{local.coin.gp} gp</span>
        <span>Pack {local.pack.length}</span>
        {local.companions.length > 0 && (
          <span>Party {local.companions.length + 1}</span>
        )}
        {(local.quests ?? []).some((q) => q.state === "taken") && (
          <span>
            Work {(local.quests ?? []).filter((q) => q.state === "taken").length}
          </span>
        )}
      </div>
      {!local.activeRun && (
        <LevelRise
          notes={rise}
          character={local}
          setCharacter={update}
          onDismiss={() => setRise([])}
        />
      )}
      {sheet ? (
        <PartySheet
          character={local}
          setCharacter={update}
          onClose={() => setSheet(false)}
        />
      ) : loc ? (
        <Interior
          loc={loc}
          character={local}
          setCharacter={update}
          onLeave={() => setWhere(null)}
          onVenture={() => setWhere(null)}
        />
      ) : (
        <TownMap onEnter={setWhere} />
      )}
    </>
  );
}
