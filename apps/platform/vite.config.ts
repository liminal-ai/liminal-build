import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(currentDir, 'client'),
  build: {
    emptyOutDir: false,
    outDir: path.join(currentDir, 'dist/client'),
  },
});
