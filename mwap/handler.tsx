import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToStringAsync } from "react-async-ssr";
import { StaticRouter, Route } from "react-router-dom";

import type { DocumentContext } from "./document";
import { DocumentProvider } from "./document";

import type { LoaderContext } from "./loader";
import { LoaderProvider } from "./loader";

import type { Page } from "./pages";

export type MwapHandlerContext = Partial<DocumentContext> & {
  loaderContext: LoaderContext;
  location: string;
  page: Page;
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

  documentContext.appHtml = await renderToStringAsync(
    <React.Suspense fallback="">
      <StaticRouter location={location}>
        <DocumentProvider context={documentContext}>
          <LoaderProvider context={loaderContext}>
            <div id="__mwapfallback">
              <App>
                <Route component={Page} path={page.path} exact={page.exact} />
              </App>
            </div>
          </LoaderProvider>
        </DocumentProvider>
      </StaticRouter>
    </React.Suspense>
  );

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
