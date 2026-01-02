/**
 * DEBUG ENDPOINT: Check environment variable configuration
 * WARNING: Remove this in production!
 */
export async function GET() {
  const envVars = {
    // API Keys (show if set, hide actual values for security)
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? '✓ SET' : '✗ MISSING',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ SET' : '✗ MISSING',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✓ SET' : '✗ MISSING',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? '✓ SET' : '✗ MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ SET' : '✗ MISSING',
    
    // Monitoring
    SENTRY_DSN: process.env.SENTRY_DSN ? '✓ SET' : '✗ MISSING',
    POSTHOG_API_KEY: process.env.POSTHOG_API_KEY ? '✓ SET' : '✗ MISSING',
    AXIOM_TOKEN: process.env.AXIOM_TOKEN ? '✓ SET' : '✗ MISSING',
    AXIOM_DATASET: process.env.AXIOM_DATASET || 'NOT SET',
    
    // Billing
    STRIPE_API_KEY: process.env.STRIPE_API_KEY ? '✓ SET' : '✗ MISSING',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? '✓ SET' : '✗ MISSING',
    STRIPE_PRODUCT_ID: process.env.STRIPE_PRODUCT_ID || 'NOT SET',
    
    // Config
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    STRICT_AUDIT: process.env.STRICT_AUDIT || 'NOT SET (defaults to false)',
  };

  return Response.json(envVars, { status: 200 });
}
