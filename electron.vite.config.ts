import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: ['better-sqlite3'],
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        external: ['better-sqlite3'],
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
    plugins: [react()],
  },
}); 