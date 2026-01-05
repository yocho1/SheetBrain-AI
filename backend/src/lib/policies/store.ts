/**
 * Database-backed policy store for organization compliance policies
 * Replaces in-memory storage with PostgreSQL persistence
 */

import { supabase } from '@/lib/db';
import crypto from 'crypto';

export interface Policy {
  id: string;
  orgId: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
  source?: string;
}

export interface PolicyInput {
  title: string;
  content: string;
  category?: string;
  source?: string;
}

/**
 * List all policies for an organization
 */
export async function listPolicies(orgId: string): Promise<Policy[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any)
    .from('policies')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to list policies:', error);
    return [];
  }

  type PolicyRow = {
    id: string;
    organization_id: string;
    title: string;
    content: string;
    category?: string;
    created_at: string;
    updated_at?: string;
    source?: string;
  };

  return (data || []).map((row: PolicyRow) => ({
    id: row.id,
    orgId: row.organization_id,
    title: row.title,
    content: row.content,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source,
  }));
}

/**
 * Add a new policy for an organization
 */
export async function addPolicy(orgId: string, input: PolicyInput): Promise<Policy> {
  const policyData = {
    id: crypto.randomUUID(),
    organization_id: orgId,
    title: input.title,
    content: input.content,
    category: input.category,
    source: input.source,
  };

  if (!supabase) throw new Error('Database not available');
  const { data, error } = await (supabase as any)
    .from('policies')
    .insert(policyData)
    .select()
    .single();

  if (error) {
    console.error('Failed to add policy:', error);
    throw error;
  }

  return {
    id: data.id,
    orgId: data.organization_id,
    title: data.title,
    content: data.content,
    category: data.category,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    source: data.source,
  };
}

/**
 * Get a single policy by ID
 */
export async function getPolicy(orgId: string, policyId: string): Promise<Policy | null> {
  if (!supabase) return null;
  const { data, error } = await (supabase as any)
    .from('policies')
    .select('*')
    .eq('id', policyId)
    .eq('organization_id', orgId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    orgId: data.organization_id,
    title: data.title,
    content: data.content,
    category: data.category,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    source: data.source,
  };
}

/**
 * Update an existing policy
 */
export async function updatePolicy(
  orgId: string,
  policyId: string,
  updates: Partial<PolicyInput>
): Promise<Policy> {
  if (!supabase) throw new Error('Database not available');
  const { data, error } = await (supabase as any)
    .from('policies')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', policyId)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update policy:', error);
    throw error;
  }

  return {
    id: data.id,
    orgId: data.organization_id,
    title: data.title,
    content: data.content,
    category: data.category,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    source: data.source,
  };
}

/**
 * Delete a policy
 */
export async function deletePolicy(orgId: string, policyId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await (supabase as any)
    .from('policies')
    .delete()
    .eq('id', policyId)
    .eq('organization_id', orgId);

  if (error) {
    console.error('Failed to delete policy:', error);
    return false;
  }

  return true;
}

/**
 * Seed default policies for a new organization
 */
export async function seedDefaultPolicies(orgId: string): Promise<void> {
  // Check if organization already has policies
  const existing = await listPolicies(orgId);
  if (existing.length > 0) {
    return; // Already seeded
  }

  // Add default policy
  await addPolicy(orgId, {
    title: 'Default formula policies',
    content: `1) Avoid volatile functions (NOW, TODAY, RAND) in static reports.
2) Use named ranges for clarity instead of absolute references when possible.
3) Limit nesting depth to three levels for maintainability.
4) Wrap external data references with error handling.
5) Prefer SUMIF/COUNTIF over array formulas for performance.
6) No circular references allowed without approvals.
7) Always include IFERROR for user-facing outputs.`,
    category: 'formula',
    source: 'builtin',
  });

  console.warn(`Default policies seeded for organization ${orgId}`);
}

/**
 * Search policies by keyword
 */
export async function searchPolicies(orgId: string, keyword: string): Promise<Policy[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any)
    .from('policies')
    .select('*')
    .eq('organization_id', orgId)
    .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to search policies:', error);
    return [];
  }

  type PolicyRow = {
    id: string;
    organization_id: string;
    title: string;
    content: string;
    category?: string;
    created_at: string;
    updated_at?: string;
    source?: string;
  };

  return (data || []).map((row: PolicyRow) => ({
    id: row.id,
    orgId: row.organization_id,
    title: row.title,
    content: row.content,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source,
  }));
}
