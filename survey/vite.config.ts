import { defineConfig } from 'vite';

// Debug pages only; src/server/server.ts serves the built dist/ together with the API.
export default defineConfig({
  build: { rollupOptions: { input: { index: 'index.html', guest: 'guest.html', monitor: 'monitor.html', admin: 'admin.html' } } },
});
