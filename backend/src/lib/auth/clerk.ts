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
export async function syncClerkUserToDatabase(clerkUser: any, orgId: string) {
  const { supabase } = await import('@/lib/db');

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: clerkUser.fullName || clerkUser.username,
        organization_id: orgId,
        role: 'editor', // default role
      },
      { onConflict: 'id' }
    )
    .select();

  if (error) {
    console.error('Failed to sync user to database:', error);
    throw error;
  }

  return data[0];
}

/**
 * Sync organization from Clerk
 */
export async function syncOrganizationToDatabase(clerkOrg: any) {
  const { supabase } = await import('@/lib/db');

  const { data, error } = await supabase
    .from('organizations')
    .upsert(
      {
        id: clerkOrg.id,
        name: clerkOrg.name,
        domain: clerkOrg.publicMetadata?.domain,
      },
      { onConflict: 'id' }
    )
    .select();

  if (error) {
    console.error('Failed to sync organization to database:', error);
    throw error;
  }

  return data[0];
}
