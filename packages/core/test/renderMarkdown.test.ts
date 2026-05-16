import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/markdown/index.js';

describe('renderMarkdown', () => {
  it('wraps output in <div class="md-body">', () => {
    const { html } = renderMarkdown('hello world');
    expect(html.startsWith('<div class="md-body">')).toBe(true);
    expect(html.endsWith('</div>')).toBe(true);
  });

  it('renders a basic paragraph', () => {
    const { html, innerHtml } = renderMarkdown('hello world');
    expect(html).toContain('<p');
    expect(innerHtml).toContain('hello world');
  });

  it('attaches data-sline and data-eline to top-level blocks', () => {
    const md = `# heading\n\nfirst para\n\nsecond para\n`;
    const { html } = renderMarkdown(md);
    const slineMatches = html.match(/data-sline="\d+"/g) ?? [];
    const elineMatches = html.match(/data-eline="\d+"/g) ?? [];
    expect(slineMatches.length).toBeGreaterThanOrEqual(3);
    expect(elineMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('uses 1-based source lines', () => {
    const md = `# heading on line 1\n\nparagraph on line 3\n`;
    const { html } = renderMarkdown(md);
    expect(html).toMatch(/data-sline="1"/);
  });

  it('captures heading outline with slugs, levels, and 1-based lines', () => {
    const md = `# First\n\n## Second\n\n### Third\n`;
    const { headings } = renderMarkdown(md);
    expect(headings).toHaveLength(3);
    expect(headings[0]).toMatchObject({ level: 1, text: 'First', line: 1 });
    expect(headings[1]).toMatchObject({ level: 2, text: 'Second', line: 3 });
    expect(headings[2]).toMatchObject({ level: 3, text: 'Third', line: 5 });
    expect(headings.every((h) => typeof h.slug === 'string' && h.slug.length > 0)).toBe(true);
  });

  it('adds id attributes to headings', () => {
    const { html } = renderMarkdown('# Hello World');
    expect(html).toContain('id="hello-world"');
  });

  it('parses YAML front-matter and strips it from output', () => {
    const md = `---\ntitle: Hello\ntags: [a, b]\n---\n\nbody text\n`;
    const { html, frontMatter } = renderMarkdown(md);
    expect(frontMatter).toEqual({ title: 'Hello', tags: ['a', 'b'] });
    expect(html).not.toContain('title: Hello');
    expect(html).toContain('body text');
  });

  it('renders GFM tables', () => {
    const md = `| a | b |\n|---|---|\n| 1 | 2 |\n`;
    const { html } = renderMarkdown(md);
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('<td');
  });

  it('renders task lists', () => {
    const md = `- [ ] todo\n- [x] done\n`;
    const { html } = renderMarkdown(md);
    expect(html).toContain('type="checkbox"');
  });

  it('renders footnotes', () => {
    const md = `body[^1]\n\n[^1]: note\n`;
    const { html } = renderMarkdown(md);
    expect(html).toContain('footnote');
  });

  it('renders KaTeX math', () => {
    const md = `inline $a^2 + b^2$\n\n$$\nx = 1\n$$\n`;
    const { html } = renderMarkdown(md);
    expect(html).toContain('katex');
  });

  it('renders admonitions', () => {
    const md = `:::note\nthis is a note\n:::\n`;
    const { html } = renderMarkdown(md);
    expect(html).toContain('emdi-admonition');
    expect(html).toContain('emdi-admonition--note');
  });

  it('renders admonitions with custom titles', () => {
    const md = `:::warning Heads up\nbe careful\n:::\n`;
    const { html } = renderMarkdown(md);
    expect(html).toContain('emdi-admonition--warning');
    expect(html).toContain('Heads up');
  });

  it('renders wikilinks as styled spans (single-file mode)', () => {
    const md = `see [[other note]] and [[target|label]]\n`;
    const { html } = renderMarkdown(md);
    expect(html).toContain('class="emdi-wikilink"');
    expect(html).toContain('data-target="other note"');
    expect(html).toContain('data-target="target"');
    expect(html).toContain('>label<');
  });

  it('attaches data-lang and hljs class to fenced code blocks', () => {
    const md = '```ts\nconst x = 1;\n```\n';
    const { html } = renderMarkdown(md);
    expect(html).toContain('data-lang="ts"');
    expect(html).toContain('class="language-ts hljs"');
  });

  it('renders unlabeled fenced code with data-lang="plain"', () => {
    const md = '```\nhello\n```\n';
    const { html } = renderMarkdown(md);
    expect(html).toContain('data-lang="plain"');
  });

  it('renders mermaid blocks as <div class="mermaid">', () => {
    const md = '```mermaid\nflowchart LR\n  A --> B\n```\n';
    const { html } = renderMarkdown(md);
    expect(html).toContain('class="mermaid"');
    expect(html).toContain('data-mermaid-src');
  });

  it('escapes HTML by default', () => {
    const md = `<script>alert(1)</script>`;
    const { html } = renderMarkdown(md);
    expect(html).not.toContain('<script>');
  });

  it('allows HTML when opted in', () => {
    const md = `<div class="x">y</div>`;
    const { html } = renderMarkdown(md, { allowHtml: true });
    expect(html).toContain('<div class="x">');
  });
});
