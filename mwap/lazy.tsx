import * as React from "react";
import stringify from "json-stringify-deterministic";

export type DefaultModule<T> = {
  default: T;
};

export type TypeOrDefaultModule<T> = DefaultModule<T> | T;

export type LazyLoader<TComponent extends React.ComponentType> = () =>
  | Promise<TypeOrDefaultModule<TComponent>>
  | TypeOrDefaultModule<TComponent>;

export type LazyComponentWithPreload<TProps> = React.FC<TProps> & {
  preload: () => Promise<void>;
};

export type LazyContext = {
  chunks: string[];
};

const lazyContext = React.createContext<LazyContext | null>(null);

export const useLazyContext = () => React.useContext(lazyContext);

export type LazyProviderProps = {
  context: LazyContext;
};

export const LazyProvider: React.FC<LazyProviderProps> = ({
  children,
  context,
}) => <lazyContext.Provider value={context}>{children}</lazyContext.Provider>;

const encodeParams = (params: any) => {
  const json = stringify(params);

  if (typeof window === "undefined") {
    return Buffer.from(json).toString("base64");
  }

  return btoa(json);
};

type InferProps<TComponent> = TComponent extends React.ComponentType<
  infer TProps
>
  ? TProps
  : {};

const LazyFallback = ({ lazyId }: { lazyId: string }) => {
  const fallbackElement = document.getElementById(lazyId);
  const fallback = fallbackElement ? fallbackElement.innerHTML : "";

  return (
    <div
      id={lazyId}
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: fallback }}
    />
  );
};

const lazy = <
  TComponent extends React.ComponentType<any> = React.ComponentType
>(
  loader: LazyLoader<TComponent>,
  { chunkName }: { chunkName?: string } = {}
): LazyComponentWithPreload<InferProps<TComponent>> => {
  let Comp: TComponent;
  let promise: Promise<void>;

  const preload = async (): Promise<void> => {
    if (promise) {
      return promise;
    }
    return (promise = (async () => {
      const mod = await loader();
      Comp = "default" in mod ? mod.default : mod;
    })());
  };

  const LazyComp = (props: InferProps<TComponent>) => {
    if (!Comp) {
      throw preload();
    }

    return <Comp {...props} />;
  };

  const Lazy = (props: InferProps<TComponent>) => {
    const context = useLazyContext();

    if (context && chunkName && !context.chunks.includes(chunkName)) {
      context.chunks.push(chunkName);
    }

    const lazyId = `${chunkName}|${encodeParams(stringify(props))}`;
    return (
      <React.Suspense fallback={<LazyFallback lazyId={lazyId} />}>
        <div id={lazyId} style={{ display: "contents" }}>
          <LazyComp {...props} />
        </div>
      </React.Suspense>
    );
  };

  const LazyWithPreload = Lazy as LazyComponentWithPreload<
    InferProps<TComponent>
  >;
  LazyWithPreload.preload = preload;

  return LazyWithPreload;
};

export default lazy;
