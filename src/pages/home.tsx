import * as React from "react";

import lazy from "mwap/lazy";

import Container from "../components/container";
import Hero from "../components/hero";

const LazyComp = lazy(() => import("../components/lazy-comp"));
const LazyComp2 = lazy(() => import("../components/lazy-comp"));

const Home: React.FC = () => {
  return (
    <>
      <Container>
        <Hero
          title="💰 Web App Platform"
          description="A less opinionated, but still opinionated enough React platform that supports automatic page code splitting, suspense on the server, and a data loaders pattern that makes edge caching a breeze."
          link={{
            label: "View the docs",
            to: "/docs",
          }}
        />

        <LazyComp />
      </Container>
    </>
  );
};

export default Home;
