# Contributing to emdi

Thanks for taking a look. This is a small project; the bar for PRs is honest engineering and a clear description.

## Setup

```bash
git clone https://github.com/icereci/emdi.git
cd emdi
pnpm install
pnpm test            # should pass
pnpm -r typecheck    # should pass
```

For the desktop app you'll also need the [Rust toolchain](https://www.rust-lang.org/tools/install). For the VS Code extension, no extra setup needed.

## What's where

| Touching | File / directory |
| --- | --- |
| Markdown rendering | `packages/core/src/markdown/` |
| Zoom math (steps, clamps) | `packages/core/src/zoom/` |
| Sync-scroll algorithm | `packages/core/src/syncscroll/` |
| Find / replace | `packages/core/src/find/` |
| Theme tokens & system | `packages/core/src/theme/`, `packages/ui/src/hooks/useTheme.ts` |
| React components | `packages/ui/src/` |
| Desktop shell | `apps/desktop/src/` (React) + `apps/desktop/src-tauri/` (Rust) |
| VS Code extension | `apps/vscode/src/` (Node-side) + `apps/vscode/webview/` (browser-side) |
| Visual design | `design/` — see [`design/README.md`](./design/README.md) |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full map.

## Common changes

### Add a markdown-it plugin

1. Install: `pnpm --filter @emdi/core add some-markdown-it-plugin`
2. Import + register in `packages/core/src/markdown/renderMarkdown.ts`
3. Watch for esbuild CJS interop: if the package sets both `__esModule = true` and `exports.default = fn`, you may need to manually unwrap (see the `katex` import in that file for the pattern).
4. Add a fixture line to `fixtures/smoke.md`
5. Add a test to `packages/core/test/renderMarkdown.test.ts`

### Add a UI component

1. Drop it in `packages/ui/src/`
2. Use the design's CSS variables (`var(--bg)`, `var(--fg)`, etc.) — never hardcode colors
3. If the component needs persisted state, add it to `packages/ui/src/store.ts`
4. Export from `packages/ui/src/index.ts` if it should be reusable

### Touch the design

`design/emdi.css` is the source of truth for visuals. To update:
1. Re-export from Claude Design into `design/` (overwriting `emdi.css` and the JSX files)
2. `git diff design/` to see what changed
3. Copy `design/emdi.css` into `packages/ui/src/styles.css`, preserving the appended `.emdi-admonition` and `.emdi-wikilink` rules at the bottom
4. For shape changes in the JSX files, port the diff into the corresponding component in `packages/ui/src/`

## Tests

The markdown pipeline has unit tests (`pnpm test`). UI components don't have automated tests yet — for UI changes, include a brief manual test plan in the PR description (what you opened, what you did, what you saw).

## Commits & PRs

- Small, focused PRs are easier to review than big ones
- Commit messages: imperative mood, present tense ("fix sync scroll on long code blocks", not "fixed" or "fixes")
- Run `pnpm -r typecheck` and `pnpm test` before opening a PR
- CI runs both on PRs; please don't skip them locally

## Found a bug?

Open an issue with:
- What you did
- What you expected
- What happened
- Which app (desktop / extension)
- Your OS and (if applicable) VS Code version

A snippet of markdown that triggers the issue is gold.
