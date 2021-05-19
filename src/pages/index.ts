import type { Page } from "mwap/pages";

const routes: Page[] = [
  {
    module: "home",
    path: "/",
  },
  {
    module: "docs",
    path: "/docs",
  },
  {
    module: "docs",
    path: "/docs/:slug",
  },
];

export default routes;
