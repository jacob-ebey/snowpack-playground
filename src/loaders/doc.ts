import * as path from "path";
import * as fs from "fs";

import type { Loader } from "mwap";

import matter from "gray-matter";
import remark from "remark";
import html from "remark-html";
const prismPromise = import("remark-prism").then((m) => m.default || m);

export type DocArgs = {
  slug: string;
};

export type DocData = {
  content: string;
  data: Record<string, any>;
  excerpt: string;
  slug: string;
};

let render = 0;

const loader: Loader<DocData, DocArgs> = async ({ slug }) => {
  const r = render++;

  const markdownPath = path.resolve(process.cwd(), `docs/${slug}.md`);
  const markdownWithMatter = await fs.promises.readFile(markdownPath, "utf8");

  const { content: markdown, data, excerpt } = matter(markdownWithMatter);

  const prism = await prismPromise;

  console.time(`doc loader remark ${r}`);
  const result = await remark().use(html).use(prism).process(markdown);
  console.timeEnd(`doc loader remark ${r}`);

  return {
    data: {
      content: result.toString(),
      data,
      excerpt,
      slug,
    },
  };
};

export default loader;
