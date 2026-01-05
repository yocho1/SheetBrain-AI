/**
 * Database-backed rate limiting middleware
 * Enforces per-org rate limits and subscription quotas
 * Replaces in-memory storage with PostgreSQL persistence
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getSubscription, hasQuotaRemaining } from '@/lib/billing/stripe';

interface RateLimitConfig {
  requests: number;
  window: number; // milliseconds
}

const DEFAULT_CONFIG: RateLimitConfig = {
  requests: process.env.RATE_LIMIT_REQUESTS
    ? parseInt(process.env.RATE_LIMIT_REQUESTS)
    : 100,
  window: process.env.RATE_LIMIT_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_WINDOW_MS)
    : 60000,
};

const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false';

/**
 * Get or create rate limit bucket from database
 */
async function getBucket(orgId: string, windowMs: number): Promise<{ count: number; resetAt: Date }> {
  const now = new Date();
  
  // Get existing bucket
  const { data: existing } = await supabase
    .from('rate_limit_buckets')
    .select('*')
    .eq('organization_id', orgId)
    .single();

  // If bucket exists and hasn't expired, return it
  if (existing && new Date(existing.window_reset_at) > now) {
    return {
      count: existing.request_count,
      resetAt: new Date(existing.window_reset_at),
    };
  }

  // Create new bucket or reset existing one
  const resetAt = new Date(now.getTime() + windowMs);
  const { data, error } = await supabase
    .from('rate_limit_buckets')
    .upsert({
      organization_id: orgId,
      request_count: 0,
      window_reset_at: resetAt.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'organization_id' })
    .select()
    .single();

  if (error) {
    console.error('Failed to create/reset rate limit bucket:', error);
    // Fail open
    return { count: 0, resetAt };
  }

  return {
    count: data.request_count,
    resetAt: new Date(data.window_reset_at),
  };
}

/**
 * Increment bucket count in database
 */
async function incrementBucket(orgId: string): Promise<void> {
  await supabase.rpc('increment_rate_limit', { org_id: orgId });
}

/**
 * Rate limit middleware (per-org, per-window)
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<NextResponse | null> {
  if (!RATE_LIMIT_ENABLED) return null;

  const orgId = request.headers.get('x-user-org');
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bucket = await getBucket(orgId, config.window);
    
    // Check if rate limit exceeded
    if (bucket.count >= config.requests) {
      const retryAfter = Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter,
        },
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

    // Increment bucket
    await incrementBucket(orgId);

    return null; // Allow request
  } catch (err) {
    console.warn('Rate limit check failed:', err);
    // Fail open on error
    return null;
  }
}

/**
 * Check subscription quota for an organization
 * Returns 429 if quota exceeded, null if allowed
 */
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
    // Fail open on error (allow request)
  }
  return null;
}

/**
 * Record usage for tracking (stores in audit_logs table)
 */
export async function recordUsage(
  orgId: string,
  userId: string,
  action: string,
  _metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // For audit actions, this is handled by the audit endpoint
    // For other actions, could store in a generic activity log
    if (action === 'audit') {
      // Skip - handled by audit endpoint
      return;
    }

    // Could add a generic activity_log table for other actions
    console.warn(`Usage recorded: ${orgId}/${userId}/${action}`);
  } catch (err) {
    console.warn('Failed to record usage:', err);
  }
}

/**
 * Get usage statistics from database
 */
export async function getUsageStats(
  orgId: string,
  userId?: string,
): Promise<UsageStats> {
  interface UsageStats {
    auditsThisMonth: number;
    totalAudits: number;
    monthYear: string;
  }
  try {
    // Get current month usage
    const monthYear = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from('audit_usage')
      .select('count')
      .eq('organization_id', orgId)
      .eq('month_year', monthYear)
      .single();

    // Get audit logs for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .gte('created_at', startOfMonth.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { count } = await query;

    return {
      auditsThisMonth: usage?.count || 0,
      totalAudits: count || 0,
      monthYear,
    } satisfies UsageStats;
  } catch (err) {
    console.warn('Failed to get usage stats:', err);
    return { auditsThisMonth: 0, totalAudits: 0, monthYear: '' } satisfies UsageStats;
  }
}

/**
 * Check if organization is rate limited
 */
export async function isRateLimited(
  orgId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<boolean> {
  if (!RATE_LIMIT_ENABLED) return false;

  try {
    const bucket = await getBucket(orgId, config.window);
    return bucket.count >= config.requests;
  } catch (err) {
    console.warn('Failed to check rate limit:', err);
    return false; // Fail open
  }
}

/**
 * Reset rate limit bucket for an organization (admin function)
 */
export async function resetRateLimit(orgId: string): Promise<void> {
  await supabase
    .from('rate_limit_buckets')
    .delete()
    .eq('organization_id', orgId);
}
