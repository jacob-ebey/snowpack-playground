import * as React from "react";
import { Link } from "react-router-dom";

import { useLoader } from "mwap";

import type { HomeArgs, HomeData } from "../loaders/home";

import styles from "./home.module.css";

const Home: React.FC = () => {
  const data = useLoader<HomeData, HomeArgs>("home", { name: "test" });

  const [count, setCount] = React.useState(0);

  return (
    <>
      <h1 className={styles.home}>Helo, {data.name}!</h1>
      <p>Welcome to snowpack backed awesomeness!</p>
      <button onClick={() => setCount(count + 1)}>Count {count}</button>

      <Link to="/about">Go To About Page</Link>
      <Link to="/about2">Go To About 2 Page</Link>
    </>
  );
};

export default Home;
