/**
 * Policy management API
 * GET /api/policies - list policies for org
 * POST /api/policies - add a policy (JSON)
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/auth/rate-limit';
import { addPolicy, listPolicies, seedDefaultPolicies } from '@/lib/policies/store';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const orgId = request.headers.get('x-user-org');

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await seedDefaultPolicies(orgId);
  const policies = await listPolicies(orgId);
  return NextResponse.json({ policies, count: policies.length });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const orgId = request.headers.get('x-user-org');

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitResponse = await rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => null);
  if (!body || !body.content) {
    return NextResponse.json(
      { error: 'Missing policy content' },
      { status: 400 }
    );
  }

  const policy = await addPolicy(orgId, {
    title: body.title || 'Policy',
    content: body.content,
    category: body.category,
    source: body.source || 'api',
  });

  return NextResponse.json({ success: true, policy }, { status: 201 });
}
