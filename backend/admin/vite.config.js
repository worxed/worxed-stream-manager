import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 4002,
    proxy: {
      '/api': 'http://localhost:4001',
      '/supervisor': {
        target: 'http://localhost:4000',
        rewrite: (path) => path.replace(/^\/supervisor/, ''),
      },
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
});
