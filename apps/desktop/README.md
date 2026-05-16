# @emdi/desktop

Tauri 2 standalone shell for emdi.

## Prerequisites

- Node 18+ (you have 24.x)
- pnpm 9+
- Rust toolchain (`rustup` install — see https://www.rust-lang.org/tools/install)
- Platform-specific build deps:
  - **Windows:** Microsoft C++ Build Tools + WebView2 (Windows 11 has it preinstalled)
  - **macOS:** Xcode CLT
  - **Linux:** see https://tauri.app/start/prerequisites/

## Develop

```bash
pnpm install                  # from monorepo root
pnpm desktop:dev              # runs `tauri dev` in this app
```

Or from this folder: `pnpm tauri:dev`.

## Build a release

```bash
pnpm desktop:build
```

Output lands in `src-tauri/target/release/bundle/`.

Drop your app icon into `src-tauri/icons/icon.png` before building a release bundle. Dev runs don't need it.
