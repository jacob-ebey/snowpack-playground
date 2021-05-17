const ConcatSource = require("webpack-sources").ConcatSource;
// const MultiModule = require("webpack/lib/MultiModule");
const Template = require("webpack/lib/Template");
const PLUGIN_NAME = "EsmWebpackPlugin";
const warn = (msg) => console.warn(`[${PLUGIN_NAME}] ${msg}`);
const IS_JS_FILE = /\.[cm]?js$/i;

const defaultOptions = {
  // Exclude non-js files
  exclude: (fileName) => !IS_JS_FILE.test(fileName),

  // Skip Nothing
  skipModule: () => false,

  // Treat externals as globals, by default
  moduleExternals: false,

  // Add __esModule property to all externals
  esModuleExternals: false,
};

/**
 * Add ESM `export` statements to the bottom of a webpack chunk
 * with the exposed exports.
 */
module.exports = class EsmWebpackPlugin {
  /**
   *
   * @param {Object} [options]
   * @param {Function} [options.exclude]
   *  A callback function to evaluate each output file name and determine if it should be
   *  excluded from being wrapped with ESM exports. By default, all files whose
   *  file extension is not `.js` or `.mjs` will be excluded.
   *  The provided callback will receive two input arguments:
   *  -   `{String} fileName`: the file name being evaluated
   *  -   `{Chunk} chunk`: the webpack `chunk` being worked on.
   * @param {Function} [options.skipModule]
   *  A callback function to evaluate each single module in the bundle and if its list of
   *  exported members should be included.
   * @param {boolean} [options.moduleExternals]
   * A boolean that determines whether to treat webpack externals as ES modules or not.
   * Defaults to false.
   */
  constructor(options) {
    this._options = {
      ...defaultOptions,
      ...options,
    };
  }

  apply(compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, compilationTap.bind(this));
  }
};

function exportsForModule(moduleGraph, module, libVar, pluginOptions) {
  let exports = "";
  const namedExports = [];
  const moduleName =
    module && typeof module.nameForCondition === "function"
      ? module.nameForCondition()
      : undefined;

  if (!module || (moduleName && pluginOptions.skipModule(moduleName, module))) {
    return "";
  }

  if (Array.isArray(module.buildMeta.providedExports)) {
    module.buildMeta.providedExports.forEach((exportName) => {
      if (exportName === "default") {
        exports += `export default ${libVar}['${exportName}'];\n`;
      } else {
        const scopedExportVarName = `_${libVar}$${exportName}`;
        exports += `const ${scopedExportVarName} = ${libVar}['${exportName}'];\n`;
        namedExports.push(`    ${scopedExportVarName} as ${exportName}`);
      }
    });
  } else {
    exports += `export default ${libVar};\nexport { ${libVar} };\n`;
  }

  return `
${
  exports.length > 0 && namedExports.length > 0
    ? `${libVar} === undefined && console.error('esm-webpack-plugin: nothing exported!');`
    : ""
}
${exports}${
    namedExports.length ? `\nexport {\n${namedExports.join(",\n")}\n}` : ""
  }`;
}

/**
 *
 * @param {import("webpack").ModuleGraph} moduleGraph
 * @param {import("webpack").ChunkGraph} chunkGraph
 * @param {import("webpack").Chunk} chunk
 * @param pluginOptions
 * @returns
 */
function importsForModule(
  moduleGraph,
  chunkGraph,
  chunk,
  publicPath,
  pluginOptions
) {
  if (true || pluginOptions.moduleExternals) {
    const externals = chunk.getModules(); //.filter((m) => m.external);
    const importStatements = externals.map((m) => {
      const moduleChunks = chunkGraph.getModuleChunks(m);
      if (moduleChunks.length === 0) {
        return "";
      }
      if (moduleChunks.length > 1) {
        throw new Error("Ahhhhh shit");
      }

      const files = Array.from(moduleChunks[0].files).filter((f) =>
        f.match(/\.js$/)
      );
      if (files.length === 0) {
        return "";
      }
      if (files.length > 1) {
        throw new Error("Ahhhhh shit");
      }

      console.log(publicPath, files[0]);
      const prefix =
        publicPath && publicPath !== "auto" ? JSON.stringify(publicPath) : `/production/`;

      const moduleId = chunkGraph.getModuleId(m);
      if (!moduleId) {
        return "";
      }
      const identifier = `__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
        `${chunkGraph.getModuleId(m)}`
      )}__`;

      return pluginOptions.esModuleExternals
        ? `import * as $${identifier} from '${prefix}${files[0]}'; var ${identifier} = cloneWithEsModuleProperty($${identifier});`
        : `import * as ${identifier} from '${prefix}${files[0]}';`;
    });

    const result = [importStatements.join("\n")];

    if (pluginOptions.esModuleExternals) {
      // The code here was originally copied from https://github.com/joeldenning/add-esmodule
      result.push(
        Template.asString([
          "\n",
          "function cloneWithEsModuleProperty(ns) {",
          Template.indent([
            "const result = Object.create(null);",
            `Object.defineProperty(result, "__esModule", {`,
            Template.indent([
              `value: true,`,
              `enumerable: false,`,
              `configurable: true`,
            ]),
            "});",
            `const propertyNames = Object.getOwnPropertyNames(ns);`,
            `for (let i = 0; i < propertyNames.length; i++) {`,
            Template.indent([
              `const propertyName = propertyNames[i];`,
              `Object.defineProperty(result, propertyName, {`,
              Template.indent([
                `get: function () {`,
                Template.indent([`return ns[propertyName];`]),
                `},`,
                `enumerable: true,`,
                `configurable: false,`,
              ]),
              `});`,
            ]),
            `}`,
            `if (Object.getOwnPropertySymbols) {`,
            Template.indent([
              `const symbols = Object.getOwnPropertySymbols(ns);`,
              `for (let i = 0; i < symbols.length; i++) {`,
              Template.indent([
                `const symbol = symbols[i];`,
                `Object.defineProperty(result, symbol, {`,
                Template.indent([
                  `get: function () {`,
                  Template.indent([`return ns[symbol];`]),
                  `},`,
                  `enumerable: false,`,
                  `configurable: false,`,
                ]),
                `});`,
              ]),
              "}",
            ]),
            `}`,
            `Object.preventExtensions(result);`,
            `Object.seal(result);`,
            `if (Object.freeze) {`,
            Template.indent([`Object.freeze(result);`]),
            `}`,
            `return result;`,
          ]),
          `}`,
        ])
      );
    }

    result.push("\n");

    // console.log(result);

    return result;
  } else {
    // Use default webpack behavior
    return [];
  }
}

/**
 *
 * @param {import("webpack").Compilation} compilation
 */
function compilationTap(compilation) {
  const libVar = compilation.outputOptions.library;
  const exclude = this._options.exclude;

  if (!libVar) {
    warn("output.library is expected to be set!");
  }

  if (
    compilation.outputOptions.libraryTarget &&
    compilation.outputOptions.libraryTarget !== "var" &&
    compilation.outputOptions.libraryTarget !== "assign"
  ) {
    warn(
      `output.libraryTarget (${compilation.outputOptions.libraryTarget}) expected to be 'var' or 'assign'!`
    );
  }

  if (this._options.moduleExternals) {
    compilation.hooks.buildModule.tap(PLUGIN_NAME, (module) => {
      if (module.external) {
        // See https://webpack.js.org/configuration/externals/#externalstype
        // We want AMD because it references __WEBPACK_EXTERNAL_MODULE_ instead
        // of the raw external request string.
        module.externalType = "amd";
      }
    });
  }

  compilation.hooks.optimizeChunkAssets.tapAsync(
    PLUGIN_NAME,
    (chunks, done) => {
      chunks.forEach((chunk) => {
        // if (chunk.entryModule) {
        chunk.files.forEach((fileName) => {
          if (exclude && exclude(fileName, chunk)) {
            return;
          }

          // Add the exports to the bottom of the file (expecting only one file) and
          // add that file back to the compilation
          compilation.assets[fileName] = new ConcatSource(
            ...importsForModule(
              compilation.moduleGraph,
              compilation.chunkGraph,
              chunk,
              compilation.options.output.publicPath,
              this._options
            ),
            compilation.assets[fileName],
            "\n\n",
            exportsForModule(
              compilation.moduleGraph,
              chunk.entryModule,
              libVar.name,
              this._options
            )
          );
        });
        // }
      });

      done();
    }
  );
}
