export interface FindOptions {
  regex: boolean;
  caseSensitive: boolean;
  whole: boolean;
}

export const DEFAULT_FIND_OPTIONS: FindOptions = {
  regex: false,
  caseSensitive: false,
  whole: false,
};

export type FindTarget = 'editor' | 'preview';

export interface EditorMatch {
  start: number;
  end: number;
  str: string;
  /** 1-based line number where the match starts. */
  line: number;
}

/** Build a RegExp from a query + options. Returns null on invalid regex or empty query. */
export function buildRegex(query: string, options: FindOptions): RegExp | null {
  if (!query) return null;
  let pat = query;
  if (!options.regex) {
    pat = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  if (options.whole) {
    pat = `\\b${pat}\\b`;
  }
  try {
    return new RegExp(pat, 'g' + (options.caseSensitive ? '' : 'i'));
  } catch {
    return null;
  }
}

/** Search source for all matches. Returns an empty array for empty/invalid queries. */
export function findInSource(source: string, query: string, options: FindOptions): EditorMatch[] {
  const re = buildRegex(query, options);
  if (!re) return [];
  const out: EditorMatch[] = [];
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(source)) !== null) {
    const start = m.index;
    const matched = m[0];
    const end = start + matched.length;
    const line = source.slice(0, start).split('\n').length;
    out.push({ start, end, str: matched, line });
    if (m.index === re.lastIndex) re.lastIndex++;
    if (out.length > 9999) break;
  }
  return out;
}

/** Replace one match (the active one) in source. */
export function replaceOne(source: string, match: EditorMatch, replacement: string): string {
  return source.slice(0, match.start) + replacement + source.slice(match.end);
}

/** Replace all matches of a query in source. */
export function replaceAll(source: string, query: string, options: FindOptions, replacement: string): string {
  const re = buildRegex(query, options);
  if (!re) return source;
  return source.replace(re, replacement);
}
