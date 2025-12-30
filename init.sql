"""
Database initialization script for SheetBrain AI
Creates necessary tables and extensions for PostgreSQL
"""

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50) DEFAULT 'editor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document chunks for RAG
CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(255) PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT doc_chunks_org_id_idx UNIQUE(org_id, id)
);

-- Audit results
CREATE TABLE IF NOT EXISTS audit_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    formula VARCHAR(1000),
    cell_address VARCHAR(50),
    analysis JSONB,
    issues JSONB,
    suggestions JSONB,
    confidence_score FLOAT,
    duration_ms INTEGER,
    model_used VARCHAR(255),
    tokens_used JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User usage tracking
CREATE TABLE IF NOT EXISTS user_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    audits_this_month INTEGER DEFAULT 0,
    audits_this_year INTEGER DEFAULT 0,
    last_audit_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id VARCHAR(255),
    subscription_item_id VARCHAR(255),
    tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_org_id ON document_chunks(org_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_audit_results_user_id ON audit_results(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_org_id ON audit_results(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_created_at ON audit_results(created_at);
CREATE INDEX IF NOT EXISTS idx_user_usage_org_id ON user_usage(org_id);

-- Hybrid search function
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding vector(1536),
    match_count INT DEFAULT 10,
    org_id UUID DEFAULT NULL
)
RETURNS TABLE(id VARCHAR, content TEXT, score FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.content,
        COALESCE(
            1 - (dc.embedding <=> query_embedding) * 0.7 +
            COALESCE(
                ts_rank(
                    to_tsvector('english', dc.content),
                    websearch_to_tsquery('english', query_text)
                ) * 0.3,
                0
            ),
            0
        ) as score
    FROM document_chunks dc
    WHERE (org_id IS NULL OR dc.org_id = org_id)
    ORDER BY score DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
