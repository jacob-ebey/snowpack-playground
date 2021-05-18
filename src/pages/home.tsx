import * as React from "react";

import Container from "../components/container";
import Hero from "../components/hero";

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
      </Container>
    </>
  );
};

export default Home;
