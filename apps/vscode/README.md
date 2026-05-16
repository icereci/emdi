# emdi-vscode

VS Code extension wrapping the emdi preview pane.

## Develop

From the monorepo root:

```bash
pnpm install
pnpm --filter emdi-vscode build
```

Open `apps/vscode` in VS Code and press F5 to launch an Extension Development Host.

Run `Emdi: Open Preview to the Side` (Ctrl+K V) on any markdown file.

## Package

```bash
pnpm vscode:package
```

Produces a `.vsix` file in `apps/vscode/`. Install with `code --install-extension emdi-vscode-0.0.0.vsix`.
