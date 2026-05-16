import * as vscode from 'vscode';

/**
 * Wraps a WebviewPanel hosting the emdi preview. Owns the document↔webview
 * message bridge and posts theme changes.
 */
export class PreviewPanel {
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private disposeCallback: (() => void) | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly document: vscode.TextDocument,
    toSide: boolean,
  ) {
    const column = toSide ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;
    this.panel = vscode.window.createWebviewPanel(
      'emdiPreview',
      `Preview: ${getFileName(document)}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
      },
    );

    this.panel.webview.html = this.buildHtml();
    // Initial post — webview may not be ready yet, so we ALSO respond to
    // the "ready" handshake below to re-post once the React app has mounted.
    this.postSource();
    this.postTheme();

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this.postSource();
        }
      }),
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (doc.uri.toString() === document.uri.toString()) {
          this.postSource();
        }
      }),
      vscode.window.onDidChangeActiveColorTheme(() => this.postTheme()),
      this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg)),
      this.panel.onDidDispose(() => this.dispose()),
    );
  }

  reveal(toSide: boolean): void {
    this.panel.reveal(toSide ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active);
  }

  onDispose(cb: () => void): void {
    this.disposeCallback = cb;
  }

  private dispose(): void {
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
    this.disposeCallback?.();
  }

  private postSource(): void {
    this.panel.webview.postMessage({
      type: 'source',
      source: this.document.getText(),
      path: this.document.fileName,
    });
  }

  private postTheme(): void {
    const kind = vscode.window.activeColorTheme.kind;
    const isDark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
    this.panel.webview.postMessage({ type: 'theme', mode: isDark ? 'dark' : 'light' });
  }

  private async handleMessage(msg: { type: string; line?: number }): Promise<void> {
    if (msg.type === 'ready') {
      this.postSource();
      this.postTheme();
      return;
    }
    if (msg.type === 'revealLine' && typeof msg.line === 'number') {
      const editor = vscode.window.visibleTextEditors.find(
        (e) => e.document.uri.toString() === this.document.uri.toString(),
      );
      if (editor) {
        const range = new vscode.Range(msg.line, 0, msg.line, 0);
        editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
      }
    }
  }

  private buildHtml(): string {
    const webview = this.panel.webview;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js'),
    );
    const nonce = makeNonce();
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src ${webview.cspSource} 'nonce-${nonce}'`,
      `font-src ${webview.cspSource} data:`,
      `img-src ${webview.cspSource} data: https:`,
    ].join('; ');

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <title>emdi preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

function getFileName(doc: vscode.TextDocument): string {
  const parts = doc.fileName.split(/[\\/]/);
  return parts[parts.length - 1] ?? 'Untitled';
}

function makeNonce(): string {
  let out = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}
