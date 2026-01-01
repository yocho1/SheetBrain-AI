/**
 * Stripe webhook handler
 * POST /api/webhooks/stripe - Processes Stripe events
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookEvent, verifyWebhookSignature } from '@/lib/billing/stripe';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const body = await request.text();
    const event = verifyWebhookSignature(body, signature);

    if (!event) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process the event
    await handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}
