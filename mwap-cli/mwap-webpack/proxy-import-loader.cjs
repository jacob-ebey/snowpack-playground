module.exports = function proxyImportResolver(source) {
  return source.replace(
    /(?:import|from)\s*['"].*\.(\w+)\.proxy\.js['"]/g,
    (fullMatch) => {
      return fullMatch.replace(".proxy.js", "");
    }
  );
};
