import * as React from "react";

import { useLoaderContext } from "./loader";

export type DocumentScript = {
  inline?: true;
  type?: "module";
  source: string;
};

export type DocumentContext = {
  appHtml: string;
  scripts: DocumentScript[];
  styles: string[];
};

const documentContext = React.createContext<DocumentContext>({
  appHtml: "",
  scripts: [],
  styles: [],
});

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
      {styles.map((style) => (
        <link key={style} rel="preload" href={style} as="style" />
      ))}

      {scripts.map((script) =>
        script.inline ? null : script.type === "module" ? (
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
      {styles.map((style) => (
        <link key={style} rel="stylesheet" href={style} />
      ))}
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
          <script key={script.source} type={script.type} src={script.source} />
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

export const useDocumentContext = () => React.useContext(documentContext);

const Document = () => {
  return (
    <html>
      <Head />
      <Body />
    </html>
  );
};

export default Document;
