import type MarkdownIt from 'markdown-it';

/**
 * markdown-it plugin for Obsidian-style wikilinks: [[target]] or [[target|label]].
 *
 * In single-file mode we have no workspace to resolve targets against, so links
 * render as styled non-clickable spans. When workspace mode lands later, replace
 * the renderer to emit <a href="..."> with resolution.
 */
export function wikilinks(md: MarkdownIt): void {
  md.inline.ruler.before('link', 'wikilink', (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x5b /* [ */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x5b /* [ */) return false;

    const end = state.src.indexOf(']]', start + 2);
    if (end < 0) return false;

    const inner = state.src.slice(start + 2, end);
    if (inner.length === 0 || inner.includes('\n')) return false;

    if (!silent) {
      const pipe = inner.indexOf('|');
      const target = pipe >= 0 ? inner.slice(0, pipe).trim() : inner.trim();
      const label = pipe >= 0 ? inner.slice(pipe + 1).trim() : target;

      const token = state.push('wikilink', 'span', 0);
      token.meta = { target, label };
      token.content = label;
    }

    state.pos = end + 2;
    return true;
  });

  md.renderer.rules.wikilink = (tokens, idx) => {
    const token = tokens[idx];
    if (!token) return '';
    const target = String(token.meta?.target ?? '');
    const label = String(token.meta?.label ?? '');
    const escapedTarget = md.utils.escapeHtml(target);
    const escapedLabel = md.utils.escapeHtml(label);
    return `<span class="emdi-wikilink" data-target="${escapedTarget}">${escapedLabel}</span>`;
  };
}
