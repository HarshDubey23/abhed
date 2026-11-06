import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: { env: { ABHED_COMMIT_WINDOW_SECONDS: '0' }, include: ['tests/**/*.test.ts'] },
});
