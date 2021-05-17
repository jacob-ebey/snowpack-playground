import * as React from "react";

import Header from "./components/header";

const AppFallback = () => {
  const fallbackElement = document.getElementById("appfallback");
  const fallback = fallbackElement ? fallbackElement.innerHTML : "";

  return (
    <div id="appfallback" dangerouslySetInnerHTML={{ __html: fallback }} />
  );
};

const App = ({ children }) => {
  return (
    <>
      <Header />

      <React.Suspense fallback={<AppFallback />}>
        <div id="appfallback">{children}</div>
      </React.Suspense>
    </>
  );
};

export default App;
