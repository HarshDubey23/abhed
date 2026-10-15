import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

// the stand-in model, and no post-response work (`after` needs a live Next.js request)
vi.mock('../lib/llm', () => import('./stub-llm'));
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<typeof import('next/server')>()), after: () => undefined }));

const { runEval } = await import('./harness');
const { buildReport, renderMarkdown } = await import('./report');
const { DATASET_VERSION } = await import('./cases');

const SEEDS = [1, 7, 42];
const MD = fileURLToPath(new URL('./RESULTS.md', import.meta.url));
const JSON_OUT = fileURLToPath(new URL('./results.json', import.meta.url));

describe('Action-gate evaluation', () => {
  it('runs every case on both paths for every seed and writes eval/RESULTS.md', async () => {
    const baseline = existsSync(JSON_OUT) ? (JSON.parse(readFileSync(JSON_OUT, 'utf8')) as { datasetVersion: string; cases: { id: string; decision: string }[] }) : null;
    const report = buildReport(await runEval(SEEDS));
    writeFileSync(MD, renderMarkdown(report));
    writeFileSync(JSON_OUT, JSON.stringify(report, null, 2) + '\n');
    for (const h of report.headline) console.log(`${h.title}: ${h.text}`);

    expect(report.errors).toEqual([]);
    expect(report.deterministic).toBe(true);
    // the committed results must still describe the code: a changed decision means re-generate and re-commit them
    if (baseline?.datasetVersion === DATASET_VERSION) {
      const drift = report.cases.filter((c) => baseline.cases.find((b) => b.id === c.id)?.decision !== c.decision).map((c) => `${c.id}: ${baseline.cases.find((b) => b.id === c.id)?.decision} → ${c.decision}`);
      expect(drift).toEqual([]);
    }
  }, 600_000);
});
