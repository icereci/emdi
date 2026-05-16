import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { editorFontSizeForZoom } from '@emdi/core/zoom';
import { useAppStore } from './store.js';
import { ZoomPill } from './ZoomPill.js';

interface Props {
  onEditorReady?: (editor: Monaco.editor.IStandaloneCodeEditor) => void;
  onPasteImage?: (file: File) => void | Promise<void>;
}

/**
 * Editor pane: .pane.editor > .pane-head + Monaco. Monaco fills the rest of
 * the pane. The pane-head holds the label and ZoomPill (matching the design).
 */
export function EditorPane({ onEditorReady, onPasteImage }: Props): JSX.Element {
  const source = useAppStore((s) => s.source);
  const setSource = useAppStore((s) => s.setSource);
  const setCursor = useAppStore((s) => s.setCursor);
  const setFocusedPane = useAppStore((s) => s.setFocusedPane);
  const requestFlash = useAppStore((s) => s.requestFlash);
  const focused = useAppStore((s) => s.focusedPane === 'editor');
  const zoom = useAppStore((s) => s.settings.zoom.editor);
  const setZoom = useAppStore((s) => s.setZoom);
  const flashToast = useAppStore((s) => s.flashToast);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);
  const monoFont = useAppStore((s) => s.settings.tweaks.monoFont);
  const wordWrap = useAppStore((s) => s.settings.tweaks.wordWrap);
  const showLineNumbers = useAppStore((s) => s.settings.tweaks.showLineNumbers);
  const syncScroll = useAppStore((s) => s.settings.tweaks.syncScroll);
  const jumpRequest = useAppStore((s) => s.jumpRequest);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition((e) => {
      setCursor(e.position.lineNumber, e.position.column);
      if (syncScroll) requestFlash(e.position.lineNumber);
    });
    editor.onDidFocusEditorWidget(() => setFocusedPane('editor'));
    editor.addCommand(monaco.KeyCode.Enter, () => continueListOnEnter(editor, monaco));
    onEditorReady?.(editor);
  };

  useEffect(() => {
    editorRef.current?.updateOptions({
      fontSize: editorFontSizeForZoom(zoom),
      fontFamily: `${monoFont}, ui-monospace, monospace`,
      wordWrap: wordWrap ? 'on' : 'off',
      lineNumbers: showLineNumbers ? 'on' : 'off',
    });
  }, [zoom, monoFont, wordWrap, showLineNumbers]);

  useEffect(() => {
    if (!jumpRequest || !editorRef.current) return;
    editorRef.current.revealLineNearTop(jumpRequest.line);
    editorRef.current.setPosition({ lineNumber: jumpRequest.line, column: 1 });
    editorRef.current.focus();
  }, [jumpRequest]);

  return (
    <div
      className="pane editor"
      onMouseDown={() => setFocusedPane('editor')}
      onPaste={(e) => {
        if (!onPasteImage || !e.clipboardData) return;
        for (const item of e.clipboardData.items) {
          if (item.type && item.type.startsWith('image/')) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) void onPasteImage(file);
            return;
          }
        }
      }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <div className="pane-head">
        <span className="label">
          <span className="swatch" />
          Editor — Markdown
        </span>
        <div style={{ flex: 1 }} />
        <ZoomPill
          value={zoom}
          focused={focused}
          onChange={(next) => {
            setZoom('editor', next);
            flashToast(`Editor ${next}%`);
          }}
        />
      </div>
      <div className="editor-wrap" style={{ flex: 1, minHeight: 0 }}>
        <Editor
          value={source}
          defaultLanguage="markdown"
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
          onMount={handleMount}
          onChange={(v) => setSource(v ?? '')}
          options={{
            fontSize: editorFontSizeForZoom(zoom),
            fontFamily: `${monoFont}, ui-monospace, monospace`,
            wordWrap: wordWrap ? 'on' : 'off',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            lineNumbers: showLineNumbers ? 'on' : 'off',
            padding: { top: 12, bottom: 12 },
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

function continueListOnEnter(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: typeof Monaco,
): void {
  const model = editor.getModel();
  const pos = editor.getPosition();
  if (!model || !pos) {
    editor.trigger('keyboard', 'type', { text: '\n' });
    return;
  }
  const lineContent = model.getLineContent(pos.lineNumber);
  const bulletMatch = lineContent.match(/^(\s*)([-*+])\s(\[[ xX]\]\s)?(.*)$/);
  const numberedMatch = lineContent.match(/^(\s*)(\d+)\.\s(.*)$/);

  if (bulletMatch) {
    const indent = bulletMatch[1] ?? '';
    const marker = bulletMatch[2] ?? '-';
    const task = bulletMatch[3] ? '[ ] ' : '';
    const body = bulletMatch[4] ?? '';
    if (body.length === 0 && !bulletMatch[3]) {
      const range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, lineContent.length + 1);
      editor.executeEdits('emdi-list', [{ range, text: indent }]);
      return;
    }
    editor.trigger('keyboard', 'type', { text: `\n${indent}${marker} ${task}` });
    return;
  }
  if (numberedMatch) {
    const indent = numberedMatch[1] ?? '';
    const n = Number.parseInt(numberedMatch[2] ?? '1', 10);
    const body = numberedMatch[3] ?? '';
    if (body.length === 0) {
      const range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, lineContent.length + 1);
      editor.executeEdits('emdi-list', [{ range, text: indent }]);
      return;
    }
    editor.trigger('keyboard', 'type', { text: `\n${indent}${n + 1}. ` });
    return;
  }
  editor.trigger('keyboard', 'type', { text: '\n' });
}
