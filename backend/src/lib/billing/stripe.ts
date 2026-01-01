/**
 * Stripe billing integration
 * Handles subscriptions, usage tracking, and webhooks
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface SubscriptionStatus {
  orgId: string;
  customerId: string;
  subscriptionId: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodEnd: Date | null;
  usageThisMonth: number;
  quotaLimit: number; // audits/month
}

// In-memory subscription cache (in production, use database)
const subscriptions: Map<string, SubscriptionStatus> = new Map();

const PLAN_LIMITS = {
  free: 10,
  pro: 1000,
  enterprise: -1, // unlimited
};

/**
 * Create or update a customer
 */
export async function getOrCreateCustomer(
  orgId: string,
  email: string,
  name: string
): Promise<string> {
  // Check cache first
  const existing = subscriptions.get(orgId);
  if (existing?.customerId) {
    return existing.customerId;
  }

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { orgId },
  });

  return customer.id;
}

/**
 * Create a subscription for an organization
 */
export async function createSubscription(
  orgId: string,
  customerId: string,
  planId: keyof typeof PLAN_LIMITS
): Promise<SubscriptionStatus> {
  const productId =
    planId === 'pro'
      ? process.env.STRIPE_PRODUCT_ID
      : planId === 'enterprise'
        ? process.env.STRIPE_ENTERPRISE_PRODUCT_ID
        : null;

  if (!productId && planId !== 'free') {
    throw new Error(`Product ID not configured for plan: ${planId}`);
  }

  let subscription: SubscriptionStatus = {
    orgId,
    customerId,
    subscriptionId: null,
    plan: planId,
    status: 'active',
    currentPeriodEnd: null,
    usageThisMonth: 0,
    quotaLimit: PLAN_LIMITS[planId],
  };

  // Only create Stripe subscription for paid plans
  if (productId) {
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: productId }],
      metadata: { orgId },
    });

    subscription.subscriptionId = stripeSubscription.id;
    subscription.status = stripeSubscription.status as any;
    subscription.currentPeriodEnd = new Date(
      stripeSubscription.current_period_end * 1000
    );
  }

  subscriptions.set(orgId, subscription);
  return subscription;
}

/**
 * Get subscription status for an organization
 */
export async function getSubscription(orgId: string): Promise<SubscriptionStatus> {
  const cached = subscriptions.get(orgId);
  if (cached) {
    return cached;
  }

  // Default to free plan if not found
  return {
    orgId,
    customerId: '',
    subscriptionId: null,
    plan: 'free',
    status: 'active',
    currentPeriodEnd: null,
    usageThisMonth: 0,
    quotaLimit: PLAN_LIMITS.free,
  };
}

/**
 * Record usage for an organization
 */
export async function recordAuditUsage(orgId: string): Promise<void> {
  const sub = await getSubscription(orgId);
  sub.usageThisMonth += 1;
  subscriptions.set(orgId, sub);

  // In production, also report to Stripe metered billing
  if (sub.subscriptionId && process.env.STRIPE_METERED_PRICE_ID) {
    try {
      await stripe.subscriptionItems.createUsageRecord(
        process.env.STRIPE_METERED_PRICE_ID,
        {
          quantity: 1,
          timestamp: Math.floor(Date.now() / 1000),
        }
      );
    } catch (err) {
      console.warn('Failed to record usage to Stripe:', err);
    }
  }
}

/**
 * Check if organization has quota remaining
 */
export async function hasQuotaRemaining(orgId: string): Promise<boolean> {
  const sub = await getSubscription(orgId);
  if (sub.quotaLimit === -1) {
    // Unlimited
    return true;
  }
  return sub.usageThisMonth < sub.quotaLimit;
}

/**
 * Get remaining quota
 */
export async function getRemainingQuota(orgId: string): Promise<number> {
  const sub = await getSubscription(orgId);
  if (sub.quotaLimit === -1) {
    return Infinity;
  }
  return Math.max(0, sub.quotaLimit - sub.usageThisMonth);
}

/**
 * Handle Stripe webhook event
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.orgId;
      if (orgId) {
        const existing = subscriptions.get(orgId) || {
          orgId,
          customerId: subscription.customer as string,
          usageThisMonth: 0,
        };
        Object.assign(existing, {
          subscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
        subscriptions.set(orgId, existing as SubscriptionStatus);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.orgId;
      if (orgId) {
        const existing = subscriptions.get(orgId);
        if (existing) {
          existing.status = 'canceled';
          existing.subscriptionId = null;
          subscriptions.set(orgId, existing);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const orgId = invoice.metadata?.orgId;
      if (orgId) {
        const existing = subscriptions.get(orgId);
        if (existing) {
          existing.status = 'past_due';
          subscriptions.set(orgId, existing);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return null;
  }
}
