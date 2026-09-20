import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./town/town.css";
import "./creator/creator.css";
import "./game/party.css";
import "./scene/scene.css";

const el = document.getElementById("root");
if (!el) throw new Error("no #root");
createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
