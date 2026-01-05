-- SheetBrain Database Schema
-- Deploy to Supabase using the SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table (replaces in-memory storage)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  status TEXT DEFAULT 'active', -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit usage tracking (replaces in-memory usage Map)
CREATE TABLE IF NOT EXISTS audit_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- 'YYYY-MM' format
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, month_year)
);

-- Rate limit buckets (replaces in-memory request tracking)
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_count INTEGER DEFAULT 0,
  window_reset_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies (company compliance policies)
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 'formula', 'naming', 'data_validation', etc.
  source TEXT DEFAULT 'imported', -- 'imported', 'created', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs (detailed audit history)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  formula_count INTEGER,
  compliant_count INTEGER,
  issues_found INTEGER,
  duration_ms INTEGER,
  rag_used BOOLEAN DEFAULT FALSE,
  rag_context_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ingestion logs (policy document ingestion)
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  document_size INTEGER,
  chunk_count INTEGER,
  vectors_upserted INTEGER,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_usage_organization_id ON audit_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_organization_id ON rate_limit_buckets(organization_id);
CREATE INDEX IF NOT EXISTS idx_policies_organization_id ON policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_organization_id ON ingestion_logs(organization_id);

-- Database functions for atomic operations

/**
 * Increment audit usage counter for an organization
 * Automatically creates a new record if it doesn't exist
 */
CREATE OR REPLACE FUNCTION increment_audit_usage(org_id UUID, month TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_usage (organization_id, month_year, count, created_at, updated_at)
  VALUES (org_id, month, 1, NOW(), NOW())
  ON CONFLICT (organization_id, month_year)
  DO UPDATE SET
    count = audit_usage.count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

/**
 * Increment rate limit bucket counter
 * Atomically increments the request count
 */
CREATE OR REPLACE FUNCTION increment_rate_limit(org_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE rate_limit_buckets
  SET 
    request_count = request_count + 1,
    updated_at = NOW()
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Clean up expired rate limit buckets
 * Run this periodically to remove old data
 */
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_buckets
  WHERE window_reset_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

/**
 * Get organization summary statistics
 */
CREATE OR REPLACE FUNCTION get_org_stats(org_id UUID)
RETURNS TABLE(
  total_users BIGINT,
  total_policies BIGINT,
  total_audits BIGINT,
  audits_this_month INTEGER,
  plan TEXT,
  subscription_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users WHERE organization_id = org_id),
    (SELECT COUNT(*) FROM policies WHERE organization_id = org_id),
    (SELECT COUNT(*) FROM audit_logs WHERE organization_id = org_id),
    (SELECT COALESCE(SUM(count), 0)::INTEGER FROM audit_usage 
     WHERE organization_id = org_id 
     AND month_year = TO_CHAR(NOW(), 'YYYY-MM')),
    (SELECT plan FROM subscriptions WHERE organization_id = org_id),
    (SELECT status FROM subscriptions WHERE organization_id = org_id);
END;
$$ LANGUAGE plpgsql;

