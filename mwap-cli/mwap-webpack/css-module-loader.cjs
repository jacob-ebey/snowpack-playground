const fs = require("fs");

function fileExists(filepath) {
  return fs.promises
    .access(filepath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

module.exports = async function cssModuleLoader(source) {
  const done = this.async();
  const modulesPath = this.resourcePath + ".json";

  console.log(source);

  try {
    if (await fileExists(modulesPath)) {
      const modules = await fs.promises.readFile(modulesPath);

      return done(undefined, `export default ${modules};`);
    }

    return done(undefined, source);
  } catch (err) {
    done(err);
  }
};
