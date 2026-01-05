/**
 * Stripe billing integration
 * Handles subscriptions, usage tracking, and webhooks
 * Now with PostgreSQL persistence
 */

import Stripe from 'stripe';
import { supabase } from '@/lib/db';

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
  // Check database first
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', orgId)
    .single();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { orgId },
  });

  // Save to database
  await supabase
    .from('subscriptions')
    .upsert({
      organization_id: orgId,
      stripe_customer_id: customer.id,
      plan: 'free',
      status: 'active',
    })
    .select();

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

  const subscriptionData: {
    organization_id: string;
    stripe_customer_id: string;
    stripe_subscription_id: string | null;
    plan: keyof typeof PLAN_LIMITS;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
  } = {
    organization_id: orgId,
    stripe_customer_id: customerId,
    stripe_subscription_id: null,
    plan: planId,
    status: 'active',
    current_period_start: null,
    current_period_end: null,
  };

  // Only create Stripe subscription for paid plans
  if (productId) {
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: productId }],
      metadata: { orgId },
    });

    subscriptionData.stripe_subscription_id = stripeSubscription.id;
    subscriptionData.status = stripeSubscription.status;
    subscriptionData.current_period_start = new Date(stripeSubscription.current_period_start * 1000).toISOString();
    subscriptionData.current_period_end = new Date(stripeSubscription.current_period_end * 1000).toISOString();
  }

  // Save to database
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, { onConflict: 'organization_id' })
    .select()
    .single();

  if (error) throw error;

  // Get usage for this month
  const monthYear = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabase
    .from('audit_usage')
    .select('count')
    .eq('organization_id', orgId)
    .eq('month_year', monthYear)
    .single();

  return {
    orgId,
    customerId,
    subscriptionId: data.stripe_subscription_id,
    plan: data.plan,
    status: data.status,
    currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
    usageThisMonth: usage?.count || 0,
    quotaLimit: PLAN_LIMITS[planId],
  };
}

/**
 * Get subscription status for an organization
 */
export async function getSubscription(orgId: string): Promise<SubscriptionStatus> {
  // Query database
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .single();

  // Get current month usage
  const monthYear = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabase
    .from('audit_usage')
    .select('count')
    .eq('organization_id', orgId)
    .eq('month_year', monthYear)
    .single();

  // Default to free plan if not found
  if (!sub) {
    return {
      orgId,
      customerId: '',
      subscriptionId: null,
      plan: 'free',
      status: 'active',
      currentPeriodEnd: null,
      usageThisMonth: usage?.count || 0,
      quotaLimit: PLAN_LIMITS.free,
    };
  }

  return {
    orgId,
    customerId: sub.stripe_customer_id || '',
    subscriptionId: sub.stripe_subscription_id,
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null,
    usageThisMonth: usage?.count || 0,
    quotaLimit: PLAN_LIMITS[sub.plan as keyof typeof PLAN_LIMITS],
  };
}

/**
 * Record usage for an organization
 */
export async function recordAuditUsage(orgId: string): Promise<void> {
  const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Increment usage in database
  const { data: existing } = await supabase
    .from('audit_usage')
    .select('count')
    .eq('organization_id', orgId)
    .eq('month_year', monthYear)
    .single();

  if (existing) {
    await supabase
      .from('audit_usage')
      .update({ 
        count: existing.count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', orgId)
      .eq('month_year', monthYear);
  } else {
    await supabase
      .from('audit_usage')
      .insert({
        organization_id: orgId,
        month_year: monthYear,
        count: 1,
      });
  }

  // Also report to Stripe metered billing if applicable
  const sub = await getSubscription(orgId);
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
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', orgId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.orgId;
      if (orgId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            stripe_subscription_id: null,
            cancel_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', orgId);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const orgId = invoice.metadata?.orgId;
      if (orgId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', orgId);
      }
      break;
    }

    default:
      console.warn(`Unhandled webhook event: ${event.type}`);
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
