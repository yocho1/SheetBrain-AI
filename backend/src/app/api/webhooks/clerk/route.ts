/**
 * Clerk Webhook Handler
 * Syncs user events from Clerk to Supabase database
 * 
 * Events handled:
 * - user.created: New user created in Clerk
 * - user.updated: User info updated
 * - user.deleted: User deleted
 * - organization.created: New organization
 * - organization.updated: Organization info changed
 * - organization.deleted: Organization deleted
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { upsertClerkUser, upsertOrganization } from '@/lib/db';
import { logError } from '@/lib/monitoring/axiom';

interface ClerkWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    const payload = await request.text();
    const headers = Object.fromEntries(request.headers);
    
    const wh = new Webhook(webhookSecret);
    const evt = wh.verify(payload, headers) as ClerkWebhookEvent;

    console.warn(`[Clerk Webhook] Event: ${evt.type}`);

    switch (evt.type) {
      case 'user.created': {
        const user = evt.data as {
          id: string;
          email_addresses?: Array<{ email_address?: string }>;
          first_name?: string;
          last_name?: string;
          primary_web3_wallet?: { web3_address?: string };
        };
        await upsertClerkUser(
          user.id,
          user.email_addresses?.[0]?.email_address || '',
          `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          user.primary_web3_wallet?.web3_address
        );
        console.warn(`[Clerk Webhook] User created: ${user.id}`);
        break;
      }

      case 'user.updated': {
        const user = evt.data as {
          id: string;
          email_addresses?: Array<{ email_address?: string }>;
          first_name?: string;
          last_name?: string;
        };
        await upsertClerkUser(
          user.id,
          user.email_addresses?.[0]?.email_address || '',
          `${user.first_name || ''} ${user.last_name || ''}`.trim()
        );
        console.warn(`[Clerk Webhook] User updated: ${user.id}`);
        break;
      }

      case 'user.deleted': {
        const user = evt.data as { id: string };
        // Optionally soft-delete or mark as inactive
        console.warn(`[Clerk Webhook] User deleted: ${user.id}`);
        break;
      }

      case 'organization.created': {
        const org = evt.data as { id: string; name?: string };
        await upsertOrganization(org.id, org.name);
        console.warn(`[Clerk Webhook] Organization created: ${org.id}`);
        break;
      }

      case 'organization.updated': {
        const org = evt.data as { id: string; name?: string };
        await upsertOrganization(org.id, org.name);
        console.warn(`[Clerk Webhook] Organization updated: ${org.id}`);
        break;
      }

      case 'organization.deleted': {
        const org = evt.data as { id: string };
        console.warn(`[Clerk Webhook] Organization deleted: ${org.id}`);
        // Organizations cascade-delete in DB
        break;
      }

      default:
        console.warn(`[Clerk Webhook] Unhandled event type: ${evt.type}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Clerk Webhook] Error:', error);
    await logError(error as Error, { context: 'clerk_webhook', webhook_event: 'unknown' });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
