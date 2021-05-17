import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * @type {import("snowpack").SnowpackUserConfig}
 */
const config = {
  exclude: ["**/mwap-cli/**/*"],
  alias: {
    mwap: path.resolve(__dirname, "mwap"),
  },
  mount: {
    [path.resolve(__dirname, "mwap")]: "/mwap",
  },
  packageOptions: {
    source: "remote",
    external: ["remark-prism"],
  },
};

export default config;
