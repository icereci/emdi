import type MarkdownIt from 'markdown-it';
import frontMatterPlugin from 'markdown-it-front-matter';
import yaml from 'js-yaml';

export interface FrontMatterCapture {
  /** Last parsed front-matter as an arbitrary object, or null if absent / unparseable. */
  data: Record<string, unknown> | null;
  /** Raw YAML text. */
  raw: string;
}

/**
 * Wraps markdown-it-front-matter and exposes the parsed YAML via a capture
 * object so the caller can read it after rendering.
 */
export function frontMatter(md: MarkdownIt, capture: FrontMatterCapture): void {
  md.use(frontMatterPlugin, (raw: string) => {
    capture.raw = raw;
    try {
      const parsed = yaml.load(raw);
      capture.data = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      capture.data = null;
    }
  });
}
