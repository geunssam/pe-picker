import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      input: {
        landing: 'index.html',
        app: 'app.html',
        login: 'login.html',
        privacy: 'privacy.html',
        terms: 'terms.html',
      },
    },
  },
  server: {
    open: true,
  },
});
