/**
 * Rate limiting middleware (dev-safe, in-memory fallback).
 */

import { NextRequest, NextResponse } from 'next/server';

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

// Simple in-memory bucket: { count, resetAt }
const buckets: Map<string, { count: number; resetAt: number }> = new Map();

function getBucket(key: string, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (existing && existing.resetAt > now) {
    return existing;
  }
  const bucket = { count: 0, resetAt: now + windowMs };
  buckets.set(key, bucket);
  return bucket;
}

/**
 * Rate limit middleware
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<NextResponse | null> {
  if (!RATE_LIMIT_ENABLED) return null;

  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = `rate_limit:${userId}`;
  const bucket = getBucket(key, config.window);
  bucket.count += 1;

  if (bucket.count > config.requests) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil((bucket.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((bucket.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return null; // Allow request
}

/**
 * Increment usage counter (in-memory, dev only)
 */
export async function recordUsage(userId: string, action: string): Promise<void> {
  if (!RATE_LIMIT_ENABLED) return;
  const key = `usage:${userId}:${action}`;
  const bucket = getBucket(key, 24 * 60 * 60 * 1000);
  bucket.count += 1;
}

/**
 * Get usage statistics (in-memory, dev only)
 */
export async function getUsageStats(userId: string, action: string): Promise<number> {
  if (!RATE_LIMIT_ENABLED) return 0;
  const key = `usage:${userId}:${action}`;
  return getBucket(key, 24 * 60 * 60 * 1000).count;
}

/**
 * Check if user is rate limited (in-memory)
 */
export async function isRateLimited(
  userId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<boolean> {
  if (!RATE_LIMIT_ENABLED) return false;
  const key = `rate_limit:${userId}`;
  const bucket = getBucket(key, config.window);
  return bucket.count > config.requests;
}
