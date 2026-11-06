#!/usr/bin/env node
/**
 * Abhed end to end, with one command and no keys, accounts or database:
 *
 *   npm run demo
 *
 * Builds if needed, starts Abhed on http://localhost:3000 with in-memory state, connects a demo bank, then
 * runs an agent that holds only an Abhed key. It attempts a ₹5,00,000 refund, then a ₹40,000 one that waits
 * for you on the approver screen. After you approve, the refund waits out its cancel window.
 *
 * Flags: --port 3000   --window 60 (seconds to cancel)   --auto cancel|commit (no person, for testing; exits after)
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const PORT = flag('port', '3000');
const WINDOW = flag('window', '60');
const AUTO = flag('auto', '');
const BASE = `http://localhost:${PORT}`;
const DIRECTOR = randomBytes(12).toString('hex');
const NEXT = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

const tty = process.stdout.isTTY || process.env.FORCE_COLOR;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const [dim, bold, red, green, amber, cyan] = [2, 1, 31, 32, 33, 36].map(paint);
const say = (s = '') => console.log(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inr = (n) => `₹${n.toLocaleString('en-IN')}`;

if (!existsSync(NEXT)) {
  say(red('Run npm install first.'));
  process.exit(1);
}
// fresh secrets for this run: they only ever guard this local demo
const env = { ...process.env, KAVACH_AGENT_SECRET: randomBytes(24).toString('hex'), DIRECTOR_KEY: DIRECTOR, ABHED_COMMIT_WINDOW_SECONDS: WINDOW, PORT, SUPABASE_URL: '', SUPABASE_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', GROQ_API_KEY: '', GEMINI_API_KEY: '' };

if (!existsSync(path.join(ROOT, '.next', 'BUILD_ID'))) {
  say(dim('Building Abhed once (about a minute)…'));
  const built = spawnSync(process.execPath, [NEXT, 'build'], { cwd: ROOT, env: { ...env, NODE_ENV: 'production' }, stdio: 'ignore' });
  if (built.status !== 0) {
    say(red('The build failed. Run npm run build to see why.'));
    process.exit(1);
  }
}

const server = spawn(process.execPath, [NEXT, 'start', '-p', PORT], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'pipe'] });
let serverError = '';
server.stderr.on('data', (d) => (serverError += d));
const stop = (code = 0) => {
  server.kill();
  process.exit(code);
};
process.on('SIGINT', () => stop());
server.on('exit', (code) => {
  say(red(`Abhed stopped (exit ${code}). ${serverError.slice(0, 400)}`));
  process.exit(1);
});

async function api(p, { key, body, director } = {}) {
  const r = await fetch(BASE + p, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}), ...(director ? { 'x-director-key': DIRECTOR } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status} ${data.error ?? ''}`);
  return data;
}

async function main() {
  for (let i = 0; ; i++) {
    const up = await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false);
    if (up) break;
    if (i > 120) throw new Error('Abhed did not start in 60 s.');
    await sleep(500);
  }
  const { code } = await api('/api/connect', { body: { action: 'code' }, director: true });
  const { keys, company } = await api('/api/connect/pair', { body: { code, site: { url: 'http://localhost', name: 'NovaBank Demo', sector: 'banking', agents: [{ id: 'rex', name: 'Rex' }] } } });

  say(bold(`\nAbhed is running at ${BASE}, and ${company} is connected.`));
  say(dim('Rex is a refund agent. It holds an Abhed key, and no bank credentials.\n'));
  const session = await api('/api/v1/sessions', { key: keys.rex, body: { task: 'Refund the duplicate EMI debit for Mr. Rohit Kapoor', subject: 'C-1029' } });
  const refund = (amount) => api('/api/v1/tools/call', { key: keys.rex, body: { sessionId: session.sessionId, tool: 'issue_refund', args: { customer: 'C-1029', amount, reason: 'Duplicate EMI debit' } } });

  say(`${cyan('Rex')} tries to refund ${bold(inr(500000))}`);
  const big = await refund(500000);
  say(`${red(big.decision)} ${dim(big.rule ?? '')}\n  ${big.reason}\n`);

  say(`${cyan('Rex')} tries to refund ${bold(inr(40000))}, the amount on record`);
  const held = await refund(40000);
  say(`${amber(held.decision)} ${dim(held.rule ?? '')}\n  ${held.reason}`);
  if (!held.approvalId) throw new Error(`Expected a hold, got ${held.decision}`);

  const url = `${BASE}/approve/${held.approvalId}`;
  if (AUTO) {
    const { token } = await api('/api/approver/login', { body: { tenant: 'banking', humanId: 'judge', pin: '1234' } });
    const { approval } = await api(`/api/approvals/${held.approvalId}`, { key: token });
    await api(`/api/approvals/${held.approvalId}`, { key: token, body: { decision: 'approve', actionHash: approval.actionHash, decisionMs: 9000, evidenceViewed: true } });
  } else {
    say(`\n${bold('Your turn.')} Open ${cyan(url)}\n  Sign in as Guest Judge, PIN ${bold('1234')}, read the evidence and approve.\n`);
  }

  let status;
  for (;;) {
    status = await api(`/api/v1/approvals/${held.approvalId}`, { key: keys.rex });
    if (status.status !== 'PENDING') break;
    await sleep(1000);
  }
  if (!status.commitId) {
    say(`${status.status === 'EXECUTED' ? green(status.status) : red(status.status)}`);
    return finish(keys);
  }

  say(`${amber('APPROVED, NOT YET COMMITTED')} ${dim(status.commitId)}\n  No money has moved. It commits in ${WINDOW} s unless a person cancels it.`);
  if (AUTO === 'cancel') {
    const { token } = await api('/api/approver/login', { body: { tenant: 'banking', humanId: 'judge', pin: '1234' } });
    await api(`/api/commits/${status.commitId}`, { key: token, body: { note: 'Customer called: wrong account' } });
  } else if (!AUTO) {
    say(`  To stop it, press ${bold('Cancel this refund')} on the same screen.\n`);
  }
  let commit;
  for (;;) {
    commit = await api(`/api/v1/commits/${status.commitId}`, { key: keys.rex });
    if (commit.status !== 'WAITING') break;
    await sleep(1000);
  }
  if (commit.status === 'COMMITTED') say(`${green('COMMITTED')} ${dim(`ledger record #${commit.record}`)}\n  Nobody cancelled, so the money moved.`);
  else say(`${red('CANCELLED')} by ${bold(commit.cancelledBy)}\n  No money moved.`);
  return finish(keys, commit.status);
}

async function finish(keys, outcome) {
  const chain = await api('/api/chain');
  const steps = await api('/api/ledger/verify').catch(() => null);
  say(`\n${bold('The ledger')} ${steps?.valid === false ? red('does not verify') : green('verifies')} ${dim(`· signed with Ed25519 key ${String(chain.publicKey).slice(0, 16)}…`)}`);
  if (AUTO) {
    say(JSON.stringify({ outcome, verified: steps?.valid !== false }));
    stop(0);
  }
  say(dim(`\nAbhed keeps running at ${BASE}. Rex's key for your own tests: ${keys.rex}\nPress Ctrl+C to stop.`));
}

main().catch((e) => {
  say(red(e.message));
  stop(1);
});
