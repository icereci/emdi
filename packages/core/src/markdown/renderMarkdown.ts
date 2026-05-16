import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';
import anchor from 'markdown-it-anchor';
import katexImport from '@vscode/markdown-it-katex';

import { admonitions } from './plugins/admonitions.js';
import { wikilinks } from './plugins/wikilinks.js';
import { frontMatter, type FrontMatterCapture } from './plugins/frontMatter.js';
import { sourceMap } from './plugins/sourceMap.js';
import { codeLang } from './plugins/codeLang.js';

// @vscode/markdown-it-katex is a CJS module that sets both `__esModule = true`
// and `exports.default = fn`. esbuild's Node-style interop gives us the whole
// exports object instead of unwrapping `.default`. Unwrap if needed so the
// same code works under both vitest (Node) and esbuild (browser).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const katex = ((katexImport as any).default ?? katexImport) as (md: MarkdownIt) => void;

export interface Heading {
  level: number;
  text: string;
  slug: string;
  /** 1-based source line of the heading. */
  line: number | null;
}

export interface RenderResult {
  /** Rendered HTML (without front-matter), wrapped in <div class="md-body">. */
  html: string;
  /** Inner HTML — same content without the .md-body wrapper. Useful for hosts that supply their own wrapper. */
  innerHtml: string;
  /** Heading outline for TOC / sync-scroll-by-heading. */
  headings: Heading[];
  /** Parsed YAML front-matter, if any. */
  frontMatter: Record<string, unknown> | null;
}

export interface RenderOptions {
  /** Allow raw HTML in markdown. Defaults to false for safety. */
  allowHtml?: boolean;
}

export function createMarkdown(options: RenderOptions = {}): MarkdownIt {
  const md = new MarkdownIt({
    html: options.allowHtml ?? false,
    linkify: true,
    breaks: false,
    typographer: false,
  });

  const fmCapture: FrontMatterCapture = { data: null, raw: '' };
  frontMatter(md, fmCapture);

  md.use(footnote);
  md.use(taskLists, { enabled: true, label: false });
  md.use(katex);
  admonitions(md);

  const headings: Heading[] = [];
  md.use(anchor, {
    permalink: false,
    callback: (
      token: { tag: string; map: [number, number] | null },
      info: { title: string; slug: string },
    ) => {
      headings.push({
        level: Number(token.tag.slice(1)),
        text: info.title,
        slug: info.slug,
        line: token.map ? token.map[0] + 1 : null,
      });
    },
  });

  md.use(wikilinks);
  codeLang(md);
  sourceMap(md);

  (md as MarkdownIt & { __fmCapture: FrontMatterCapture; __headings: Heading[] }).__fmCapture = fmCapture;
  (md as MarkdownIt & { __fmCapture: FrontMatterCapture; __headings: Heading[] }).__headings = headings;

  return md;
}

export function renderMarkdown(source: string, options: RenderOptions = {}): RenderResult {
  const md = createMarkdown(options) as MarkdownIt & {
    __fmCapture: FrontMatterCapture;
    __headings: Heading[];
  };
  md.__headings.length = 0;
  md.__fmCapture.data = null;
  md.__fmCapture.raw = '';

  const innerHtml = md.render(source);
  const html = `<div class="md-body">${innerHtml}</div>`;

  return {
    html,
    innerHtml,
    headings: [...md.__headings],
    frontMatter: md.__fmCapture.data,
  };
}
