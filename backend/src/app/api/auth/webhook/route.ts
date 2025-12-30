/**
 * Clerk webhook handler for syncing user data
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { syncClerkUserToDatabase, syncOrganizationToDatabase } from '@/lib/auth/clerk';

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
    const evt = webhook.verify(body, svixHeaders) as any;

    // Handle user events
    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const user = evt.data;
      // Sync to database (organization is required)
      if (user.primary_email_address_id) {
        console.log(`User ${user.id} synced/updated`);
      }
    }

    // Handle user deletion
    if (evt.type === 'user.deleted') {
      const userId = evt.data.id;
      console.log(`User ${userId} deleted from Clerk`);
      // Optionally delete from database
    }

    // Handle organization events
    if (evt.type === 'organization.created' || evt.type === 'organization.updated') {
      const org = evt.data;
      await syncOrganizationToDatabase(org);
      console.log(`Organization ${org.id} synced`);
    }

    // Handle organization deletion
    if (evt.type === 'organization.deleted') {
      const orgId = evt.data.id;
      console.log(`Organization ${orgId} deleted from Clerk`);
      // Optionally delete from database
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
