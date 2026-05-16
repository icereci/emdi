# emdi

A focused markdown editor with three things it actually does well:

1. **Per-pane zoom** — editor and preview each have their own zoom %, visible in the status bar. `Ctrl+=` / `Ctrl+-` / `Ctrl+0`.
2. **Light / dark / auto** themes — follows the OS by default; the VS Code extension inherits VS Code's active theme.
3. **Side-by-side** view with heading-anchored sync scroll between source and rendered output.

Plus the standard modern-markdown surface: GFM (tables, task lists, strikethrough, autolinks), KaTeX math, Mermaid diagrams, footnotes, YAML front-matter, `:::admonition` containers, Obsidian-style `[[wikilinks]]`, find & replace with regex, outline panel, HTML / PDF export, paste-image-to-`./assets/`, smart list continuation.

Ships in two forms from one codebase:

- **Standalone desktop app** (Tauri 2 — Windows, macOS, Linux)
- **VS Code extension** — adds the same preview pane alongside VS Code's editor

---

## Install

### VS Code extension

Coming to the marketplace. For now, build from source:

```bash
git clone https://github.com/icereci/emdi.git
cd emdi
pnpm install
pnpm --filter emdi-vscode build
```

Then in VS Code: `code --extensionDevelopmentPath=apps/vscode --new-window some-file.md`. Click the preview icon in the editor title bar (or `Ctrl+K V`).

### Desktop app

Coming as release binaries. For now, build from source — see [Build from source](#build-from-source).

---

## Quickstart (for hacking)

Requires Node 18+, pnpm 9+, and (for the desktop app) the Rust toolchain.

```bash
git clone https://github.com/icereci/emdi.git
cd emdi
pnpm install

pnpm test                                  # markdown pipeline tests
pnpm -r typecheck                          # TS strict check across the workspace
pnpm desktop:dev                           # launch the standalone (Tauri)
pnpm --filter emdi-vscode build            # build the extension bundle
```

For the extension: open `apps/vscode/` in VS Code and press **F5** to launch an Extension Development Host, or run the `code --extensionDevelopmentPath=...` command above.

---

## Build from source

### Desktop (Tauri)

Prerequisites:
- **Node 18+** and **pnpm 9+**
- **Rust** (install via `rustup` — https://www.rust-lang.org/tools/install)
- Platform extras: Windows → MSVC Build Tools + WebView2 (ships with Win11); macOS → Xcode CLT; Linux → see [Tauri prerequisites](https://tauri.app/start/prerequisites/)

```bash
pnpm desktop:dev      # dev mode with HMR
pnpm desktop:build    # release bundle in apps/desktop/src-tauri/target/release/
```

### VS Code extension

```bash
pnpm --filter emdi-vscode build
pnpm vscode:package   # produces .vsix in apps/vscode/
```

Install the `.vsix`: `code --install-extension apps/vscode/emdi-vscode-0.0.0.vsix`.

---

## Project layout

```
emdi/
├── packages/
│   ├── core/      pure TS — markdown pipeline, theme, zoom, sync-scroll, find, settings
│   └── ui/        React components shared by both apps
├── apps/
│   ├── desktop/   Tauri 2 standalone shell
│   └── vscode/    VS Code extension + webview
├── design/        source of truth for visuals (CSS + JSX from Claude Design)
└── fixtures/      smoke.md exercises every renderer
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how it all fits together, where each killer feature lives, and how to add a markdown plugin.

---

## Contributing

PRs welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md). Good first issues are tagged `good first issue` on GitHub.

For visual changes, the design system in [`design/`](./design/) is the source of truth — code consumes the `--bg` / `--fg` / `--accent` etc. CSS variables rather than inventing colors.

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Zoom in / out / reset (per focused pane) |
| `Ctrl+\` | Cycle view mode (split → editor → preview) |
| `Ctrl+K` | Cycle theme (dark → light → auto) |
| `Ctrl+B` | Toggle outline panel |
| `Ctrl+F` | Find & replace |
| `Ctrl+P` | Export PDF (via print dialog) |
| `Ctrl+S` | Save (desktop) |
| `Ctrl+O` | Open file (desktop) |
| `Ctrl+K V` | Open preview to the side (VS Code extension) |

---

## License

[MIT](./LICENSE).
