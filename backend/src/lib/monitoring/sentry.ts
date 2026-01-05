/**
 * Sentry error tracking configuration
 * Captures errors, performance metrics, and breadcrumbs
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NODE_ENV || 'development';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    
    // Performance monitoring
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Session replay sampling
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Ignore common errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
    
    // Add context to errors
    beforeSend(event, hint) {
      // Add user context from Clerk headers if available
      const error = hint.originalException;
      if (error instanceof Error) {
        console.error('Sentry captured error:', error.message);
      }
      return event;
    },
  });
}

/**
 * Capture an error with additional context
 */
export function captureError(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  
  if (error instanceof Error) {
    Sentry.captureException(error);
  } else {
    Sentry.captureMessage(String(error), { level: 'error' });
  }
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(userId: string, email?: string, orgId?: string) {
  Sentry.setUser({
    id: userId,
    email,
    orgId,
  });
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null);
}

export { Sentry };
