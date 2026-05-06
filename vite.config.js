import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          imgly: ['@imgly/background-removal'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
});
