import type MarkdownIt from 'markdown-it';

/**
 * Adds `data-lang="<language>"` to every <pre> block emitted from a fenced
 * code block. The design's CSS uses this to render the language label in the
 * top-right corner of the code block.
 *
 * Also adds the language as a class on the <code> element so highlight.js or
 * Shiki picks it up downstream.
 */
export function codeLang(md: MarkdownIt): void {
  md.renderer.rules.fence = (tokens, idx, options, _env, self) => {
    const token = tokens[idx];
    if (!token) return '';
    const info = token.info ? token.info.trim() : '';
    const lang = info ? info.split(/\s+/g)[0] ?? '' : '';
    const langLabel = lang || 'plain';

    // Mermaid blocks render as <div class="mermaid"> instead of <pre>.
    if (lang === 'mermaid') {
      const src = token.content;
      token.attrJoin('class', 'mermaid');
      const attrs = self.renderAttrs(token);
      return `<div${attrs} data-mermaid-src="${md.utils.escapeHtml(src)}">${md.utils.escapeHtml(src)}</div>\n`;
    }

    const escaped = options.highlight
      ? options.highlight(token.content, lang, '')
      : md.utils.escapeHtml(token.content);
    const codeClass = lang ? ` class="language-${md.utils.escapeHtml(lang)} hljs"` : ' class="hljs"';
    const preAttrs = self.renderAttrs(token);
    return `<pre${preAttrs} data-lang="${md.utils.escapeHtml(langLabel)}"><code${codeClass}>${escaped}</code></pre>\n`;
  };
}
