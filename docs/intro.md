# Getting Started

Welcome to the 💰 Web App Platform documentation!

## Manual Setup

Install `react`, `react-dom`, and `mwap` in your project:

```sh
npm install react react-dom
# or
yarn add react react-dom
```

Open `package.json` and add the following scripts:

```json
{
  "scripts": {
    "build": "mwap build",
    "dev": "mwap dev",
    "start": "mwap start"
  }
}
```

- `dev` - Runs mwap dev which starts your app in development mode
- `build` - Runs mwap build which builds the application for production usage
- `start` - Runs mwap start which starts your bundled app in production mode

Next we will introduce a page to our application by creating a `pages/home.tsx` file that exports a simple React component:

```tsx
import * as React from "react";
import { Helmet } from "react-helmet-async";

const HomePage = () => {
  const [count, setCount] = React.useState(5);
  const handleIncrement = () => setCount(count + 1);

  return (
    <>
      <Helmet>
        <title>Home</title>
      </Helmet>
      <h1>Hello, World!</h1>
      <button onClick={handleIncrement}>Count: {count}</button>
    </>
  );
};

export default HomePage;
```

Now we will expose the Home component by creating a `pages/index.ts` file and assigning our home component to a page:

```ts
import type { Page } from "mwap";

const pages: Page[] = [
  {
    // Points to the component in the pages directory
    // you wish to render for the provided path.
    module: "home",
    exact: true,
    path: "/",
  },
];

export default pages;
```

To start a development server run `npm run dev` or `yarn dev`. Visit [http://localhost:5000](http://localhost:5000) to view your application.

So far, we get:

- Automatic compilation and bundling (with webpack and esbuild)
- React Fast Refresh
- Server-side rendering of `./pages/index`
- Static file serving. `./public/` is mapped to `/`
- Automatic client bundle inlining of environment variables that begin with `MWAP_`
- `.env` support for client and server environment variables

## Related

For more information on what to do next, we recommend the following sections:

- [Pages](/docs/pages)
- [CSS Support](/docs/built-in-css-support)
- [Data Loaders](/docs/data-fetching)
