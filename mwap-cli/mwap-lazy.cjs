const path = require("path");

const { Parser } = require("acorn");
const walk = require("acorn-walk");

function hash(str) {
  var hash = 0,
    i,
    chr;
  if (str.length === 0) return String(hash);
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return String(hash);
}

function getChunkName(cwd, id, source) {
  if (!source.match(/^\./)) {
    return source;
  }

  console.log("id", id);
  const importedPath = path.relative(
    path.resolve(cwd),
    path.resolve(path.dirname(id), source)
  );
  return hash(importedPath);
}

module.exports = function mwapLazyPlugin(snowpackConfig, { cwd }) {
  const parser = Parser.extend();

  return {
    name: "mwap-lazy",
    async transform({ contents, fileExt, id, isPackage }) {
      if (
        isPackage ||
        fileExt !== ".js" ||
        !contents.match(/import .*mwap\/lazy/)
      ) {
        return;
      }

      const ast = parser.parse(contents, {
        sourceType: "module",
        ecmaVersion: "latest",
        locations: true,
      });

      const lazyNames = new Set();
      let lazyDynamicImports = [];
      walk.simple(ast, {
        ImportDeclaration(node) {
          if (node.source.value === "mwap/lazy") {
            node.specifiers.forEach((specifier) => {
              if (specifier.local && specifier.local.name) {
                lazyNames.add(specifier.local.name);
              }
            });
          }
        },
        CallExpression(node) {
          if (!node.callee || !lazyNames.has(node.callee.name)) {
            return;
          }

          if (node.arguments.length !== 1) {
            throw new Error("lazy must contain a single argument");
          }

          walk.simple(node, {
            ImportExpression(node) {
              if (node.source && node.source.value) {
                lazyDynamicImports.push({
                  source: node.source.value,
                  start: node.start,
                  end: node.end,
                });
              }
            },
          });
        },
      });

      /** @type {string} */
      let newContents = contents;
      lazyDynamicImports
        .sort((a, b) => (a.end > b.end ? -1 : 1))
        .forEach(({ source, start, end }) => {
          const chunkName = getChunkName(cwd, id, source);

          newContents =
            newContents.slice(0, end) +
            `, { chunkName: ${JSON.stringify(chunkName)} }` +
            newContents.slice(end);

          const len = "import(".length;
          newContents =
            newContents.slice(0, start + len) +
            `/* webpackChunkName: '${chunkName}' */ ` +
            newContents.slice(start + len);
        });

      return {
        contents: newContents,
      };
    },
  };
};
