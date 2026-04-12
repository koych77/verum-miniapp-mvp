import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { bootstrapMiniApp } from "./lib/api";
import "./index.css";

async function mountApp() {
  await bootstrapMiniApp();
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void mountApp();
