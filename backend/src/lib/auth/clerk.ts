/**
 * Clerk authentication client setup
 */

import { createClerkClient } from '@clerk/backend';

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is not set');
}

export const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Get user from Clerk
 */
export async function getClerkUser(userId: string) {
  try {
    const user = await clerk.users.getUser(userId);
    return user;
  } catch (error) {
    console.error('Failed to get Clerk user:', error);
    throw error;
  }
}

/**
 * Get user's organizations from Clerk
 */
export async function getUserOrganizations(userId: string) {
  try {
    // Clerk v2: list memberships via getOrganizationMembershipList
    const { data } = await clerk.users.getOrganizationMembershipList({ userId });
    return data;
  } catch (error) {
    console.error('Failed to get user organizations:', error);
    return [];
  }
}

/**
 * Create user in database from Clerk user
 */
export interface ClerkUserPayload {
  id: string;
  email?: string;
  emailAddresses?: Array<{ emailAddress?: string }>;
  fullName?: string | null;
  username?: string | null;
}

export async function syncClerkUserToDatabase(clerkUser: ClerkUserPayload, orgId: string | null) {
  const { supabase } = await import('@/lib/db');
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const userData = {
    clerk_user_id: clerkUser.id,
    email: clerkUser.email || clerkUser.emailAddresses?.[0]?.emailAddress,
    name: clerkUser.fullName || clerkUser.username,
    organization_id: orgId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .from('users')
    .upsert(userData, { onConflict: 'clerk_user_id' })
    .select();

  if (error) {
    console.error('Failed to sync user to database:', error);
    throw error;
  }

  return data?.[0];
}

/**
 * Sync organization from Clerk
 */
export interface ClerkOrganizationPayload {
  id: string;
  name?: string;
  slug?: string;
}

export async function syncOrganizationToDatabase(clerkOrg: ClerkOrganizationPayload) {
  const { supabase } = await import('@/lib/db');
  
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const orgData = {
    clerk_org_id: clerkOrg.id,
    name: clerkOrg.name,
    slug: clerkOrg.slug,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .from('organizations')
    .upsert(orgData, { onConflict: 'clerk_org_id' })
    .select();

  if (error) {
    console.error('Failed to sync organization to database:', error);
    throw error;
  }

  return data?.[0];
}
