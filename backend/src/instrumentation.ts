/**
 * Next.js instrumentation hook
 * Initializes monitoring and observability tools on server startup
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentry } = await import('./lib/monitoring/sentry');
    initSentry();
    console.warn('✓ Sentry initialized');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const { initSentry } = await import('./lib/monitoring/sentry');
    initSentry();
    console.warn('✓ Sentry initialized (edge)');
  }
}
