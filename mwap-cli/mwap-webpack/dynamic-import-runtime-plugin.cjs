const { RuntimeGlobals } = require("webpack");
const EnableChunkLoadingPlugin = require("webpack/lib/javascript/EnableChunkLoadingPlugin");
const StartupChunkDependenciesPlugin = require("webpack/lib/runtime/StartupChunkDependenciesPlugin");

const DynamicImportChunkLoadingRuntimeModule = require("./dynamic-import-chunk-loading-runtime-module.cjs");

const PLUGIN_NAME = "DynamicImportRuntimePlugin";

class DynamicImportRuntimePlugin {
  /**
   *
   * @param {import("webpack").Compiler} compiler
   */
  apply(compiler) {
    compiler.options.output.chunkLoading = "module";
    EnableChunkLoadingPlugin.setEnabled(compiler, "module");
    new StartupChunkDependenciesPlugin({
      chunkLoading: "module",
      asyncChunkLoading: true,
    }).apply(compiler);

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      const globalChunkLoading = compilation.outputOptions.chunkLoading;
      const isEnabledForChunk = (chunk) => {
        const options = chunk.getEntryOptions();
        const chunkLoading =
          options && options.chunkLoading !== undefined
            ? options.chunkLoading
            : globalChunkLoading;
        return chunkLoading === "jsonp";
      };
      const onceForChunkSet = new WeakSet();
      const handler = (chunk, set) => {
        if (onceForChunkSet.has(chunk)) return;
        onceForChunkSet.add(chunk);
        if (!isEnabledForChunk(chunk)) return;
        set.add(RuntimeGlobals.moduleFactoriesAddOnly);
        set.add(RuntimeGlobals.hasOwnProperty);
        compilation.addRuntimeModule(
          chunk,
          new DynamicImportChunkLoadingRuntimeModule(set)
        );
      };
      compilation.hooks.runtimeRequirementInTree
        .for(RuntimeGlobals.ensureChunkHandlers)
        .tap(PLUGIN_NAME, handler);
      compilation.hooks.runtimeRequirementInTree
        .for(RuntimeGlobals.baseURI)
        .tap(PLUGIN_NAME, handler);
      compilation.hooks.runtimeRequirementInTree
        .for(RuntimeGlobals.onChunksLoaded)
        .tap(PLUGIN_NAME, handler);

      compilation.hooks.runtimeRequirementInTree
        .for(RuntimeGlobals.ensureChunkHandlers)
        .tap(PLUGIN_NAME, (chunk, set) => {
          if (!isEnabledForChunk(chunk)) return;
          set.add(RuntimeGlobals.publicPath);
          set.add(RuntimeGlobals.loadScript);
          set.add(RuntimeGlobals.getChunkScriptFilename);
        });
    });
  }
}

module.exports = DynamicImportRuntimePlugin;
