import { useState } from "react";
import {
  LOCATIONS,
  TOWN_MAP_ART,
  TOWN_NAME,
  locationById,
  type Service,
  type TownLocation,
} from "./locations";

/** The map, with every door on it clickable. */
function TownMap({ onEnter }: { onEnter: (id: string) => void }) {
  const [hovered, setHovered] = useState<TownLocation | null>(null);

  return (
    <div className="town">
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

      <ol className="town__index">
        {LOCATIONS.map((loc) => (
          <li key={loc.id}>
            <button className="link" onClick={() => onEnter(loc.id)}>
              {loc.name}
            </button>
            <span className="town__trade">{loc.trade}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ServiceButton({ service }: { service: Service }) {
  return (
    <button className="service" data-kind={service.kind}>
      {service.label}
    </button>
  );
}

/** Inside one building. */
function Interior({ loc, onLeave }: { loc: TownLocation; onLeave: () => void }) {
  return (
    <div className="town">
      <header className="town__head">
        <h1>{loc.name}</h1>
        <p>{loc.keeper}</p>
      </header>

      <div className={loc.art ? "scene" : "scene scene--unpainted"}>
        {loc.art ? (
          <img className="scene__art" src={loc.art} alt={`Inside ${loc.name}`} />
        ) : (
          <p className="scene__pending">
            This room has not been painted yet.
          </p>
        )}
      </div>

      <p className="scene__text">{loc.description}</p>

      <div className="services">
        {loc.services.map((s) => (
          <ServiceButton key={s.kind + s.label} service={s} />
        ))}
      </div>

      <button className="link link--back" onClick={onLeave}>
        ← Back to the street
      </button>
    </div>
  );
}

export function TownView() {
  const [where, setWhere] = useState<string | null>(null);
  const loc = where ? locationById(where) : undefined;

  if (loc) return <Interior loc={loc} onLeave={() => setWhere(null)} />;
  return <TownMap onEnter={setWhere} />;
}
