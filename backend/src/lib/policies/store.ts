/**
 * Lightweight in-memory policy store keyed by orgId.
 * Keeps server runtime state only; suitable for development/demo.
 */

import crypto from 'crypto';

export interface Policy {
  id: string;
  orgId: string;
  title: string;
  content: string;
  department?: string;
  tags?: string[];
  createdAt: string;
  source?: string;
}

export interface PolicyInput {
  title: string;
  content: string;
  department?: string;
  tags?: string[];
  source?: string;
}

const policyStore: Map<string, Policy[]> = new Map();

function getOrgPolicies(orgId: string): Policy[] {
  if (!policyStore.has(orgId)) {
    policyStore.set(orgId, []);
  }
  return policyStore.get(orgId)!;
}

export function listPolicies(orgId: string): Policy[] {
  return [...getOrgPolicies(orgId)];
}

export function addPolicy(orgId: string, input: PolicyInput): Policy {
  const policy: Policy = {
    id: crypto.randomUUID(),
    orgId,
    title: input.title,
    content: input.content,
    department: input.department,
    tags: input.tags || [],
    createdAt: new Date().toISOString(),
    source: input.source,
  };

  const orgPolicies = getOrgPolicies(orgId);
  orgPolicies.unshift(policy);
  policyStore.set(orgId, orgPolicies.slice(0, 200)); // cap in-memory history

  return policy;
}

export function seedDefaultPolicies(orgId: string): void {
  if (getOrgPolicies(orgId).length > 0) return;

  addPolicy(orgId, {
    title: 'Default formula policies',
    content: `1) Avoid volatile functions (NOW, TODAY, RAND) in static reports.
2) Use named ranges for clarity instead of absolute references when possible.
3) Limit nesting depth to three levels for maintainability.
4) Wrap external data references with error handling.
5) Prefer SUMIF/COUNTIF over array formulas for performance.
6) No circular references allowed without approvals.
7) Always include IFERROR for user-facing outputs.`,
    tags: ['default', 'formulas'],
    source: 'builtin',
  });
}
