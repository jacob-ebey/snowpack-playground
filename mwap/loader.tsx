import * as React from "react";
import stringify from "json-stringify-deterministic";

export type LoaderResult<TData = any> = {
  data: TData;
  headers?: Record<string, string>;
};

export type Loader<TData = any, TParams = any> = (
  params: TParams
) => Promise<LoaderResult<TData>> | LoaderResult<TData>;

export type LoaderContextCache = Record<
  string,
  Record<
    string,
    {
      data?: any;
      promise?: Promise<any>;
    }
  >
>;

export type LoaderContext = {
  cache: LoaderContextCache;
  get: <TData, TParams>(
    loader: string,
    params: TParams
  ) => Promise<TData> | TData;
};

export type LoaderContextLoader = <TData, TParams>(
  loader: string,
  params: TParams,
  encodedParams: string
) => Promise<TData> | TData;

const encodeParams = (params: any) => {
  const json = stringify(params);

  if (typeof window === "undefined") {
    return Buffer.from(json).toString("base64");
  }

  return btoa(json);
};

export const createLoaderContext = (
  load: LoaderContextLoader
): LoaderContext => {
  const cache: LoaderContextCache =
    typeof window === "undefined"
      ? {}
      : (window as any).__MWAP_LOADER_CACHE__ || {};

  return {
    cache,
    get: <TData, TParams>(loader, params) => {
      const encodedParams = encodeParams(params);

      let cacheEntry = cache[loader]?.[encodedParams];
      if (cacheEntry && (cacheEntry.data || cacheEntry.promise)) {
        return cacheEntry.data || cacheEntry.promise;
      }

      cacheEntry = {};

      const loadResult = load<TData, TParams>(loader, params, encodedParams);

      if ("then" in loadResult) {
        cacheEntry.promise = loadResult.then((data) => {
          cacheEntry.data = data;
        });
      } else {
        cacheEntry.data = loadResult;
      }

      cache[loader] = cache[loader] || {};
      cache[loader][encodedParams] = cacheEntry;

      return cacheEntry.data || cacheEntry.promise;
    },
  };
};

const loaderContext = React.createContext<LoaderContext | null>(null);

export const useLoaderContext = () => React.useContext(loaderContext);

export type LoaderProviderProps = {
  context: LoaderContext;
};

export const LoaderProvider: React.FC<LoaderProviderProps> = ({
  children,
  context,
}) => (
  <loaderContext.Provider value={context}>{children}</loaderContext.Provider>
);

export const useLoader = <TData, TParams = unknown>(
  loader: string,
  params?: TParams
): TData => {
  const context = useLoaderContext();

  const result = context.get<TData, TParams>(loader, params || ({} as TParams));

  if ("then" in result) {
    throw result;
  }

  return result;
};
