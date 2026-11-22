import { defineConfig } from 'vite';

// Debug pages only; src/server/server.ts serves the built dist/ together with the API.
export default defineConfig({
  // The hand-tracking worker is a module worker (handTracker.ts creates it with type: 'module').
  worker: { format: 'es' },
  build: { rollupOptions: { input: { index: 'index.html', guest: 'guest.html', monitor: 'monitor.html', admin: 'admin.html', pool: 'pool.html', handspike: 'handspike.html' } } },
});
