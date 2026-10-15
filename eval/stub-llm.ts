import type { ChatMessage, ChatResult } from '../lib/llm';

/**
 * Stand-in for lib/llm during the evaluation. The "model" proposes exactly the tool calls the harness puts in
 * `stub.calls`, so the evaluation measures the gate, not a model's judgement. Llama Prompt Guard is off
 * (returns null, as it does in CI without keys): task text is screened by the pattern scanner only.
 */
export const stub: { calls: { name: string; args: Record<string, unknown> }[] } = { calls: [] };

export const DEFAULT_MODEL = 'eval-stub-model';
export const GUARD_MODEL = 'eval-stub-guard';
export const INR_PER_TOKEN = 0;
export const llmAvailable = () => true;

export async function chat(_body: { messages: ChatMessage[]; tools?: unknown[] }): Promise<ChatResult> {
  const calls = stub.calls;
  return {
    message: {
      role: 'assistant',
      content: calls.length ? null : 'Done.',
      tool_calls: calls.map((c, i) => ({ id: `call_${i}`, type: 'function' as const, function: { name: c.name, arguments: JSON.stringify(c.args) } })),
    },
    tokens: 0,
    costInr: 0,
    model: DEFAULT_MODEL,
    ms: 0,
  };
}

export async function promptGuard(_text: string): Promise<{ label: string; malicious: boolean } | null> {
  return null;
}
