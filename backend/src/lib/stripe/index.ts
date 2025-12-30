/**
 * Stripe billing utilities
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY || '');

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(userData: {
  email: string;
  name?: string;
  userId: string;
}) {
  return stripe.customers.create({
    email: userData.email,
    name: userData.name,
    metadata: {
      userId: userData.userId,
    },
  });
}

/**
 * Create a subscription
 */
export async function createSubscription(customerId: string, priceId: string) {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price: priceId,
      },
    ],
  });
}

/**
 * Record usage for metered billing
 */
export async function recordUsage(
  subscriptionItemId: string,
  quantity: number = 1
): Promise<Stripe.UsageRecord> {
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: Math.floor(Date.now() / 1000),
    action: 'increment',
  });
}

/**
 * Get customer
 */
export async function getStripeCustomer(customerId: string) {
  return stripe.customers.retrieve(customerId);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  // Stripe SDK v15+: use cancel instead of del
  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Get subscription
 */
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Update subscription
 */
export async function updateSubscription(subscriptionId: string, params: Stripe.SubscriptionUpdateParams) {
  return stripe.subscriptions.update(subscriptionId, params);
}

/**
 * Create billing portal session
 */
export async function createBillingPortalSession(customerId: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/dashboard`,
  });
}

/**
 * Handle subscription updated event
 */
export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Update user subscription status in database
  const customerObj =
    subscription.customer && typeof subscription.customer === 'object' && 'deleted' in subscription.customer
      ? (subscription.customer as Stripe.Customer | Stripe.DeletedCustomer)
      : null;

  const metadata = customerObj && 'deleted' in customerObj && !customerObj.deleted ? customerObj.metadata : null;

  if (metadata?.userId) {
    // Update user tier based on subscription status
    console.log(`Updated subscription for user ${metadata.userId}`);
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(body: string, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  );
}

export default stripe;
