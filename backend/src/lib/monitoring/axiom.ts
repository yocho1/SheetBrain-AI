/**
 * Axiom structured logging configuration
 * Logs audit events, API requests, and operational data
 */

import { Axiom } from '@axiomhq/js';

const AXIOM_TOKEN = process.env.AXIOM_TOKEN;
const AXIOM_DATASET = process.env.AXIOM_DATASET || 'sheetbrain-audits';

let axiomClient: Axiom | null = null;

export function getAxiomClient(): Axiom | null {
  if (!AXIOM_TOKEN) {
    console.warn('Axiom token not configured, structured logging disabled');
    return null;
  }

  if (!axiomClient) {
    axiomClient = new Axiom({
      token: AXIOM_TOKEN,
      orgId: process.env.AXIOM_ORG_ID,
    });
  }

  return axiomClient;
}

/**
 * Base log structure
 */
interface BaseLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  environment: string;
  [key: string]: unknown;
}

/**
 * Send structured log to Axiom
 */
export async function log(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: Record<string, unknown>
) {
  const client = getAxiomClient();
  if (!client) {
    // Fallback to console
    if (level === 'error') {
      console.error(`[${level.toUpperCase()}] ${message}`, data);
    } else {
      console.warn(`[${level.toUpperCase()}] ${message}`, data);
    }
    return;
  }

  try {
    const logEntry: BaseLog = {
      timestamp: new Date().toISOString(),
      level,
      service: 'sheetbrain-backend',
      environment: process.env.NODE_ENV || 'development',
      message,
      ...data,
    };

    await client.ingest(AXIOM_DATASET, [logEntry]);
  } catch (error) {
    console.error('Axiom logging error:', error);
    if (level === 'error') {
      console.error(`[${level.toUpperCase()}] ${message}`, data);
    } else {
      console.warn(`[${level.toUpperCase()}] ${message}`, data);
    }
  }
}

/**
 * Log audit event with detailed context
 */
export async function logAudit(data: {
  userId: string;
  orgId: string;
  formulaCount: number;
  issuesFound: number;
  severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  duration: number;
  ragUsed: boolean;
  ragContextCount?: number;
  success: boolean;
  error?: string;
}) {
  return log('info', 'Audit completed', {
    event_type: 'audit',
    ...data,
  });
}

/**
 * Log API request
 */
export async function logApiRequest(data: {
  method: string;
  path: string;
  userId?: string;
  orgId?: string;
  statusCode: number;
  duration: number;
  error?: string;
}) {
  return log('info', 'API request', {
    event_type: 'api_request',
    ...data,
  });
}

/**
 * Log RAG retrieval
 */
export async function logRagRetrieval(data: {
  orgId: string;
  query: string;
  resultsCount: number;
  topScore: number;
  duration: number;
  sources: string[];
}) {
  return log('info', 'RAG retrieval', {
    event_type: 'rag_retrieval',
    ...data,
  });
}

/**
 * Log ingestion event
 */
export async function logIngestion(data: {
  userId: string;
  orgId: string;
  policyId: string;
  content: string;
  chunkCount: number;
  vectorsUpserted: boolean;
  duration: number;
  success: boolean;
  error?: string;
}) {
  return log('info', 'Document ingested', {
    event_type: 'ingestion',
    content_preview: data.content.substring(0, 200),
    ...data,
  });
}

/**
 * Log billing event
 */
export async function logBilling(data: {
  orgId: string;
  event: string;
  plan?: string;
  customerId?: string;
  subscriptionId?: string;
  amount?: number;
  currency?: string;
}) {
  return log('info', 'Billing event', {
    event_type: 'billing',
    ...data,
  });
}

/**
 * Log error with context
 */
export async function logError(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  return log('error', errorMessage, {
    event_type: 'error',
    error_stack: errorStack,
    ...context,
  });
}

/**
 * Flush pending logs (call before shutdown)
 */
export async function flushLogs() {
  const client = getAxiomClient();
  if (client) {
    await client.flush();
  }
}
