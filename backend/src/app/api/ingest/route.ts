/**
 * Document ingestion API route
 * POST /api/ingest - Ingests policy documents for policy store (dev-safe)
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/auth/rate-limit';
import { addPolicy } from '@/lib/policies/store';

/**
 * POST /api/ingest
 * Ingests policy documents into the in-memory policy store for RAG
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const userId = request.headers.get('x-user-id');
    const orgId = request.headers.get('x-user-org');

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limiting
    const rateLimitResponse = await rateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const contentType = request.headers.get('content-type') || '';

    let title = 'Uploaded policy';
    let content = '';
    let department = 'general';
    let tags: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      department = (formData.get('department') as string) || 'general';
      tags = JSON.parse((formData.get('tags') as string) || '[]');

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
      department = json.department || 'general';
      tags = json.tags || [];
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is empty' }, { status: 400 });
    }

    const policy = addPolicy(orgId, {
      title,
      content,
      department,
      tags,
      source: 'upload',
    });

    return NextResponse.json(
      {
        success: true,
        policy,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
