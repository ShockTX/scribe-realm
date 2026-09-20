import { useState } from "react";
import type { Character } from "../model/character";
import { armorClass, maxHp } from "../rules/derive";
import {
  LOCATIONS,
  TOWN_MAP_ART,
  TOWN_NAME,
  locationById,
  type TownLocation,
} from "./locations";
import { stockFor, itemById, sellPrice, type ShopItem } from "./shops";
import { Board } from "./Board";
import { PartySheet } from "../game/PartySheet";
import { armorClassFrom } from "../game/gear";
import { modifiers } from "../rules/derive";
import {
  ROOM_PRICE,
  MEAL_PRICE,
  companionOfTheDay,
  rumourOfTheDay,
} from "./inn";

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
            const price = item ? sellPrice(item.price) : 1;
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
  const hp = character.currentHp || maxHp(character).value;
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

/** Inside one building. */
function Interior({
  loc,
  character,
  setCharacter,
  onLeave,
}: {
  loc: TownLocation;
  character: Character;
  setCharacter: (c: Character) => void;
  onLeave: () => void;
}) {
  const [said, setSaid] = useState<string | null>(null);
  const stock = stockFor(loc.id);
  const isInn = loc.id === "tavern";
  const isBoard = loc.id === "guildhall";

  const buy = (item: ShopItem) => {
    setCharacter({
      ...character,
      coin: { ...character.coin, gp: character.coin.gp - item.price },
      pack: [...character.pack, item.id],
    });
    setSaid(`${item.name} — ${item.price} gp. It goes in the pack.`);
  };

  const sell = (itemId: string) => {
    const item = itemById(itemId);
    const price = item ? sellPrice(item.price) : 1;
    const pack = [...character.pack];
    pack.splice(pack.indexOf(itemId), 1);
    setCharacter({
      ...character,
      coin: { ...character.coin, gp: character.coin.gp + price },
      pack,
    });
    setSaid(`${item ? item.name : itemId} — ${price} gp, and no questions.`);
  };

  const rest = () => {
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
    const full = maxHp(character).value;
    const hp = character.currentHp || full;
    setCharacter({
      ...character,
      coin: { ...character.coin, gp: character.coin.gp - MEAL_PRICE },
      currentHp: Math.min(full, hp + 1),
    });
    setSaid("Hot food, and you feel a little more like yourself.");
  };

  const hire = (fee: number, id: string, name: string) => {
    setCharacter({
      ...character,
      coin: { ...character.coin, gp: character.coin.gp - fee },
      companions: [...character.companions, id],
    });
    setSaid(`${name} drains the cup, stands, and follows you out.`);
  };

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
            {said ?? loc.description}
          </p>
        </div>

        {isBoard ? (
          <Board character={character} setCharacter={setCharacter} say={setSaid} />
        ) : isInn ? (
          <InnCounter
            character={character}
            onRest={rest}
            onHire={hire}
            onMeal={meal}
          />
        ) : stock.length > 0 ? (
          <Counter
            stock={stock}
            character={character}
            onBuy={buy}
            onSell={sell}
          />
        ) : (
          <div className="counter">
            <p className="counter__empty">
              There is nothing for sale here — only talk, and not much of that
              yet.
            </p>
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
  const loc = where ? locationById(where) : undefined;

  const update = (c: Character) => {
    setLocal(c);
    onChange?.(c);
  };

  const hp = local.currentHp || maxHp(local).value;

  return (
    <>
      <div className="purse">
        <button className="purse__who" onClick={() => setSheet((v) => !v)}>
          {local.name}
        </button>
        <span>Day {local.day}</span>
        <span>
          HP {hp}/{maxHp(local).value}
        </span>
        <span>AC {local.overrides?.armorClass ? armorClass(local).value : armorClassFrom(local.equipped ?? {}, modifiers(local).dex).value}</span>
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
        />
      ) : (
        <TownMap onEnter={setWhere} />
      )}
    </>
  );
}
