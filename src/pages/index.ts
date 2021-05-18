import type { Page } from "mwap/pages";

const routes: Page[] = [
  {
    module: "home",
    path: "/",
    exact: true,
  },
  {
    module: "docs",
    path: "/docs/:slug?",
  },
];

export default routes;
