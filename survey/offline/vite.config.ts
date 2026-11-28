import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Single-file offline build of the guest page: everything inlined, classic IIFE script so file:// works.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false,
    rollupOptions: { input: fileURLToPath(new URL('./guest.html', import.meta.url)), output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'guest.js' } },
  },
});
