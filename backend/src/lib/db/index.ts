/**
 * Database connection and query utilities
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SupabaseClientType = ReturnType<typeof createClient> | null;

let supabaseClient: SupabaseClientType = null;

if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('Supabase credentials missing; database features will be disabled');
}

export const supabase = supabaseClient;

/**
 * Get user profile with organization
 */
export async function getUserWithOrganization(userId: string) {
  if (!supabase) throw new Error('Database not available');
  const { data, error } = await (supabase as any)
    .from('users')
    .select(
      `
      id,
      email,
      name,
      role,
      organization_id,
      organizations (
        id,
        name,
        domain
      )
    `
    )
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user usage statistics
 */
export async function getUserUsage(userId: string) {
  if (!supabase) return null;
  const { data, error } = await (supabase as any)
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Update audit count
 */
export async function incrementAuditCount(userId: string) {
  if (!supabase) return null;
  const { data, error } = await (supabase as any)
    .from('user_usage')
    .update({
      audits_this_month: (supabase as any).rpc('increment', { 'x': 1 }),
      audits_this_year: (supabase as any).rpc('increment', { 'x': 1 }),
      last_audit_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

/**
 * Save audit result
 */
export async function saveAuditResult(auditData: Record<string, unknown>) {
  if (!supabase) return null;
  const { data, error } = await (supabase as any)
    .from('audit_results')
    .insert([auditData]);

  if (error) throw error;
  return data;
}

/**
 * Get audit history
 */
export async function getAuditHistory(userId: string, limit = 10) {
  if (!supabase) return [];
  const { data, error } = await (supabase as any)
    .from('audit_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Create or update API key
 */
export async function createApiKey(userId: string, name: string, expiresAt?: Date) {
  if (!supabase) throw new Error('Database not available');
  const key = `sb_${Math.random().toString(36).substr(2, 32)}`;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));

  const { data, error } = await (supabase as any)
    .from('api_keys')
    .insert([
      {
        user_id: userId,
        key_hash: Buffer.from(hash).toString('hex'),
        name,
        expires_at: expiresAt?.toISOString(),
      },
    ])
    .select();

  if (error) throw error;
  return { ...data[0], key };
}

/**
 * Clerk → Supabase sync functions
 */

/**
 * Initialize or get organization by Clerk org ID
 */
export async function upsertOrganization(clerkOrgId: string, name?: string) {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from('organizations')
    .upsert(
      { clerk_org_id: clerkOrgId, name: name || clerkOrgId },
      { onConflict: 'clerk_org_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting organization:', error);
    return null;
  }
  return data;
}

/**
 * Sync user from Clerk to Supabase
 */
export async function upsertClerkUser(clerkUserId: string, email: string, name?: string, clerkOrgId?: string) {
  if (!supabase) return null;

  let orgId: string | null = null;
  if (clerkOrgId) {
    const org = await upsertOrganization(clerkOrgId);
    orgId = org?.id || null;
  }

  const { data, error } = await (supabase as any)
    .from('users')
    .upsert(
      { clerk_user_id: clerkUserId, email, name, organization_id: orgId },
      { onConflict: 'clerk_user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting user:', error);
    return null;
  }
  return data;
}

/**
 * Get organization by Clerk org ID
 */
export async function getOrganizationByClerkId(clerkOrgId: string) {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from('organizations')
    .select('*')
    .eq('clerk_org_id', clerkOrgId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching organization:', error);
  }
  return data || null;
}

/**
 * Database Persistence functions for Billing
 */

/**
 * Get subscription for organization
 */
export async function getSubscriptionFromDB(orgId: string) {
  if (!supabase) return null;

  const { data } = await (supabase as any)
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .single();

  return data;
}

/**
 * Create or update subscription
 */
export async function upsertSubscription(orgId: string, subscription: Record<string, unknown>) {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .upsert(
      { organization_id: orgId, ...subscription },
      { onConflict: 'organization_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting subscription:', error);
    return null;
  }
  return data;
}

/**
 * Get current month audit usage count
 */
export async function getMonthlyAuditCount(orgId: string): Promise<number> {
  if (!supabase) return 0;

  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await (supabase as any)
    .from('audit_usage')
    .select('count')
    .eq('organization_id', orgId)
    .eq('month_year', monthYear)
    .single();

  if (error && error.code === 'PGRST116') {
    return 0;
  }

  return data?.count || 0;
}

/**
 * Increment audit usage for current month
 */
export async function incrementAuditUsageDB(orgId: string) {
  if (!supabase) return;

  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const current = await getMonthlyAuditCount(orgId);

  await (supabase as any)
    .from('audit_usage')
    .upsert(
      {
        organization_id: orgId,
        month_year: monthYear,
        count: current + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,month_year' }
    );
}

/**
 * Database Persistence functions for Rate Limiting
 */

/**
 * Get or create rate limit bucket for organization
 */
export async function getRateLimitBucketDB(orgId: string) {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from('rate_limit_buckets')
    .select('*')
    .eq('organization_id', orgId)
    .single();

  if (error && error.code === 'PGRST116') {
    const resetTime = new Date(Date.now() + 60 * 1000);
    const { data: newBucket } = await (supabase as any)
      .from('rate_limit_buckets')
      .insert({
        organization_id: orgId,
        request_count: 0,
        window_reset_at: resetTime.toISOString(),
      })
      .select()
      .single();
    return newBucket;
  }

  return data;
}

/**
 * Increment and get request count in rate limit bucket
 */
export async function checkAndIncrementRequestCount(orgId: string): Promise<{ count: number; resetAt: Date } | null> {
  if (!supabase) return null;

  const bucket = await getRateLimitBucketDB(orgId);
  if (!bucket) return null;

  const now = new Date();
  const resetTime = new Date(bucket.window_reset_at);
  let currentCount = bucket.request_count;

  // Reset window if expired
  if (now > resetTime) {
    const newResetTime = new Date(now.getTime() + 60 * 1000);
    await (supabase as any)
      .from('rate_limit_buckets')
      .update({
        request_count: 1,
        window_reset_at: newResetTime.toISOString(),
      })
      .eq('organization_id', orgId);
    return { count: 1, resetAt: newResetTime };
  }

  // Increment count
  currentCount += 1;
  await (supabase as any)
    .from('rate_limit_buckets')
    .update({ request_count: currentCount })
    .eq('organization_id', orgId);

  return { count: currentCount, resetAt: resetTime };
}

/**
 * Policies and Audit History
 */

/**
 * Add policy for organization
 */
export async function addPolicyDB(orgId: string, title: string, content: string, category?: string) {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from('policies')
    .insert({
      organization_id: orgId,
      title,
      content,
      category,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding policy:', error);
    return null;
  }
  return data;
}

/**
 * Get all policies for organization
 */
export async function getPoliciesDB(orgId: string) {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from('policies')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching policies:', error);
    return [];
  }
  return data || [];
}

/**
 * Log audit result to database
 */
interface AuditLogInput {
  formulaCount: number;
  issuesFound: number;
  duration: number;
  ragUsed: boolean;
  ragContextCount?: number;
}

export async function logAuditToDB(orgId: string, userId: string | undefined, auditData: AuditLogInput) {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from('audit_logs')
    .insert({
      organization_id: orgId,
      user_id: userId,
      formula_count: auditData.formulaCount,
      compliant_count: auditData.issuesFound ? auditData.formulaCount - auditData.issuesFound : auditData.formulaCount,
      issues_found: auditData.issuesFound,
      duration_ms: auditData.duration,
      rag_used: auditData.ragUsed,
      rag_context_count: auditData.ragContextCount,
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging audit:', error);
    return null;
  }
  return data;
}

export default supabase;
