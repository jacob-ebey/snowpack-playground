import type { Page } from "mwap/pages";

const routes: Page[] = [
  {
    module: "home",
    path: "/",
    exact: true,
  },
  {
    module: "about",
    path: "/about",
  },
  {
    module: "about2",
    path: "/about2",
  },
];

export default routes;
