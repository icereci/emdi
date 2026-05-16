import type MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';

const TYPES = ['note', 'tip', 'info', 'warning', 'danger'] as const;
type AdmonitionType = (typeof TYPES)[number];

/**
 * Adds :::note / :::tip / :::info / :::warning / :::danger containers.
 *
 * Usage:
 *   :::note
 *   Body text
 *   :::
 *
 *   :::warning Optional title
 *   Body
 *   :::
 */
export function admonitions(md: MarkdownIt): void {
  for (const type of TYPES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    md.use(container as any, type, {
      render(tokens: ReturnType<MarkdownIt['parse']>, idx: number): string {
        const token = tokens[idx];
        if (!token) return '';
        if (token.nesting === 1) {
          const titleMatch = token.info.trim().match(new RegExp(`^${type}\\s+(.*)$`));
          const title = titleMatch?.[1] ?? capitalize(type);
          const escapedTitle = md.utils.escapeHtml(title);
          return `<div class="emdi-admonition emdi-admonition--${type}"><div class="emdi-admonition__title">${escapedTitle}</div><div class="emdi-admonition__body">\n`;
        }
        return `</div></div>\n`;
      },
    });
  }
}

function capitalize(s: AdmonitionType): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
