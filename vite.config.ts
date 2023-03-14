import { build, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "build",
  },
  plugins: [react(), eslint()],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:3080"
    },
  },
  define:  {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version)
  }
});
