/**
 * PostHog analytics configuration
 * Tracks user events, feature usage, and product analytics
 */

import { PostHog } from 'posthog-node';

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com';

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  if (!POSTHOG_API_KEY) {
    console.warn('PostHog API key not configured, analytics disabled');
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 20, // Flush after 20 events
      flushInterval: 10000, // Flush every 10 seconds
    });
  }

  return posthogClient;
}

/**
 * Track an event
 */
export async function trackEvent(
  userId: string,
  eventName: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  try {
    client.capture({
      distinctId: userId,
      event: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('PostHog tracking error:', error);
  }
}

/**
 * Identify a user with properties
 */
export async function identifyUser(
  userId: string,
  properties: {
    email?: string;
    orgId?: string;
    plan?: string;
    [key: string]: unknown;
  }
) {
  const client = getPostHogClient();
  if (!client) return;

  try {
    client.identify({
      distinctId: userId,
      properties,
    });
  } catch (error) {
    console.error('PostHog identify error:', error);
  }
}

/**
 * Track page view
 */
export async function trackPageView(
  userId: string,
  url: string,
  properties?: Record<string, unknown>
) {
  return trackEvent(userId, '$pageview', {
    $current_url: url,
    ...properties,
  });
}

/**
 * Track audit event
 */
export async function trackAudit(
  userId: string,
  orgId: string,
  formulaCount: number,
  issuesFound: number,
  duration: number
) {
  return trackEvent(userId, 'audit_completed', {
    orgId,
    formula_count: formulaCount,
    issues_found: issuesFound,
    duration_ms: duration,
  });
}

/**
 * Track ingestion event
 */
export async function trackIngestion(
  userId: string,
  orgId: string,
  documentSize: number,
  success: boolean
) {
  return trackEvent(userId, 'document_ingested', {
    orgId,
    document_size: documentSize,
    success,
  });
}

/**
 * Flush pending events (call before shutdown)
 */
export async function flushEvents() {
  const client = getPostHogClient();
  if (client) {
    await client.shutdown();
  }
}
