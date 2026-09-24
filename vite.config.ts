import { defineConfig } from 'vite';

export default defineConfig({
  build: { rollupOptions: { input: { shibuya: 'index.html', odaiba: 'odaiba.html' } } },
});
