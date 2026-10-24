import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  if (mode === 'pages') {
    return {
      plugins: [react()],
      root: 'pages',
      base: './',
      publicDir: false,
      build: { outDir: '../dist-pages', emptyOutDir: true, sourcemap: false },
    };
  }
  return {
    plugins: [react()],
    build: { sourcemap: false },
    server: {
      port: 5180,
      host: '127.0.0.1',
      proxy: { '/api': 'http://127.0.0.1:8787' },
    },
  };
});
