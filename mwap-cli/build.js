import path from "path";

import { build, createConfiguration, loadConfiguration } from "snowpack";

import { fileExists, getBaseConfig } from "./utils.js";

const cwd = process.cwd();

(async () => {
  const baseConfig = await getBaseConfig({ cwd, isProd: true });

  const configPath = path.resolve(cwd, "snowpack.config.js");
  const config = (await fileExists(configPath))
    ? await loadConfiguration(baseConfig, configPath)
    : createConfiguration(baseConfig);

  await build({ config });
})();
