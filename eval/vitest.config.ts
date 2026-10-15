import { defineConfig } from 'vitest/config';
import path from 'node:path';

// `npm run eval`: the full action-gate evaluation (slow; the regular suite runs a subset in tests/eval-gate.test.ts)
export default defineConfig({
  root: path.resolve(__dirname, '..'),
  resolve: { alias: { '@': path.resolve(__dirname, '..') } },
  test: { include: ['eval/**/*.eval.ts'], testTimeout: 600_000 },
});
