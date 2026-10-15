import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

// a small slice of the action-gate evaluation (the full run is `npm run eval`, see eval/RESULTS.md)
vi.mock('../lib/llm', () => import('../eval/stub-llm'));
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<typeof import('next/server')>()), after: () => undefined }));

const { runCase } = await import('../eval/harness');
const { CASES, DATASET_VERSION } = await import('../eval/cases');

const SUBSET = ['sdk-b01', 'sdk-b03', 'sdk-m06', 'sdk-m11', 'sdk-m14', 'sdk-m19', 'gw-b01', 'gw-b03', 'gw-m01', 'gw-m10', 'gw-m18'];
const RESULTS = fileURLToPath(new URL('../eval/results.json', import.meta.url));
const baseline = existsSync(RESULTS) ? (JSON.parse(readFileSync(RESULTS, 'utf8')) as { datasetVersion: string; cases: { id: string; decision: string }[] }) : null;

describe('Action-gate evaluation (subset)', () => {
  it.each(SUBSET)('%s gets its expected decision', async (id) => {
    const c = CASES.find((x) => x.id === id)!;
    const o = await runCase(c);
    expect(o.decision, o.reason).toBe(c.expect);
    // and still matches the committed results
    if (baseline?.datasetVersion === DATASET_VERSION) expect(o.decision).toBe(baseline.cases.find((b) => b.id === id)?.decision);
  }, 20000);
});
