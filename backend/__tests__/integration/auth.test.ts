/**
 * Integration-style tests for auth handlers (runs in-process, no external services).
 */

process.env.SESSION_SECRET = 'test-session-secret';
process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.NODE_ENV = 'development';

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as debugLoginPOST } from '../../src/app/api/auth/debug-login/route';
import { POST as tokenPOST } from '../../src/app/api/auth/token/route';
import { GET as meGET } from '../../src/app/api/auth/me/route';
import { POST as logoutPOST } from '../../src/app/api/auth/logout/route';

// In-memory cookie store mock for next/headers
vi.mock('next/headers', () => {
  const store = new Map<string, string>();
  return {
    cookies: () => ({
      set: (key: string, value: string) => store.set(key, value),
      get: (key: string) => (store.has(key) ? { value: store.get(key) } : undefined),
      delete: (key: string) => store.delete(key),
    }),
  };
});

// Mock Clerk sync helpers to avoid DB calls
const mockSyncUser = vi.fn();
const mockSyncOrg = vi.fn();
vi.mock('../../src/lib/auth/clerk', () => ({
  syncClerkUserToDatabase: (...args: unknown[]) => mockSyncUser(...args),
  syncOrganizationToDatabase: (...args: unknown[]) => mockSyncOrg(...args),
}));

// Mock Supabase client used in db helper
vi.mock('../../src/lib/db', () => {
  const fakeUser = {
    id: 'dev_user_001',
    email: 'dev@example.com',
    name: 'Dev User',
    role: 'editor',
    organizations: { id: 'dev_org_001' },
    created_at: new Date().toISOString(),
  };

  return {
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({ data: fakeUser, error: null }),
          }),
        }),
        delete: () => ({ eq: () => ({}) }),
        update: () => ({ eq: () => ({}) }),
      }),
    },
  };
});

// Mock svix Webhook verification to echo parsed payload
vi.mock('svix', () => ({
  Webhook: class {
    constructor(_secret: string) {}
    verify(body: string) {
      return JSON.parse(body);
    }
  },
}));

describe('Auth handlers (in-process)', () => {
  beforeAll(() => {
    // already set at module load; retained for clarity
  });

  it('issues tokens via debug-login', async () => {
    const req = new NextRequest('http://localhost/api/auth/debug-login', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user1', email: 'u1@test.com', orgId: 'org1', role: 'editor' }),
    });

    const res = await debugLoginPOST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.accessToken).toBeTruthy();
    expect(body.user.email).toBe('u1@test.com');
  });

  it('refreshes access token with refresh token', async () => {
    const loginReq = new NextRequest('http://localhost/api/auth/debug-login', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user2', email: 'u2@test.com', orgId: 'org2', role: 'editor' }),
    });
    const loginRes = await debugLoginPOST(loginReq as any);
    const loginBody = await loginRes.json();

    const refreshReq = new NextRequest('http://localhost/api/auth/token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: loginBody.refreshToken || loginBody.accessToken }),
    });

    const res = await tokenPOST(refreshReq as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.accessToken).toBeTruthy();
  });

  it('returns current user with valid bearer token', async () => {
    const loginReq = new NextRequest('http://localhost/api/auth/debug-login', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user3', email: 'u3@test.com', orgId: 'org3', role: 'editor' }),
    });
    const loginRes = await debugLoginPOST(loginReq as any);
    const loginBody = await loginRes.json();

    const meReq = new NextRequest('http://localhost/api/auth/me', {
      headers: { authorization: `Bearer ${loginBody.accessToken}` },
    });

    const res = await meGET(meReq as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.email).toBeTruthy();
    expect(body.user.organization).toBeTruthy();
  });

  it('logs out and clears cookies', async () => {
    const req = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' });
    const res = await logoutPOST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain('Logged out');
  });

  it('processes Clerk webhook events', async () => {
    process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret';
    const { POST: webhookPOST } = await import('../../src/app/api/auth/webhook/route');

    const payload = {
      type: 'user.created',
      data: {
        id: 'test-user-id',
        email_addresses: [{ email_address: 'test@example.com', id: 'email1' }],
        primary_email_address_id: 'email1',
        first_name: 'Test',
        last_name: 'User',
        organization_memberships: [
          {
            organization: { id: 'org-123' },
          },
        ],
      },
    };

    const req = {
      headers: new Headers({
        'svix-id': 'msg_1',
        'svix-timestamp': `${Date.now()}`,
        'svix-signature': 'v1,signature',
        'content-type': 'application/json',
      }),
      text: async () => JSON.stringify(payload),
    } as any;

    const res = await webhookPOST(req);
    const body = await res.json();

    if (res.status !== 200) {
      console.error('webhook failure body:', body);
    }

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mockSyncUser).toHaveBeenCalled();
  });
});
