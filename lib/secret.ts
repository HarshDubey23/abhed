/** Development-only fallback for a server secret. These strings are public, so production refuses to run on them. */
export function devSecret(fallback: string): string {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error('Set KAVACH_AGENT_SECRET (or KAVACH_SIGNING_SEED): refusing to use a public development secret in production.');
  }
  return fallback;
}
