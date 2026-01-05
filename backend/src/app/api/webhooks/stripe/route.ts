/**
 * Stripe webhook handler
 * POST /api/webhooks/stripe - Processes Stripe events
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { handleWebhookEvent, verifyWebhookSignature } from '@/lib/billing/stripe';
import { logBilling, logError, addBreadcrumb } from '@/lib/monitoring';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const body = await request.text();
    const event = verifyWebhookSignature(body, signature);

    if (!event) {
      await logError(new Error('Invalid Stripe webhook signature'), {
        endpoint: '/api/webhooks/stripe',
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    addBreadcrumb('Processing Stripe webhook', { eventType: event.type });

    // Process the event
    await handleWebhookEvent(event);

    // Log billing event
    const eventData = event.data.object as any;
    await logBilling({
      orgId: eventData.metadata?.orgId || 'unknown',
      event: event.type,
      customerId: eventData.customer,
      subscriptionId: eventData.subscription || eventData.id,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    await logError(error, { endpoint: '/api/webhooks/stripe' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}
