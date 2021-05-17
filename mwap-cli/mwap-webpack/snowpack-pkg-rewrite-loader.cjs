module.exports = function snowpackPkgRewriteLoader(source) {
  return source.replace(
    /(?:import|from)\s*['"](.*\/_snowpack\/pkg\/(.*)\.js)['"]/g,
    (fullMatch, snowpackImport, pkgImport) => {
      if (snowpackImport.match(/\.proxy\.js/)) {
        return fullMatch;
      }
      return fullMatch.replace(snowpackImport, pkgImport);
    }
  );
};
