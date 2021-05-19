import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToStringAsync } from "react-async-ssr";
import { StaticRouter, Route } from "react-router-dom";
import stringify from "json-stringify-deterministic";

import type {
  DocumentContext,
  DocumentScript,
  DocumentStyle,
} from "./document";
import { DocumentProvider } from "./document";

import type { LazyContext } from "./lazy";
import { LazyProvider } from "./lazy";

import type { LoaderContext } from "./loader";
import { LoaderProvider } from "./loader";

import type { Page } from "./pages";

type ScriptsAndStyles = {
  scripts?: DocumentScript[];
  styles?: DocumentStyle[];
};

export type MwapHandlerContext = Partial<DocumentContext> & {
  loaderContext: LoaderContext;
  location: string;
  page: Page;
  resolveLazyModules?: (chunks) => ScriptsAndStyles | Promise<ScriptsAndStyles>;
  App?: React.ComponentType<any>;
  Document: React.ComponentType<any>;
  Page: React.ComponentType<any>;
};

export type MwapHandlerResult = {
  headers: Record<string, string>;
  html: string;
};

export type MwapHandler = (
  context: MwapHandlerContext
) => MwapHandlerResult | Promise<MwapHandlerResult>;

const handler: MwapHandler = async ({
  loaderContext,
  location,
  page,
  resolveLazyModules,
  App = ({ children }) => children,
  Document,
  Page,
  ...rest
}) => {
  const headers = {};

  const documentContext: DocumentContext = {
    appHtml: "",
    scripts: [],
    styles: [],
    ...rest,
  };

  const lazyContext: LazyContext = {
    chunks: [],
  };

  documentContext.appHtml = await renderToStringAsync(
    <React.Suspense fallback="">
      <StaticRouter location={location}>
        <DocumentProvider context={documentContext}>
          <LazyProvider context={lazyContext}>
            <LoaderProvider context={loaderContext}>
              <div id="__mwapfallback">
                <App>
                  <Route component={Page} path={page.path} exact={page.exact} />
                </App>
              </div>
            </LoaderProvider>
          </LazyProvider>
        </DocumentProvider>
      </StaticRouter>
    </React.Suspense>
  );

  if (resolveLazyModules) {
    const lazyStuff = await resolveLazyModules(lazyContext.chunks);
    const existingScripts = new Set(
      documentContext.scripts.map((script) => stringify(script))
    );
    lazyStuff.scripts?.forEach((script) => {
      const hash = stringify(script);
      if (!existingScripts.has(hash)) {
        existingScripts.add(hash);
        documentContext.scripts.push(script);
      }
    });

    const existingStyles = new Set(
      documentContext.scripts.map((script) => stringify(script))
    );
    lazyStuff.styles?.forEach((style) => {
      const hash = stringify(style);
      if (!existingStyles.has(hash)) {
        existingStyles.add(hash);
        documentContext.styles.push(style);
      }
    });
  }

  const html = renderToStaticMarkup(
    <DocumentProvider context={documentContext}>
      <LoaderProvider context={loaderContext}>
        <Document />
      </LoaderProvider>
    </DocumentProvider>
  );

  return {
    headers,
    html: `<!DOCTYPE html>\n${html}`,
  };
};

export default handler;
