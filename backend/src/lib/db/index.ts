/**
 * Database connection and query utilities
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get user profile with organization
 */
export async function getUserWithOrganization(userId: string) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('user_usage')
    .update({
      audits_this_month: supabase.rpc('increment', { 'x': 1 }),
      audits_this_year: supabase.rpc('increment', { 'x': 1 }),
      last_audit_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

/**
 * Save audit result
 */
export async function saveAuditResult(auditData: any) {
  const { data, error } = await supabase
    .from('audit_results')
    .insert([auditData]);

  if (error) throw error;
  return data;
}

/**
 * Get audit history
 */
export async function getAuditHistory(userId: string, limit = 10) {
  const { data, error } = await supabase
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
  const key = `sb_${Math.random().toString(36).substr(2, 32)}`;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));

  const { data, error } = await supabase
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

export default supabase;
