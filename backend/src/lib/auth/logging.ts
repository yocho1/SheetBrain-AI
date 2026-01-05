/**
 * Logging and monitoring utilities
 */

import type { PostHog } from 'posthog-node';

// Optional Sentry import (only if package is available)
type SentryModule = typeof import('@sentry/nextjs') | null;
let Sentry: SentryModule = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sentry = require('@sentry/nextjs');
  if (process.env.SENTRY_DSN && Sentry) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  }
} catch (e) {
  console.warn('Sentry not available, error tracking disabled');
}

// Optional PostHog import
let posthog: PostHog | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PostHog } = require('posthog-node');
  posthog = new PostHog(process.env.POSTHOG_API_KEY || '', {
    host: 'https://us.posthog.com',
  });
} catch (e) {
  console.warn('PostHog not available, analytics disabled');
}

/**
 * Log audit event
 */
export async function logAuditEvent(event: {
  userId: string;
  orgId: string;
  formula: string;
  duration: number;
  success: boolean;
  model: string;
  tokens: { prompt: number; completion: number };
  confidence: number;
  appliedSuggestions: number;
}) {
  try {
    // Send to PostHog for product analytics
    if (posthog) {
      posthog.capture({
        distinctId: event.userId,
        event: 'formula_audited',
        properties: {
          org_id: event.orgId,
          duration_ms: event.duration,
          success: event.success,
          model_used: event.model,
          tokens_used: event.tokens.prompt + event.tokens.completion,
          confidence_score: event.confidence,
          suggestions_applied: event.appliedSuggestions,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Send to error tracking if failed
    if (!event.success && Sentry) {
      Sentry.captureMessage('Audit failed', 'error', {
        tags: {
          userId: event.userId,
          orgId: event.orgId,
        },
        extra: {
          formula: event.formula.substring(0, 100),
          duration: event.duration,
        },
      });
    }
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Log error with context
 */
export function logError(
  error: Error,
  context: Record<string, unknown>
): void {
  console.error('Error:', error);

  if (Sentry) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Log warning
 */
export function logWarning(message: string, context?: Record<string, unknown>): void {
  console.warn(message, context);

  if (Sentry) {
    Sentry.captureMessage(message, 'warning', {
      extra: context,
    });
  }
}

/**
 * Log info
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  console.warn(message, context);

  if (posthog) {
    posthog.capture({
      distinctId: 'system',
      event: 'system_event',
      properties: {
        message,
        ...context,
      },
    });
  }
}

/**
 * Flush pending events
 */
export async function flush(): Promise<void> {
  if (posthog) {
    await posthog.shutdown();
  }
  if (Sentry) {
    await Sentry.close(2000);
  }
}

export { posthog, Sentry };
