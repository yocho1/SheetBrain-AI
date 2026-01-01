/**
 * Billing management API
 * GET /api/billing/status - Get org subscription status
 * POST /api/billing/upgrade - Create checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSubscription, getOrCreateCustomer, createSubscription } from '@/lib/billing/stripe';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * GET /api/billing/status
 * Get subscription status for authenticated org
 */
export async function GET(request: NextRequest) {
  try {
    const orgId = request.headers.get('x-user-org');
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getSubscription(orgId);
    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Billing status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
