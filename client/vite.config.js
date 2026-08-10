import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sharedRoot = fileURLToPath(new URL('../shared', import.meta.url));

function inlineAssetAsBase64() {
  return {
    name: 'inline-asset-as-base64',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('?inline')) return null;
      const filePath = id.slice(0, id.length - '?inline'.length);
      const base64 = readFileSync(filePath).toString('base64');
      const ext = filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase();
      const mime = ext === 'wasm' ? 'application/wasm' : 'application/octet-stream';
      return `export default "data:${mime};base64,${base64}"`;
    },
  };
}

export default defineConfig({
  plugins: [inlineAssetAsBase64(), react()],
  base: './',
  resolve: {
    alias: {
      '@micshare/shared': sharedRoot,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
