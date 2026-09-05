import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        howItWorks: resolve(import.meta.dirname, 'zo-werkt-het.html')
      }
    }
  },
  server: {
    port: 4173
  }
});
