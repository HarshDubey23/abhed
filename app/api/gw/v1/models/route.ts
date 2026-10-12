import { json } from '@/lib/api';
import { DEFAULT_MODEL } from '@/lib/llm';

export const dynamic = 'force-dynamic';

/** OpenAI-compatible model list, so SDKs and tools that probe it accept the Abhed gateway. */
export const GET = () => json({ object: 'list', data: [{ id: DEFAULT_MODEL, object: 'model', owned_by: 'abhed-gateway' }] });
