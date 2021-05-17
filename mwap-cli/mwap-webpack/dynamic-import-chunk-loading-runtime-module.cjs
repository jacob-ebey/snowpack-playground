const Compilation = require("webpack/lib/Compilation");
const RuntimeGlobals = require("webpack/lib/RuntimeGlobals");
const RuntimeModule = require("webpack/lib/RuntimeModule");
const Template = require("webpack/lib/Template");
const chunkHasJs =
  require("webpack/lib/javascript/JavascriptModulesPlugin").chunkHasJs;
const { getInitialChunkIds } = require("webpack/lib/javascript/StartupHelpers");

class DynamicImportChunkLoadingRuntimeModule extends RuntimeModule {
  constructor(runtimeRequirements) {
    super("dynamic import chunk loading runtime", RuntimeModule.STAGE_ATTACH);

    this.runtimeRequirements = runtimeRequirements;
  }

  generate() {
    return Template.asString(["// some output"]);
  }
}

module.exports = DynamicImportChunkLoadingRuntimeModule;
