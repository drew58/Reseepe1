import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Apply persisted theme before React mounts to avoid flash
if (typeof window !== "undefined" && localStorage.getItem("reseepe_theme") === "dark") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
