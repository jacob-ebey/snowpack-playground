import * as React from "react";

import { Head, Body } from "mwap/document";

const Document = () => {
  return (
    <html>
      <Head />
      <Body className="bg-white text-black dark:bg-black dark:text-white" />
    </html>
  );
};

export default Document;
