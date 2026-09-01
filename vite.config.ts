import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vite only auto-exposes VITE_-prefixed vars from .env; the plain PORT var
// the server itself reads (server/src/index.ts) has to be loaded explicitly
// here so the dev proxy target actually follows it instead of hardcoding 4000.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '');

  return {
    root: 'client',
    envDir: path.resolve(__dirname),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client/src'),
        '@shared': path.resolve(__dirname, 'shared'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': `http://localhost:${env.PORT}`,
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist/client'),
      emptyOutDir: true,
    },
  };
});
