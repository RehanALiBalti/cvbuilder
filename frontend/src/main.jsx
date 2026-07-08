import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import "./styles/site.css";
import "./styles/landing.css";
import "./styles/auth.css";
import "./styles/templates.css";
import "./styles/marketing.css";

document.documentElement.classList.remove("theme-dark");
localStorage.removeItem("buzzcvpilot-theme");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
