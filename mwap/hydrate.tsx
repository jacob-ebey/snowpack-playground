import * as React from "react";
import { hydrate } from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { createLoaderContext, LoaderProvider } from "./loader";
import { createLoader } from "./client/loader";

type RouteProps = {
  caseSensitive?: boolean;
  children?: React.ReactNode;
  element?: React.ReactElement | null;
  path?: string;
};

export type MandateProps<T extends {}, K extends keyof T> = Omit<T, K> &
  {
    [MK in K]-?: NonNullable<T[MK]>;
  };

export type MwapHydrateArgs = {
  App: React.ComponentType<any>;
  routes: MandateProps<RouteProps, "path">[];
};

const mwapHydrate = ({ App, routes }: MwapHydrateArgs) => {
  const element = document.getElementById("__mwap");

  const loaderContext = createLoaderContext(createLoader());

  const MwapFallback = () => {
    const fallbackElement = document.getElementById("__mwapfallback");
    const fallback = fallbackElement ? fallbackElement.innerHTML : "";

    return (
      <div id="__mwapfallback" dangerouslySetInnerHTML={{ __html: fallback }} />
    );
  };

  const MwapApp = () => {
    return (
      <LoaderProvider context={loaderContext}>
        <div id="__mwapfallback">
          <BrowserRouter>
            <App>
              <Routes>
                {routes.map((route) => (
                  <Route key={route.path} {...route} />
                ))}
              </Routes>
            </App>
          </BrowserRouter>
        </div>
      </LoaderProvider>
    );
  };

  hydrate(
    <React.Suspense fallback={<MwapFallback />}>
      <MwapApp />
    </React.Suspense>,
    element
  );
};

export default mwapHydrate;
