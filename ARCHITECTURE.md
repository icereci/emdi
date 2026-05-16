# Architecture

This is a guide for contributors and curious readers. For "what is emdi", see [README.md](./README.md). For visual design, see [design/README.md](./design/README.md).

## Goal

One markdown editor / viewer shipped in two forms — a Tauri 2 standalone app and a VS Code extension — built from a single shared core so the two never drift.

## Layout

```
emdi/
├── packages/
│   ├── core/          pure TS — markdown pipeline, theme tokens, zoom math,
│   │                  sync-scroll algorithm, settings schema, find/replace.
│   │                  No DOM, no React, no host-specific code.
│   └── ui/            React components shared by both apps.
│                      Wraps Monaco, owns the visible UI.
├── apps/
│   ├── desktop/       Tauri 2 shell. React frontend + Rust backend
│   │                  (file I/O, OS theme detection, recent-files store).
│   └── vscode/        VS Code extension. Hosts the preview pane as a
│                      webview alongside VS Code's own editor.
├── design/            Source of truth for visuals (CSS + JSX exports from
│                      Claude Design). Code consumes these tokens; never
│                      invents colors or shapes. See design/README.md.
└── fixtures/          Test markdown files (smoke.md exercises every feature).
```

## Why a monorepo

The interesting surface — the markdown pipeline, zoom UI, theme tokens, status bar, sync-scroll, find/replace, outline — is identical between the two apps. The only thing that differs is *who owns the editor*: in the desktop app we embed Monaco; in the VS Code extension VS Code's own editor IS the editor and we provide the preview pane.

Both differences are captured by a thin `AppHostBindings` interface (`packages/ui/src/AppHost.ts`). The host injects file I/O, settings persistence, image storage, and OS-theme detection; everything else is shared.

## Data flow

```
markdown source (string)
  │
  ▼
@emdi/core renderMarkdown()        ← markdown-it + plugins (footnote, task-list,
  │                                  KaTeX, container/admonitions, anchor,
  │                                  wikilinks, codeLang, sourceMap, frontMatter)
  │
  ▼
{ html, innerHtml, headings, frontMatter }
  │
  ▼
@emdi/ui PreviewPane               ← imperatively sets innerHTML, then runs
  │                                  Mermaid render + click-to-locate wiring
  ▼
DOM with `.md-body > <blocks with data-sline data-eline>`
  │
  ├─ used by syncscroll      → maps editor line ↔ preview block
  ├─ used by click-to-locate → block click → editor cursor jump
  └─ used by outline panel   → headings list with active highlight
```

## Where each killer feature lives

| Feature | Logic | UI |
| --- | --- | --- |
| Zoom (independent per pane) | `packages/core/src/zoom/` (non-linear `ZOOM_STEPS`, `nextZoom`) | `packages/ui/src/ZoomPill.tsx`, `hooks/useZoomShortcuts.ts`, `ZoomToast.tsx` |
| Light/dark/auto theme | `packages/core/src/theme/` (`applyTheme`, `watchSystemTheme`) | `packages/ui/src/hooks/useTheme.ts`, theme-seg in `TopBar.tsx` |
| Side-by-side + sync scroll | `packages/core/src/syncscroll/` (anchored interpolation) | `packages/ui/src/Splitter.tsx`, `hooks/useSyncScroll.ts` |
| Outline panel | Heading data from `renderMarkdown` | `packages/ui/src/OutlinePanel.tsx` |
| Find & replace | `packages/core/src/find/` | `packages/ui/src/FindBar.tsx` |
| Front-matter folding | `packages/core/src/markdown/plugins/frontMatter.ts` | Recognized by store; displayed in title-bar file tab |
| Image paste / export | Host-specific via `AppHostBindings` | Image: `App.tsx` `onPasteImage`; Export: `App.tsx` `onExportHtml` / `host.exportPdf()` |

## How visual design works

`design/` is the source of truth for visuals. It contains:
- `emdi.css` — the full stylesheet with `--bg`, `--fg`, `--accent`, etc. CSS variables on `.emdi-root`. Dark is default; `[data-theme="light"]` overrides.
- `emdi-*.jsx` — reference component implementations from Claude Design.
- `_check/` — screenshots showing target behavior.

`packages/ui/src/styles.css` is a copy of `design/emdi.css` plus app-specific additions for the markdown-it plugin output (`.emdi-admonition`, `.emdi-wikilink`).

The VS Code extension overrides the variable definitions to point at `--vscode-*` tokens — see `apps/vscode/webview/vscode-theme-bridge.css`. Same components, themed by the host.

When the design changes:
1. Re-export from Claude Design into `design/`.
2. `git diff design/` to see what changed.
3. For CSS changes: copy `emdi.css` into `packages/ui/src/styles.css`, re-append the admonition/wikilink rules.
4. For component shape changes: port the diff into the matching component in `packages/ui/src/`.

## Adding a markdown plugin

1. If it's a small custom rule: write it in `packages/core/src/markdown/plugins/<name>.ts` following the shape of `wikilinks.ts` or `codeLang.ts`.
2. If it's a published markdown-it plugin: install the dep, import in `renderMarkdown.ts`, register with `md.use()`. Watch out for esbuild's CJS interop — modules that set both `__esModule = true` AND `exports.default = fn` need manual unwrapping (see the `katex` import for a worked example).
3. Add a fixture line to `fixtures/smoke.md`.
4. Add a test in `packages/core/test/renderMarkdown.test.ts`.

## How the apps differ

| Concern | Desktop (Tauri) | VS Code |
| --- | --- | --- |
| Editor pane | Embeds Monaco via `@monaco-editor/react` | Hidden — VS Code's own editor IS the editor |
| File I/O | Tauri's `plugin-dialog` + `plugin-fs` | `vscode.workspace.openTextDocument` etc. — handled by VS Code |
| Settings persistence | `tauri-plugin-store` (JSON in app data dir) | `vscode.WebviewPanel` state via `acquireVsCodeApi().setState` |
| Theme | Reads OS `prefers-color-scheme`, manual override possible | Reads VS Code's active theme via `--vscode-*` CSS vars + theme change events |
| Status bar | Full (cursor, line counts, dual-zoom display, etc.) | Compact (word count, reading time, preview zoom, theme) — VS Code's own status bar covers the rest |
| Source of markdown text | Owned (held in the React store) | Mirrored from `TextDocument` via `postMessage` |

## Build pipeline

```
@emdi/core     (TS source, no build — consumed by sources)
@emdi/ui       (TS source, no build — consumed by sources)
apps/desktop   pnpm tauri:dev → Vite (frontend) + cargo run (backend)
apps/vscode    pnpm build     → esbuild bundles extension.cjs (CJS, Node)
                              + webview.js (IIFE, browser)
```

`@emdi/core` and `@emdi/ui` are not built into `dist/` — both apps consume their source directly via TS path mapping + bundler resolution. This means changes propagate immediately without a rebuild step.

## Testing

- `pnpm test` (root) — runs vitest in `@emdi/core` covering the markdown pipeline (19 tests against `fixtures/smoke.md` shape).
- `pnpm -r typecheck` — TS strict-mode check across all packages.
- Manual smoke tests: open `fixtures/smoke.md` in either app and verify rendering, zoom, sync scroll, find, outline, theme switch.

There's no UI test framework wired up yet — the React side is verified by running the apps manually. PRs that touch UI logic should include a manual test plan in the description.
