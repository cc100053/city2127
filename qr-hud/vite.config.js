import { defineConfig } from 'vite';

export default defineConfig({
  resolve: { dedupe: ['three'] },
  server: {
    host: '0.0.0.0',
    proxy: { '/api': 'http://127.0.0.1:4173' },
  },
});
