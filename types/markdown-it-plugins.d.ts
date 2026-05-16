declare module 'markdown-it-footnote' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';
  interface TaskListOptions {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }
  const plugin: MarkdownIt.PluginWithOptions<TaskListOptions>;
  export default plugin;
}

declare module '@vscode/markdown-it-katex' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-front-matter' {
  import type MarkdownIt from 'markdown-it';
  const plugin: (md: MarkdownIt, cb: (fm: string) => void) => void;
  export default plugin;
}
