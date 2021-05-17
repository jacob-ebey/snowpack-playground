import * as React from "react";
import { Link } from "react-router-dom";

import "prismjs/themes/prism-okaidia.css";

import { useLoader } from "mwap";

import type { DocArgs, DocData } from "../loaders/doc";

import Container from "../components/container";
import NavMenu from "../components/nav-menu";

const About = () => {
  const doc = useLoader<DocData, DocArgs>("doc", { slug: "test" });

  return (
    <main className="max-w-2xl mx-auto lg:mx-auto lg:grid lg:grid-flow-col lg:max-w-min">
      <div>
        <NavMenu
          title="Docs"
          items={[
            {
              to: "/docs",
              label: "Getting Started",
            },
            {
              to: "/docs/pages",
              label: "Pages",
            },
            {
              to: "/docs/built-in-css-support",
              label: "CSS Support",
            },
            {
              to: "/docs/data-loaders",
              label: "Data Loaders",
            },
            {
              to: "/docs/custom-app",
              label: "Custom App",
            },
            {
              to: "/docs/custom-document",
              label: "Custom Document",
            },
            {
              to: "/docs/cli",
              label: "CLI",
            },
            {
              to: "/docs/configuration",
              label: "MWAP Configuration",
            },
          ]}
        />
      </div>

      <Container className="lg:w-screen lg:ml-0 lg:max-w-2xl">
        <article
          className="prose dark:prose-dark max-w-none"
          dangerouslySetInnerHTML={{ __html: doc.content }}
        />
      </Container>
    </main>
  );
};

export default About;
