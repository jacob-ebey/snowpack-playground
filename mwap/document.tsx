import * as React from "react";

import { useLoaderContext } from "./loader";

export type DocumentScript = {
  async?: boolean;
  defer?: boolean;
  inline?: boolean;
  preload?: boolean;
  type?: "module";
  source: string;
};

export type DocumentStyle = {
  inline?: boolean;
  preload?: boolean;
  source: string;
};

export type DocumentContext = {
  appHtml: string;
  scripts: DocumentScript[];
  styles: DocumentStyle[];
};

const documentContext = React.createContext<DocumentContext>({
  appHtml: "",
  scripts: [],
  styles: [],
});

export const useDocumentContext = () => React.useContext(documentContext);

export type DocumentProviderProps = {
  context: DocumentContext;
};

export const DocumentProvider: React.FC<DocumentProviderProps> = ({
  children,
  context,
}) => (
  <documentContext.Provider value={context}>
    {children}
  </documentContext.Provider>
);

export const Preloads = () => {
  const { scripts, styles } = useDocumentContext();
  return (
    <>
      {styles.map((style) =>
        style.inline || !style.preload ? null : (
          <link
            key={style.source}
            rel="preload"
            href={style.source}
            as="style"
          />
        )
      )}

      {scripts.map((script) =>
        script.inline || !script.preload ? null : script.type === "module" ? (
          <link key={script.source} rel="modulepreload" href={script.source} />
        ) : (
          <link
            key={script.source}
            rel="preload"
            as="script"
            href={script.source}
          />
        )
      )}
    </>
  );
};

export const Styles = () => {
  const { styles } = useDocumentContext();

  return (
    <>
      {styles.map((style) =>
        style.inline ? (
          <style dangerouslySetInnerHTML={{ __html: style.source }} />
        ) : (
          <link key={style.source} rel="stylesheet" href={style.source} />
        )
      )}
    </>
  );
};

export const Head: React.FC<React.HTMLAttributes<HTMLHeadElement>> = ({
  children,
  ...headAttributes
}) => (
  <head {...headAttributes}>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <Preloads />

    {children}

    <Styles />
  </head>
);

export const Main = (
  props: Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "children" | "dangerouslySetInnerHTML"
  >
) => {
  const { appHtml } = useDocumentContext();

  return (
    <div id="__mwap" dangerouslySetInnerHTML={{ __html: appHtml }} {...props} />
  );
};

export const Scripts = () => {
  const { scripts } = useDocumentContext();
  const { cache } = useLoaderContext();

  const loaderCache = JSON.stringify(cache, (key, value) => {
    if (key === "promise") {
      return undefined;
    }
    return value;
  });

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__MWAP_LOADER_CACHE__ = ${loaderCache};`,
        }}
      />

      {scripts.map((script) =>
        script.inline ? (
          <script
            key={script.source}
            type={script.type}
            dangerouslySetInnerHTML={{ __html: script.source }}
          />
        ) : (
          <script
            key={script.source}
            type={script.type}
            async={script.async}
            defer={script.defer}
            src={script.source}
          />
        )
      )}
    </>
  );
};

export const Body: React.FC<React.HTMLAttributes<HTMLBodyElement>> = ({
  children,
  ...bodyAttributes
}) => {
  return (
    <body {...bodyAttributes}>
      <Main />
      {children}
      <Scripts />
    </body>
  );
};

const Document = () => {
  return (
    <html>
      <Head />
      <Body />
    </html>
  );
};

export default Document;
