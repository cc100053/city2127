import { defineConfig } from 'vite';

// The city imports survey/src, so the repo root stays watched, but not the other packages' outputs.
// On Windows the survey window's `npm run build` copies survey/dist/hand/hand_landmarker.task while
// this dev server starts, and watching that locked file crashes Vite with EBUSY; the live SQLite
// files in survey/data change on every vote.
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/survey/dist/**', '**/survey/data/**', '**/module-swap/**', '**/artifacts/**', '**/dist/**'],
    },
  },
});
