const crypto = require("crypto");
const path = require("path");

const glob = require("glob");
const { BundleStatsWebpackPlugin } = require("bundle-stats-webpack-plugin");
const { ESBuildMinifyPlugin } = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
const { StatsWriterPlugin } = require("webpack-stats-plugin");

const pkg = require(path.resolve(process.cwd(), "package.json"));

module.exports = function plugin(config, args) {
  return {
    name: "mwap-webpack-plugin",
    async optimize({ buildDirectory, log }, args = {}) {
      log("creating optimized production build using webpack");

      const webpackConfig = await createWebpackConfig({
        cwd: process.cwd(),
        buildDirectory,
      });

      const stats = await new Promise((resolve, reject) => {
        webpack(webpackConfig, (err, stats) => {
          if (err) {
            return reject(err);
          }

          resolve(stats);
        });
      }).catch((err) => console.error(err));

      console.log(
        stats.toString({
          colors: true,
          all: false,
          assets: true,
        })
      );

      const info = stats.toJson();
      if (stats.hasErrors()) {
        log("Webpack errors");
        console.error(info.errors.map((err) => err.message).join("\n-----\n"));
        throw new Error(`Webpack failed with ${info.errors.length} error(s).`);
      }
      if (stats.hasWarnings()) {
        log("Webpack warnings");
        console.warn(
          info.warnings.map((warn) => warn.message).join("\n-----\n")
        );
        if (args.failOnWarnings) {
          throw new Error(
            `Webpack failed with ${info.warnings.length} warnings(s).`
          );
        }
      }
    },
  };
};

/**
 * @returns {import("webpack").Configuration}
 */
async function createWebpackConfig({ cwd, buildDirectory }) {
  const pageEntries = await new Promise((resolve, reject) =>
    glob(
      "**/*.js",
      {
        cwd: path.join(buildDirectory, "src/pages"),
        ignore: ["index.js", "*.proxy.js"],
      },
      (err, matches) => {
        if (err) {
          return reject(err);
        }
        resolve(matches);
      }
    )
  );

  console.log("output path", path.resolve(buildDirectory, "../production"));

  const perfIgnore = ["bundle-stats.html", "stats.json"];

  return {
    mode: "production",
    devtool: false,

    context: buildDirectory,

    entry: {
      noop: path.resolve(__dirname, "noop.js"),
    },

    performance: {
      assetFilter: (asset) => {
        return !perfIgnore.includes(asset);
      },
    },

    plugins: [
      // new (require("webpack-bundle-analyzer").BundleAnalyzerPlugin)(),
      new BundleStatsWebpackPlugin(),
      new webpack.container.ModuleFederationPlugin({
        name: "__MWAP_BUNDLE__",
        filename: "pages.[contenthash].js",
        exposes: pageEntries.reduce(
          (acc, curr) => ({
            ...acc,
            [`./pages/${curr.replace(/\.js$/, "")}`]: path.resolve(
              buildDirectory,
              "src/pages",
              curr
            ),
          }),
          {
            "./react": path.resolve(buildDirectory, "_snowpack/pkg/react.js"),
            "./app": path.resolve(buildDirectory, "src/app.js"),
            "./client": path.resolve(buildDirectory, "src/client.js"),
          }
        ),
        shared: {
          react: {
            singleton: true,
            strictVersion: false,
            version: pkg.dependencies.react,
          },
          "react-dom": {
            singleton: true,
            strictVersion: false,
            version: pkg.dependencies["react-dom"],
          },
        },
      }),
      new MiniCssExtractPlugin({
        filename: "[name].[contenthash].css",
        chunkFilename: "[id].[contenthash].css",
      }),
      new StatsWriterPlugin({
        stats: {
          all: true,
        },
        transform(stats) {
          const federatedChunks = stats.chunks.filter((chunk) =>
            chunk.origins.some(
              (origin) => origin.moduleName === "container entry"
            )
          );

          const assetsByChunkName = Object.entries(
            federatedChunks.reduce((acc, chunk) => {
              chunk.origins.forEach((origin) => {
                if (origin.moduleName === "container entry") {
                  const chunkName = origin.loc.replace(/^\.\//, "");
                  acc[chunkName] = acc[chunkName] || new Set();
                  chunk.files.forEach((file) => acc[chunkName].add(file));
                }
              });
              return acc;
            }, {})
          ).reduce((acc, [k, v]) => ({ ...acc, [k]: Array.from(v) }), {});

          return JSON.stringify(
            {
              ...stats,
              assetsByChunkName: {
                ...assetsByChunkName,
                ...stats.assetsByChunkName,
              },
            },
            null,
            2
          );
        },
      }),
    ],

    output: {
      filename: "[name].[contenthash].js",
      chunkFilename: "[id].[contenthash].js",
      path: path.resolve(buildDirectory, "../production"),
      publicPath: "/_mwap/",
      library: {
        type: "var",
        name: "__MWAP_ENTRY__",
      },
      environment: {
        arrowFunction: true,
        bigIntLiteral: true,
        const: true,
        destructuring: true,
        forOf: true,
      },
    },

    optimization: {
      splitChunks: getSplitChunksConfig({ numEntries: 2 }),
      runtimeChunk: {
        name: `webpack-runtime`,
      },
      minimizer: [
        new ESBuildMinifyPlugin({
          target: "es2015",
          css: true,
        }),
      ],
    },

    module: {
      rules: [
        {
          enforce: "pre",
          include: /\.js?$/,
          exclude: /node_modules/,
          use: [
            // {
            //   loader: require.resolve("./snowpack-pkg-rewrite-loader.cjs"),
            // },
            {
              loader: require.resolve("./proxy-import-loader.cjs"),
            },
          ],
        },
        {
          include: /\.js?$/,
          exclude: /node_modules/,
          loader: require.resolve("esbuild-loader"),
          options: {
            tsconfigRaw: require(path.resolve(process.cwd(), "tsconfig.json")),
          },
        },
        {
          test: /\.css$/,
          exclude: /\.module\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
            },
            {
              loader: require.resolve("css-loader"),
            },
          ],
        },
        {
          test: /\.module\.css$/,
          use: [
            {
              loader: require.resolve("./css-module-loader.cjs"),
            },
            {
              loader: MiniCssExtractPlugin.loader,
            },
            {
              loader: require.resolve("css-loader"),
              options: {
                modules: false,
              },
            },
          ],
        },
        {
          test: /.*/,
          exclude: [/\.js?$/, /\.json?$/, /\.css$/],
          type: "asset/resource",
          generator: {
            filename: "assets/[name].[contenthash][ext]",
          },
        },
      ],
    },
  };
}

/**
 *
 * @param param0
 * @returns {import("webpack").OptimizationSplitChunksOptions}
 */
function getSplitChunksConfig({ numEntries }) {
  const isCss = (mod) => mod.type === `css/mini-extract`;
  /**
   * Implements a version of granular chunking, as described at https://web.dev/granular-chunking-nextjs/.
   */
  return {
    chunks: "all",
    maxInitialRequests: 25,
    minSize: 20000,
    cacheGroups: {
      default: false,
      vendors: false,
      /**
       * NPM libraries larger than 100KB are pulled into their own chunk
       *
       * We use a smaller cutoff than the reference implementation (which does 150KB),
       * because our babel-loader config compresses whitespace with `compact: true`.
       */
      lib: {
        test(mod) {
          return (
            mod.size() > 100000 &&
            /_snowpack[/\\]pkg[/\\]/.test(mod.identifier())
          );
        },
        name(mod) {
          /**
           * Name the chunk based on the filename in /pkg/*.
           *
           * E.g. /pkg/moment.js -> lib-moment.HASH.js
           */
          const ident = mod.libIdent({ context: "dir" });
          const lastItem = ident
            .split("/")
            .reduceRight((item) => item)
            .replace(/\.js$/, "");

          let version;
          try {
            const pkg = require(`${lastItem}/package.json`);
            version = pkg.version ? `-${pkg.version}` : "";
          } finally {
            version = version || "";
          }
          return `lib-${lastItem}${version}`;
        },
        priority: 30,
        minChunks: 1,
        reuseExistingChunk: true,
      },
      // mods used by all entrypoints end up in commons
      commons: {
        name: "commons",
        // don't create a commons chunk until there are 2+ entries
        minChunks: Math.max(2, numEntries),
        priority: 20,
      },
      // mods used by multiple chunks can be pulled into shared chunks
      shared: {
        name(mod, chunks) {
          const hash = crypto
            .createHash(`sha1`)
            .update(chunks.reduce((acc, chunk) => acc + chunk.name, ``))
            .digest(`hex`);

          return hash;
        },
        priority: 10,
        minChunks: 2,
        reuseExistingChunk: true,
      },
    },
  };
}
