import hydrate from "mwap/hydrate";

import "./global.css";

if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

export default hydrate;

if ((import.meta as any).hot) {
  (import.meta as any).hot.accept();
}
