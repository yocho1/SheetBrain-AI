/**
 * Document ingestion API route
 * POST /api/ingest - Ingests policy documents for policy store (dev-safe)
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/auth/rate-limit';
import { addPolicy } from '@/lib/policies/store';
import { ingestDocument } from '@/lib/ai/retrieval';
import { logIngestion, logApiRequest, logError, trackIngestion, setUser, addBreadcrumb } from '@/lib/monitoring';

/**
 * POST /api/ingest
 * Ingests policy documents into the in-memory policy store for RAG
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const userId = request.headers.get('x-user-id');
    const orgId = request.headers.get('x-user-org');
    const userEmail = request.headers.get('x-user-email');

    if (!userId || !orgId) {
      await logApiRequest({
        method: 'POST',
        path: '/api/ingest',
        statusCode: 401,
        duration: Date.now() - startTime,
        error: 'Unauthorized',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    setUser(userId, userEmail || undefined, orgId);
    addBreadcrumb('Ingestion request started', { userId, orgId });

    // Check rate limiting
    const rateLimitResponse = await rateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const contentType = request.headers.get('content-type') || '';

    let title = 'Uploaded policy';
    let content = '';
    let category: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      category = (formData.get('category') as string) || undefined;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size exceeds 50MB limit' },
          { status: 400 }
        );
      }

      title = file.name || 'Uploaded policy';
      content = await file.text();
    } else {
      const json = await request.json().catch(() => null);
      if (!json || !json.content) {
        return NextResponse.json(
          { error: 'No content provided for ingestion' },
          { status: 400 }
        );
      }

      title = json.title || 'Uploaded policy';
      content = json.content;
      category = json.category;
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is empty' }, { status: 400 });
    }

    const policy = await addPolicy(orgId, {
      title,
      content,
      category,
      source: 'upload',
    });

    // Persist to vector store for RAG (best-effort)
    let vectorsUpserted = false;
    let chunkCount = 0;
    try {
      await ingestDocument(content, {
        orgId,
        title,
        source: 'upload',
      });
      vectorsUpserted = true;
      chunkCount = Math.ceil(content.length / 1000); // Approximate chunk count
    } catch (err) {
      console.warn('Vector ingestion failed; continuing with in-memory policy only', err);
    }

    const duration = Date.now() - startTime;

    // Save ingestion log to database
    try {
      const { supabase } = await import('@/lib/db');
      
      if (!supabase) {
        console.warn('Supabase not configured - skipping ingestion log');
        return NextResponse.json({ success: true, policyId: title });
      }
      
      // Get user UUID from clerk_user_id
      const { data: user } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      // Get organization UUID from clerk_org_id  
      const { data: org } = await (supabase as any)
        .from('organizations')
        .select('id')
        .eq('clerk_org_id', orgId)
        .single();

      if (org) {
        await (supabase as any).from('ingestion_logs').insert({
          organization_id: org.id,
          user_id: user?.id || null,
          policy_id: policy.id,
          document_size: content.length,
          chunk_count: chunkCount,
          vectors_upserted: vectorsUpserted ? chunkCount : 0,
          duration_ms: duration,
          success: true,
        });
      }
    } catch (err) {
      console.warn('Failed to save ingestion log to database:', err);
    }

    // Log ingestion event
    await logIngestion({
      userId,
      orgId,
      policyId: policy.id,
      content,
      chunkCount,
      vectorsUpserted,
      duration,
      success: true,
    });

    // Track in PostHog
    await trackIngestion(userId, orgId, content.length, true);

    // Log API request
    await logApiRequest({
      method: 'POST',
      path: '/api/ingest',
      userId,
      orgId,
      statusCode: 201,
      duration,
    });

    return NextResponse.json(
      {
        success: true,
        policy,
        timestamp: new Date().toISOString(),
        duration,
      },
      { status: 201 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Ingestion error:', error);

    const userId = request.headers.get('x-user-id') || 'unknown';
    const orgId = request.headers.get('x-user-org') || 'unknown';

    // Log error
    await logError(error, {
      endpoint: '/api/ingest',
      userId,
      orgId,
      duration,
    });

    await logApiRequest({
      method: 'POST',
      path: '/api/ingest',
      userId,
      orgId,
      statusCode: 500,
      duration,
      error: error instanceof Error ? error.message : 'Ingestion failed',
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
