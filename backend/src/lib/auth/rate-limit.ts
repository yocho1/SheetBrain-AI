/**
 * Database-backed rate limiting and quota helpers.
 * Fail-open when supabase is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getSubscription, hasQuotaRemaining } from '@/lib/billing/stripe';

interface RateLimitConfig {
  requests: number;
  window: number; // milliseconds
}

interface UsageStats {
  auditsThisMonth: number;
  totalAudits: number;
  monthYear: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  requests: process.env.RATE_LIMIT_REQUESTS ? parseInt(process.env.RATE_LIMIT_REQUESTS) : 100,
  window: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : 60000,
};

const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false';

async function getBucket(orgId: string, windowMs: number): Promise<{ count: number; resetAt: Date }> {
  const fallback = { count: 0, resetAt: new Date(Date.now() + windowMs) };
  if (!supabase) return fallback;

  const now = new Date();
  const { data: existing } = await (supabase as any)
    .from('rate_limit_buckets')
    .select('*')
    .eq('organization_id', orgId)
    .single();

  if (existing && new Date(existing.window_reset_at) > now) {
    return { count: existing.request_count, resetAt: new Date(existing.window_reset_at) };
  }

  const resetAt = new Date(now.getTime() + windowMs);
  const { data, error } = await (supabase as any)
    .from('rate_limit_buckets')
    .upsert(
      {
        organization_id: orgId,
        request_count: 0,
        window_reset_at: resetAt.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'organization_id' }
    )
    .select()
    .single();

  if (error) {
    console.warn('Failed to create/reset rate limit bucket:', error);
    return fallback;
  }

  return { count: data.request_count, resetAt: new Date(data.window_reset_at) };
}

async function incrementBucket(orgId: string): Promise<void> {
  if (!supabase) return;
  await (supabase as any).rpc('increment_rate_limit', { org_id: orgId });
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<NextResponse | null> {
  if (!RATE_LIMIT_ENABLED) return null;

  const orgId = request.headers.get('x-user-org');
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const bucket = await getBucket(orgId, config.window);
    if (bucket.count >= config.requests) {
      const retryAfter = Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.requests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': bucket.resetAt.toISOString(),
          },
        }
      );
    }

    await incrementBucket(orgId);
    return null;
  } catch (err) {
    console.warn('Rate limit check failed:', err);
    return null;
  }
}

export async function checkQuota(orgId: string): Promise<NextResponse | null> {
  try {
    const hasQuota = await hasQuotaRemaining(orgId);
    if (!hasQuota) {
      const sub = await getSubscription(orgId);
      return NextResponse.json(
        {
          error: 'Usage quota exceeded',
          plan: sub.plan,
          limit: sub.quotaLimit,
          used: sub.usageThisMonth,
          message: `Your ${sub.plan} plan allows ${sub.quotaLimit} audits/month. Upgrade to continue.`,
        },
        { status: 429 }
      );
    }
  } catch (err) {
    console.warn('Failed to check quota:', err);
  }
  return null;
}

export async function recordUsage(
  orgId: string,
  userId: string,
  action: string,
  _metadata?: Record<string, unknown>
): Promise<void> {
  try {
    if (action === 'audit') return;
    console.warn(`Usage recorded: ${orgId}/${userId}/${action}`);
  } catch (err) {
    console.warn('Failed to record usage:', err);
  }
}

export async function getUsageStats(orgId: string, userId?: string): Promise<UsageStats> {
  const monthYear = new Date().toISOString().slice(0, 7);
  const fallback: UsageStats = { auditsThisMonth: 0, totalAudits: 0, monthYear };

  if (!supabase) return fallback;

  try {
    const { data: usage } = await (supabase as any)
      .from('audit_usage')
      .select('count')
      .eq('organization_id', orgId)
      .eq('month_year', monthYear)
      .single();

    let query = (supabase as any)
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { count } = await query;
    return { auditsThisMonth: usage?.count || 0, totalAudits: count || 0, monthYear } as UsageStats;
  } catch (err) {
    console.warn('Failed to get usage stats:', err);
    return fallback;
  }
}

export async function isRateLimited(orgId: string, config: RateLimitConfig = DEFAULT_CONFIG): Promise<boolean> {
  try {
    const bucket = await getBucket(orgId, config.window);
    return bucket.count >= config.requests;
  } catch (err) {
    console.warn('isRateLimited failed:', err);
    return false;
  }
}
