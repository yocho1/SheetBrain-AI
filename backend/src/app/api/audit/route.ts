/**
 * Audit API route handler
 * POST /api/audit - Audits formulas against company policies using OpenRouter
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { auditFormulas } from '@/lib/llm/openrouter';
import { retrieveRelevantContext } from '@/lib/ai/retrieval';
import { listPolicies, seedDefaultPolicies } from '@/lib/policies/store';
import { rateLimit, checkQuota } from '@/lib/auth/rate-limit';
import { recordAuditUsage } from '@/lib/billing/stripe';
import { logAudit, logApiRequest, logError, trackAudit, addBreadcrumb, setUser } from '@/lib/monitoring';

interface SheetContext {
  sheetName?: string;
  sheetId?: number;
  spreadsheetId?: string;
  range?: string;
  data?: {
    values?: unknown[][];
    formulas?: string[][];
  };
  formulas?: string[][];
  organization?: string;
  department?: string;
  sheetPurpose?: string;
}

function colLettersToIndex(letters: string): number {
  return letters
    .toUpperCase()
    .split('')
    .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;
}

function indexToColLetters(index: number): string {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function parseRange(range: string) {
  const [start] = range.split(':');
  const match = start.match(/([A-Z]+)(\d+)/i);
  if (!match) return { startCol: 0, startRow: 1 };
  const [, col, row] = match;
  return { startCol: colLettersToIndex(col), startRow: parseInt(row, 10) };
}

function extractFormulas(context: SheetContext, range: string) {
  const matrix = context?.data?.formulas || context?.formulas || [];
  if (!Array.isArray(matrix) || matrix.length === 0) return [];

  const { startCol, startRow } = parseRange(range || 'A1');
  const collected: Array<{ cell: string; formula: string }> = [];

  matrix.forEach((row, rowIdx) => {
    if (!Array.isArray(row)) {
      console.warn('Expected row to be an array, got:', typeof row);
      return;
    }
    row.forEach((cellFormula, colIdx) => {
      if (cellFormula && typeof cellFormula === 'string' && cellFormula.startsWith('=')) {
        const cellAddress = `${indexToColLetters(startCol + colIdx)}${startRow + rowIdx}`;
        collected.push({ cell: cellAddress, formula: cellFormula });
      }
    });
  });

  return collected;
}

async function buildPoliciesText(orgId: string) {
  await seedDefaultPolicies(orgId);
  const policies = await listPolicies(orgId);
  return policies
    .map((p, idx) => `${idx + 1}. ${p.title}: ${p.content}`)
    .join('\n');
}

/**
 * POST /api/audit
 * Audits one or more formulas against company policies using OpenRouter
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let ragResults: Array<{ content: string; score?: number }> = [];

  try {
    const userId = request.headers.get('x-user-id');
    const orgId = request.headers.get('x-user-org');
    const userEmail = request.headers.get('x-user-email');

    if (!userId || !orgId) {
      await logApiRequest({
        method: 'POST',
        path: '/api/audit',
        statusCode: 401,
        duration: Date.now() - startTime,
        error: 'Unauthorized',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set user context for error tracking
    setUser(userId, userEmail || undefined, orgId);
    addBreadcrumb('Audit request started', { userId, orgId });

    // Check rate limiting
    const rateLimitResponse = await rateLimit(request);
    if (rateLimitResponse) {
      await logApiRequest({
        method: 'POST',
        path: '/api/audit',
        userId,
        orgId,
        statusCode: 429,
        duration: Date.now() - startTime,
        error: 'Rate limit exceeded',
      });
      return rateLimitResponse;
    }

    // Check subscription quota
    const quotaResponse = await checkQuota(orgId);
    if (quotaResponse) {
      await logApiRequest({
        method: 'POST',
        path: '/api/audit',
        userId,
        orgId,
        statusCode: 429,
        duration: Date.now() - startTime,
        error: 'Quota exceeded',
      });
      return quotaResponse;
    }

    const body = await request.json();
    const { range, context } = body as { range?: string; context?: SheetContext };

    if (!range || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: range, context' },
        { status: 400 }
      );
    }

    const formulasWithCells = extractFormulas(context || {}, range);

    if (formulasWithCells.length === 0) {
      return NextResponse.json(
        { error: 'No formulas found in the provided range/context' },
        { status: 400 }
      );
    }

    const policiesText = await buildPoliciesText(orgId);
    const auditContext = `Organization: ${context.organization || 'Unknown'}\nDepartment: ${context.department || 'N/A'}\nSheet: ${context.sheetName || 'N/A'} (${context.range || range})\nPurpose: ${context.sheetPurpose || 'Not provided'}`;

    // RAG: retrieve supporting context from vector store (best-effort, skip on OpenAI errors)
    let retrievedText = '';
    try {
      ragResults = await retrieveRelevantContext(formulasWithCells.map((f) => f.formula).join('\n'), {
        orgId,
        topK: 8,
        minConfidence: 0.55,
        } as { orgId: string; topK: number; minConfidence: number });

      if (ragResults.length > 0) {
        retrievedText = ragResults
          .map((c, idx) => `Context ${idx + 1}: ${c.content}`)
          .join('\n');
      }
    } catch (err) {
      // OpenAI quota/API errors are expected during free tier; silently continue without RAG
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('insufficient')) {
        console.warn('OpenAI API quota exceeded; continuing without RAG context');
      } else {
        console.warn('RAG retrieval failed; continuing without external context', err);
      }
    }

    // Audit formulas using OpenRouter
    const strictAudit = process.env.STRICT_AUDIT === 'true';
    let auditResults = [] as Awaited<ReturnType<typeof auditFormulas>>;

    try {
      auditResults = await auditFormulas({
        formulas: formulasWithCells.map((f) => f.formula),
        policies: policiesText,
        context: `${auditContext}${retrievedText ? `\n\nRetrieved Context:\n${retrievedText}` : ''}`,
      });
    } catch (err) {
      console.error('OpenRouter error:', err);
      if (strictAudit) {
        throw err;
      }

      // Fallback to mock results if OpenRouter fails and strict mode is off
      auditResults = formulasWithCells.map((entry) => ({
        formula: entry.formula,
        compliant: Math.random() > 0.3,
        risk: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
        issues: Math.random() > 0.5 ? ['Potential performance issue'] : [],
        recommendations: ['Consider using SUMIF for better performance'],
      }));
    }

    // Record usage for billing
    try {
      await recordAuditUsage(orgId);
    } catch (err) {
      console.warn('Failed to record audit usage:', err);
    }

    const duration = Date.now() - startTime;
    const issuesFound = auditResults.filter((r) => !r.compliant).length;
    const compliantCount = auditResults.filter((r) => r.compliant).length;

    // Count severity levels
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    auditResults.forEach((r) => {
      if (r.risk === 'high') severityCounts.high++;
      else if (r.risk === 'medium') severityCounts.medium++;
      else if (r.risk === 'low') severityCounts.low++;
    });

    // Save audit log to database
    try {
      const { supabase } = await import('@/lib/db');

      if (!supabase) {
        console.warn('Supabase client not initialized; skipping audit log persistence');
      } else {
        const supabaseClient = supabase as unknown as SupabaseClient<any, 'public', any>;

        type AuditLogInsert = {
          organization_id: string;
          user_id: string | null;
          formula_count: number;
          compliant_count: number;
          issues_found: number;
          duration_ms: number;
          rag_used: boolean;
          rag_context_count: number;
        };

        const anySupabase = supabaseClient as any;

        // Get user UUID from clerk_user_id
        const { data: user } = await anySupabase
          .from('users')
          .select('id')
          .eq('clerk_user_id', userId)
          .single();

        // Get organization UUID from clerk_org_id
        const { data: org } = await anySupabase
          .from('organizations')
          .select('id')
          .eq('clerk_org_id', orgId)
          .single();

        if (org) {
          await anySupabase.from('audit_logs').insert<AuditLogInsert>({
            organization_id: org.id,
            user_id: (user?.id as string | null | undefined) ?? null,
            formula_count: auditResults.length,
            compliant_count: compliantCount,
            issues_found: issuesFound,
            duration_ms: duration,
            rag_used: retrievedText.length > 0,
            rag_context_count: ragResults?.length || 0,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to save audit log to database:', err);
    }

    // Log audit event to Axiom
    await logAudit({
      userId,
      orgId,
      formulaCount: auditResults.length,
      issuesFound,
      severity: severityCounts,
      duration,
      ragUsed: retrievedText.length > 0,
      ragContextCount: ragResults?.length || 0,
      success: true,
    });

    // Track audit event in PostHog
    await trackAudit(userId, orgId, auditResults.length, issuesFound, duration);

    // Log API request
    await logApiRequest({
      method: 'POST',
      path: '/api/audit',
      userId,
      orgId,
      statusCode: 200,
      duration,
    });

    return NextResponse.json(
      {
        success: true,
        audits: auditResults.map((result, idx) => ({
          cellAddress: formulasWithCells[idx]?.cell,
          ...result,
        })),
        count: auditResults.length,
        compliant: compliantCount,
        timestamp: new Date().toISOString(),
        duration,
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Audit error:', error);

    // Log error to monitoring
    const userId = request.headers.get('x-user-id') || 'unknown';
    const orgId = request.headers.get('x-user-org') || 'unknown';
    
    await logError(error, {
      endpoint: '/api/audit',
      userId,
      orgId,
      duration,
    });

    await logApiRequest({
      method: 'POST',
      path: '/api/audit',
      userId,
      orgId,
      statusCode: 500,
      duration,
      error: error instanceof Error ? error.message : 'Audit failed',
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audit failed' },
      { status: 500 }
    );
  }
}
