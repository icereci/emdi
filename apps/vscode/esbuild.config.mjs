import esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

const sharedLogger = {
  name: 'log',
  setup(build) {
    build.onEnd((result) => {
      const errors = result.errors.length;
      const warnings = result.warnings.length;
      const ts = new Date().toLocaleTimeString();
      console.log(`[${ts}] build: ${errors} errors, ${warnings} warnings`);
    });
  },
};

const extensionBuild = {
  entryPoints: [resolve(__dirname, 'src/extension.ts')],
  outfile: resolve(__dirname, 'dist/extension.cjs'),
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  external: ['vscode'],
  sourcemap: true,
  plugins: [sharedLogger],
};

const webviewBuild = {
  entryPoints: [resolve(__dirname, 'webview/main.tsx')],
  outfile: resolve(__dirname, 'dist/webview.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome105',
  loader: { '.css': 'text' },
  sourcemap: true,
  plugins: [sharedLogger],
  define: { 'process.env.NODE_ENV': '"production"' },
};

if (watch) {
  const ctx1 = await esbuild.context(extensionBuild);
  const ctx2 = await esbuild.context(webviewBuild);
  await Promise.all([ctx1.watch(), ctx2.watch()]);
  console.log('watching...');
} else {
  await esbuild.build(extensionBuild);
  await esbuild.build(webviewBuild);
}
