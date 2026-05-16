import type MarkdownIt from 'markdown-it';

/**
 * Attaches `data-sline="N"` and `data-eline="M"` to every top-level block
 * token that has a source map. Used by sync-scroll, click-to-locate, and
 * the click-flash effect.
 *
 * Lines are 1-based to match the rest of the app (matches the design's
 * convention; editor line numbers are 1-based, front-matter offset is
 * applied separately).
 */
export function sourceMap(md: MarkdownIt): void {
  const renderer = md.renderer;
  const originalRender = renderer.renderToken.bind(renderer);

  renderer.renderToken = (tokens, idx, options) => {
    const token = tokens[idx];
    if (token && token.level === 0 && token.map && token.nesting !== -1) {
      const start = token.map[0] + 1;
      const end = token.map[1];
      token.attrJoin('data-sline', String(start));
      token.attrJoin('data-eline', String(end));
    }
    return originalRender(tokens, idx, options);
  };
}
