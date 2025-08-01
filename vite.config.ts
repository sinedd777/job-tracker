import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@main': resolve(__dirname, './src/main'),
      '@renderer': resolve(__dirname, './src/renderer'),
      '@shared': resolve(__dirname, './src/shared'),
      '@database': resolve(__dirname, './src/database'),
    },
  },
  base: './',
  build: {
    rollupOptions: {
      input: resolve(__dirname, './src/renderer/index.html'),
    },
    outDir: 'dist',
    assetsDir: '.',
    emptyOutDir: true,
  },
}); 