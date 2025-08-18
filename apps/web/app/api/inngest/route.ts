import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { dailyIntelligencePipeline, manualIntelligenceTrigger } from '@/lib/inngest/functions/daily-intelligence';
import { processEmbeddingQueue, manualEmbeddingProcess, backfillEmbeddings } from '@/lib/inngest/functions/process-embeddings';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dailyIntelligencePipeline,
    manualIntelligenceTrigger,
    processEmbeddingQueue,
    manualEmbeddingProcess,
    backfillEmbeddings
  ],
});