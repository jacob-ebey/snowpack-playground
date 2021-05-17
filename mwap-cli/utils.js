import fs from "fs";
import path from "path";

import { builtinModules, createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * @param {string} filepath
 * @returns {boolean}
 */
export function fileExists(filepath) {
  return fs.promises
    .access(filepath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

/**
 * @param {object} options
 * @param {string} options.cwd
 * @param {boolean} options.isProd
 * @returns {import("snowpack").SnowpackUserConfig}
 */
export async function getBaseConfig(options) {
  const { cwd, isProd } = options;

  const conditionalPlugins = isProd
    ? [require.resolve("./mwap-webpack/plugin.cjs")]
    : [require.resolve("@snowpack/plugin-react-refresh")];

  let postcssConfig = path.resolve(cwd, "postcss.config.js");
  const postcssConfigPath = (await fileExists(postcssConfig))
    ? postcssConfig
    : ((postcssConfig = path.resolve(cwd, "postcss.config.cjs")),
      await fileExists(postcssConfig))
    ? postcssConfig
    : undefined;
  console.log("postcssConfigPath", postcssConfigPath);

  const plugins = [
    ...conditionalPlugins,
    [
      require.resolve("@snowpack/plugin-postcss"),
      { config: postcssConfigPath },
    ],
  ];

  return {
    mode: isProd ? "production" : "development",
    alias: isProd
      ? {}
      : {
          "react-dom/server": "react-dom/server.node",
        },
    mount: {
      src: { url: "/src", static: false, resolve: true },
    },
    devOptions: {
      hmr: !isProd,
      hmrPort: 8080,
    },
    buildOptions: {
      ssr: true,
      clean: true,
      out: path.resolve(cwd, "dist/esm"),
      sourcemap: false,
    },
    packageOptions: {
      polyfillNode: true,
      source: "local",
      external: [...builtinModules],
    },
    plugins,
    root: cwd,
  };
}
