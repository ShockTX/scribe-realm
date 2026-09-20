import React from "react";
import { createRoot } from "react-dom/client";
import { TownView } from "./town/Town";
import "./town/town.css";

const el = document.getElementById("root");
if (!el) throw new Error("no #root");
createRoot(el).render(
  <React.StrictMode>
    <TownView />
  </React.StrictMode>,
);
