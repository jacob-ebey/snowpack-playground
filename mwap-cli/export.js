import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { pathToFileURL } from "url";

import { matchPath } from "react-router-dom";
import webpackFlushChunks from "webpack-flush-chunks";

import fsExtra from "fs-extra";
import { camelCase } from "camel-case";
import stringify from "json-stringify-deterministic";

const require = createRequire(import.meta.url);

// @ts-ignore
const flushChunks = webpackFlushChunks.default;

const cwd = process.cwd();
const staticDir = path.resolve(cwd, "static");

const encodeParams = (params) => {
  const json = stringify(params);

  return Buffer.from(json).toString("base64");
};

const createLoaderContext = (load) => {
  /** @type {import("../mwap/loader").LoaderContextCache} */
  const cache = {};

  return {
    cache,
    get: (loader, params) => {
      const encodedParams = encodeParams(params);

      let cacheEntry = cache[loader]?.[encodedParams];
      if (cacheEntry && (cacheEntry.data || cacheEntry.promise)) {
        return cacheEntry.data || cacheEntry.promise;
      }

      cacheEntry = {};

      const loadResult = load(loader, params, encodedParams);

      if ("then" in loadResult) {
        cacheEntry.promise = loadResult.then((data) => {
          cacheEntry.data = data;
        });
      } else {
        cacheEntry.data = loadResult;
      }

      cache[loader] = cache[loader] || {};
      cache[loader][encodedParams] = cacheEntry;

      return cacheEntry.data || cacheEntry.promise;
    },
  };
};

const getMod = (container, mod) =>
  container.get(mod).then((factory) => factory());
const getDefault = (container, mod) =>
  getMod(container, mod).then((m) => m.default);

(async () => {
  const pkg = require(path.resolve(cwd, "package.json"));
  const containerName = camelCase(pkg.name);

  const json = await fs.promises.readFile(
    path.resolve(cwd, "dist/production/stats.json"),
    "utf8"
  );
  const stats = JSON.parse(json);
  const mwapContainer = require(path.resolve(cwd, "dist/cjs/mwap.cjs"));
  await mwapContainer.init({});

  const routesUrl = pathToFileURL(path.resolve(cwd, "routes.js"));
  // @ts-ignore
  const routesDefault = (await import(routesUrl)).default;
  const staticRoutes = Array.isArray(routesDefault)
    ? routesDefault
    : await routesDefault();

  const loaderContext = createLoaderContext(
    async (loader, params, encodedParams) => {
      const loaderFunc = await getDefault(mwapContainer, `./loaders/${loader}`);
      const result = await loaderFunc(params);

      const jsonFilePath = path.resolve(
        staticDir,
        path.join("_mwap/loader", loader, `${encodedParams}.json`)
      );

      await fs.promises.mkdir(path.dirname(jsonFilePath), { recursive: true });
      await fs.promises.writeFile(
        jsonFilePath,
        JSON.stringify(result.data),
        "utf8"
      );

      return result.data;
    }
  );

  await Promise.all(
    staticRoutes.map(async (staticRoute) => {
      try {
        /** @type {import("../mwap/pages").Page[]} */
        const pages = await getDefault(mwapContainer, "./pages/index");

        /** @type {import("react-router-dom").match} */
        let matchedRoute;
        /** @type {import("../mwap/pages").Page} */
        let matchedPage;

        for (let i = 0; i < pages.length; i++) {
          matchedRoute = matchPath(staticRoute, pages[i]);
          if (matchedRoute) {
            matchedPage = pages[i];
            break;
          }
        }

        if (!matchedRoute || !matchedPage.module) {
          throw new Error(`Route \`${staticRoute}\` does not match any pages.`);
        }

        /**
         * @typedef {import("../mwap/handler").MwapHandler} MwapHandler
         * @typedef {import("react").ComponentType} DocumentComponent
         * @typedef {import("react").ComponentType<any>} ComponentType
         * @type {[MwapHandler, DocumentComponent, ComponentType, ComponentType]}
         */
        const [serverHandler, Document, App, Page] = await Promise.all([
          getDefault(mwapContainer, "./server"),
          getDefault(mwapContainer, "./document"),
          getDefault(mwapContainer, "./app"),
          getDefault(mwapContainer, `./pages/${matchedPage.module}`),
        ]);

        const mwapEntryChunks = flushChunks(stats, {
          chunkNames: [containerName],
        });
        const mwapEntryChunk =
          mwapEntryChunks.scripts[mwapEntryChunks.scripts.length - 1];

        const flushedChunks = flushChunks(stats, {
          chunkNames: [
            containerName,
            "client",
            "app",
            `pages/${matchedPage.module}`,
          ],
        });

        const resolveLazyModules = (chunkNames) => {
          const flushed = flushChunks(stats, {
            chunkNames,
          });
          return {
            styles: flushed.stylesheets.map((stylesheet) => ({
              preload: true,
              source: `${stats.publicPath}${stylesheet}`,
            })),
          };
        };

        const clientRoutes = pages
          .map(
            (page) => `{
    exact: ${JSON.stringify(page.exact) || false},
    path: ${JSON.stringify(page.path)},
    component: ${
      page.module === matchedPage.module
        ? "Page"
        : `React.lazy(() => getMod(${containerName}, "./pages/${page.module}"))`
    }
  }`
          )
          .join(",\n");

        const hydrateScript = `
const getMod = (container, mod) => container.get(mod).then((factory) => factory());
const getDefault = (container, mod) => getMod(container, mod).then((m) => m.default);

const hydrate = () => Promise.resolve(${containerName}.init({})).then(() => Promise.all([
  getMod(${containerName}, "./react"),
  getDefault(${containerName}, "./client"),
  getDefault(${containerName}, "./app"),
  getDefault(${containerName}, "./pages/${matchedPage.module}"),
]).then(([React, hydrate, App, Page]) => {
  const routes = [${clientRoutes}];
  hydrate({ App, routes });
}));

const remoteEntryScript = document.querySelector("script[src='${`${stats.publicPath}${mwapEntryChunk}`}']");
if (typeof ${containerName} !== "undefined") {
  hydrate();
} else {
  remoteEntryScript.addEventListener("load", hydrate);
}
`;

        const { headers, html } = await serverHandler({
          loaderContext,
          location: staticRoute,
          page: matchedPage,
          resolveLazyModules,
          App,
          Document,
          Page,
          scripts: [
            ...flushedChunks.scripts.map((script) => ({
              defer: true,
              preload: true,
              source: `${stats.publicPath}${script}`,
            })),
            {
              inline: true,
              source: hydrateScript,
            },
          ],
          styles: flushedChunks.stylesheets.map((stylesheet) => ({
            preload: true,
            source: `${stats.publicPath}${stylesheet}`,
          })),
        });

        const htmlFilePath = path.resolve(
          staticDir,
          path.join(staticRoute.replace(/^\//, ""), "index.html")
        );

        await fs.promises.mkdir(path.dirname(htmlFilePath), {
          recursive: true,
        });

        await fs.promises.writeFile(htmlFilePath, html, "utf8");
      } catch (err) {
        console.error(err);
        throw err;
      }
    })
  );

  fsExtra.copy(
    path.resolve(cwd, "dist/production"),
    path.resolve(staticDir, "_mwap"),
    { recursive: true, overwrite: true }
  );
})();
