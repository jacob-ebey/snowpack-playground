import fs from "fs";
import path from "path";
import { createRequire } from "module";

import fastify from "fastify";
import fastifyProxy from "fastify-http-proxy";
import { createConfiguration, loadConfiguration, startServer } from "snowpack";

import ReactRouterDOM from "react-router-dom";

import { fileExists, getBaseConfig } from "./utils.js";

import stringify from "json-stringify-deterministic";

const { matchPath } = ReactRouterDOM;

const encodeParams = (params) => {
  const json = stringify(params);

  return Buffer.from(json).toString("base64");
};

const decodeParams = (encodedParams) => {
  const json = Buffer.from(encodedParams, "base64").toString();
  return JSON.parse(json);
};

const createLoaderContext = (load) => {
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

const require = createRequire(import.meta.url);

const cwd = process.cwd();

const getReactRefresh = () => {
  const reactRefreshLoc = require.resolve(
    "react-refresh/cjs/react-refresh-runtime.development.js"
  );
  const reactRefreshCode = fs
    .readFileSync(reactRefreshLoc, { encoding: "utf-8" })
    .replace(`process.env.NODE_ENV`, JSON.stringify("development"));

  return `
window.HMR_WEBSOCKET_URL = "ws://localhost:8080/"

function debounce(e,t){let u;return()=>{clearTimeout(u),u=setTimeout(e,t)}}
{
  const exports = {};
  ${reactRefreshCode}
  exports.performReactRefresh = debounce(exports.performReactRefresh, 30);
  window.$RefreshRuntime$ = exports;
  window.$RefreshRuntime$.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;
}  
`;
};

(async () => {
  console.log("HERE!");
  const reactRefreshScript = getReactRefresh();

  const baseConfig = await getBaseConfig({ cwd });

  const configPath = path.resolve(cwd, "snowpack.config.js");
  const config = (await fileExists(configPath))
    ? await loadConfiguration(baseConfig, configPath)
    : createConfiguration(baseConfig);

  const server = await startServer(
    { config },
    { isDev: true, isWatch: true, preparePackages: true }
  );
  const serverRuntime = server.getServerRuntime({
    invalidateOnChange: true,
  });

  const app = fastify();

  app.register(fastifyProxy, {
    upstream: "http://localhost:8080",
    prefix: "/_snowpack", // optional
    rewritePrefix: "/_snowpack",
    http2: false, // optional
  });

  app.register(fastifyProxy, {
    upstream: "http://localhost:8080",
    prefix: "/mwap", // optional
    rewritePrefix: "/mwap", // optional
    http2: false, // optional
  });

  app.register(fastifyProxy, {
    upstream: "http://localhost:8080",
    prefix: "/src", // optional
    rewritePrefix: "/src", // optional
    http2: false, // optional
  });

  app.get("/_mwap/loader/:loader/:encodedParams", async (request, reply) => {
    const loader = request.params.loader;
    const encodedParams = request.params.encodedParams.replace(/\.json$/, "");
    const params = decodeParams(encodedParams);

    const loaderModule = await serverRuntime.importModule(
      `/src/loaders/${loader}.js`
    );
    const result = await loaderModule.exports.default(params);

    if (result.headers) {
      reply.headers(result.headers);
    }

    reply.status(200);
    reply.send(result.data);
  });

  app.get("/*", async (request, reply) => {
    try {
      const loaderContext = createLoaderContext(async (loader, params) => {
        const loaderModule = await serverRuntime.importModule(
          `/src/loaders/${loader}.js`
        );
        const result = await loaderModule.exports.default(params);
        // TODO: Handle loader headers.
        return result.data;
      });

      const pagesModule = await serverRuntime.importModule(
        "/src/pages/index.js"
      );
      /** @type {import("../mwap/pages").Page[]} */
      const pages = pagesModule.exports.default;

      let matchedRoute;
      let matchedPage;
      for (let i = 0; i < pages.length; i++) {
        matchedRoute = matchPath(request.url, pages[i]);
        if (matchedRoute) {
          matchedPage = pages[i];
          break;
        }
      }

      if (!matchedRoute || !matchedPage.module) {
        reply.status(404);
        reply.send();
        return;
      }

      const clientScript = "/src/client.js";
      const serverScript = "/src/server.js";
      const pageScript = `/src/pages/${matchedPage.module}.js`;
      const appScript = "/src/app.js";
      const documentScript = "/src/document.js";

      const [reactScript, serverModule, pageModule, appModule, documentModule] =
        await Promise.all([
          server.getUrlForPackage("react"),
          serverRuntime.importModule(serverScript),
          serverRuntime.importModule(pageScript),
          serverRuntime.importModule(appScript),
          serverRuntime.importModule(documentScript),
        ]);

      /** @type {import("../mwap/handler").MwapHandler} */
      const serverHandler = serverModule.exports.default;

      /** @type {import("react").ComponentType<any>} */
      const Page = pageModule.exports.default;

      /** @type {import("react").ComponentType<any>} */
      const App = appModule.exports.default;

      /** @type {import("react").ComponentType<import("../mwap/document").DocumentProps>} */
      const Document = documentModule.exports.default;

      const clientRoutes = pages
        .map(
          (page) => `{
  exact: ${JSON.stringify(page.exact) || false},
  path: ${JSON.stringify(page.path)},
  component: ${
    page.module === matchedPage.module
      ? "pageModule.default"
      : `React.lazy(() => import("/src/pages/${page.module}.js"))`
  }
}`
        )
        .join(",\n");

      const hydrateScript = `
Promise.all([
  import(${JSON.stringify(reactScript)}),
  import(${JSON.stringify(clientScript)}),
  import(${JSON.stringify(appScript)}),
  import(${JSON.stringify(pageScript)}),
]).then(([React, clientModule, appModule, pageModule]) => {
  const hydrate = clientModule.default;
  const routes = [${clientRoutes}];
  return hydrate({
    App: appModule.default,
    routes
  });
});
`;
      const { headers, html } = await serverHandler({
        loaderContext,
        location: request.url,
        App,
        Document,
        Page,
        scripts: [
          {
            inline: true,
            source: reactRefreshScript,
          },
          {
            inline: true,
            type: "module",
            source: hydrateScript,
          },
        ],
      });
      reply.headers(headers);
      reply.header("content-type", "text/html; charset=utf-8");
      reply.send(html);
    } catch (err) {
      console.error(err);
      throw err;
    }
  });

  try {
    app.listen(5000).then(() => {
      console.info("Application started on http://localhost:5000");
    });
  } catch (err) {
    server.shutdown();
    throw err;
  }
})();
