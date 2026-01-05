/**
 * Clerk webhook handler for syncing user data
 * All supabase imports now include null checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { syncClerkUserToDatabase, syncOrganizationToDatabase } from '@/lib/auth/clerk';

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkOrganizationMembership {
  organization?: { id?: string };
}

interface ClerkUserEventData {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  organization_memberships?: ClerkOrganizationMembership[];
}

interface ClerkOrganizationEventData {
  id: string;
  name?: string;
  slug?: string;
}

type ClerkWebhookEvent =
  | { type: 'user.created' | 'user.updated' | 'user.deleted'; data: ClerkUserEventData }
  | { type: 'organization.created' | 'organization.updated' | 'organization.deleted'; data: ClerkOrganizationEventData }
  | { type: 'organizationMembership.created' | 'organizationMembership.updated'; data: { public_user_data?: { user_id?: string }; organization?: { id?: string } } };

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const svixHeaders = {
    'svix-id': request.headers.get('svix-id') || '',
    'svix-timestamp': request.headers.get('svix-timestamp') || '',
    'svix-signature': request.headers.get('svix-signature') || '',
  };

  const body = await request.text();

  const webhook = new Webhook(webhookSecret);

  try {
    const evt = webhook.verify(body, svixHeaders) as ClerkWebhookEvent;

    // Handle user events
    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const user = evt.data;
      
      // Get user's primary email
      const primaryEmail = user.email_addresses?.find(
        (email) => email.id === user.primary_email_address_id
      );
      
      if (primaryEmail) {
        // Get user's organization memberships
        const orgMemberships = user.organization_memberships || [];
        const primaryOrgId = orgMemberships[0]?.organization?.id || null;
        
        // Sync user to database
        await syncClerkUserToDatabase({
          id: user.id,
          email: primaryEmail.email_address,
          fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || null,
          username: user.username,
        }, primaryOrgId);
        
        console.warn(`User ${user.id} synced to database`);
      }
    }

    // Handle user deletion
    if (evt.type === 'user.deleted') {
      const userId = evt.data.id;
      const { supabase } = await import('@/lib/db');
      
      if (!supabase) {
        throw new Error('Supabase not configured');
      }
      
      // Soft delete or hard delete user from database
      await supabase
        .from('users')
        .delete()
        .eq('clerk_user_id', userId);
      
      console.warn(`User ${userId} deleted from database`);
    }

    // Handle organization events
    if (evt.type === 'organization.created' || evt.type === 'organization.updated') {
      const org = evt.data;
      await syncOrganizationToDatabase({
        id: org.id,
        name: org.name,
        slug: org.slug,
      });
      console.warn(`Organization ${org.id} synced to database`);
    }

    // Handle organization deletion
    if (evt.type === 'organization.deleted') {
      const orgId = evt.data.id;
      const { supabase } = await import('@/lib/db');
      
      if (!supabase) {
        throw new Error('Supabase not configured');
      }
      
      // Cascade delete organization (will delete related data)
      await supabase
        .from('organizations')
        .delete()
        .eq('clerk_org_id', orgId);
      
      console.warn(`Organization ${orgId} deleted from database`);
    }

    // Handle organization membership events
    if (evt.type === 'organizationMembership.created' || evt.type === 'organizationMembership.updated') {
      const membership = evt.data;
      const userId = membership.public_user_data?.user_id;
      const orgId = membership.organization?.id;
      
      if (userId && orgId) {
        const { supabase } = await import('@/lib/db');
        
        if (!supabase) {
          throw new Error('Supabase not configured');
        }
        
        // Update user's organization
        await supabase
          .from('users')
          .update({ 
            organization_id: orgId,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_user_id', userId);
        
        console.warn(`User ${userId} membership updated for org ${orgId}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    );
  }
}
