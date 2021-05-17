import type { LoaderContextLoader } from "../loader";

export type CreateLoaderArgs = {
  basePath?: string;
};

export const createLoader = ({
  basePath = "/_mwap/loader/",
} = {}): LoaderContextLoader => {
  return async <TData, TParams>(loader, _, encodedParams) => {
    return fetch(`${basePath}${loader}/${encodedParams}.json`).then((res) =>
      res.json()
    );
  };
};
