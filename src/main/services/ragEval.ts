import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { decryptString } from '../utils/encryption';

interface EvalLogEntry {
  timestamp: string;
  input: any;
  response: any;
}

async function evaluateRAGLogs() {
  const userDataDir = join(require('electron').app.getPath('userData')); // fallback when run as script outside electron may fail
  const logPath = join(userDataDir, 'rag-data', 'rag-eval-logs.jsonl');

  if (!existsSync(logPath)) {
    console.error('No evaluation logs found');
    return;
  }

  const secret = process.env.DATA_ENCRYPTION_KEY;

  const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
  const entries: EvalLogEntry[] = lines.map((l) => {
    const str = secret ? decryptString(l, secret) : l;
    return JSON.parse(str);
  });

  const total = entries.length;
  const avgSuggestions = entries.reduce((sum, e) => sum + (e.response.suggestions?.length || 0), 0) / total;
  const failureCount = entries.filter((e) => e.response.errorMessage).length;

  console.log('RAG Evaluation Metrics');
  console.log('----------------------');
  console.log('Total runs:', total);
  console.log('Average suggestions per run:', avgSuggestions.toFixed(2));
  console.log('Failures:', failureCount);
}

if (require.main === module) {
  evaluateRAGLogs();
}

export { evaluateRAGLogs };