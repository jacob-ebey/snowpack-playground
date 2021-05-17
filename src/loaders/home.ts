import type { Loader } from "mwap";

export type HomeArgs = {
  name?: string;
};

export type HomeData = {
  name: string;
};

const loader: Loader<HomeData, HomeArgs> = ({ name = "World" }) => {
  return {
    data: {
      name,
    },
  };
};

export default loader;
