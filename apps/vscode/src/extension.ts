import * as vscode from 'vscode';
import { PreviewPanel } from './PreviewPanel.js';

export function activate(context: vscode.ExtensionContext): void {
  const panels = new Map<string, PreviewPanel>();

  const open = (toSide: boolean) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      vscode.window.showInformationMessage('Open a Markdown file first.');
      return;
    }
    const key = editor.document.uri.toString();
    const existing = panels.get(key);
    if (existing) {
      existing.reveal(toSide);
      return;
    }
    const panel = new PreviewPanel(context, editor.document, toSide);
    panels.set(key, panel);
    panel.onDispose(() => panels.delete(key));
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('emdi.openPreview', () => open(false)),
    vscode.commands.registerCommand('emdi.openPreviewToSide', () => open(true)),
  );
}

export function deactivate(): void {}
