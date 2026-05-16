import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@emdi/ui';
import '@emdi/ui/styles.css';
import 'katex/dist/katex.min.css';
import { createDesktopHost } from './host.js';
import { DesktopShell } from './DesktopShell.js';

const host = createDesktopHost();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DesktopShell host={host}>
      <App host={host} />
    </DesktopShell>
  </React.StrictMode>,
);
