-- Migration: Add source column to policies table
-- Date: 2026-01-05
-- Description: Adds a source column to track where policies originated from

-- Add source column to policies table
ALTER TABLE policies
ADD COLUMN source TEXT DEFAULT 'imported';

-- Create index for faster queries by source
CREATE INDEX IF NOT EXISTS idx_policies_source ON policies(source);

-- Add comment to document the column
COMMENT ON COLUMN policies.source IS 'Source of the policy: imported, created, etc.';
