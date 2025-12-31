/**
 * Development-only debug login endpoint
 * Issues a JWT without contacting Clerk or the database.
 * Available only when NODE_ENV=development.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAccessToken, createRefreshToken, setAuthCookies } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  // Temporarily enabled for testing - DISABLE IN REAL PRODUCTION
  // if (process.env.NODE_ENV !== 'development') {
  //   return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // }

  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || 'dev_user_001';
    const email = body.email || 'dev@example.com';
    const orgId = body.orgId || 'dev_org_001';
    const role = body.role || 'editor';

    const accessToken = await createAccessToken({
      sub: userId,
      email,
      orgId,
      role,
    });

    const refreshToken = await createRefreshToken(userId);

    // Optionally set cookies for browser flows
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json(
      {
        success: true,
        user: { id: userId, email, orgId, role },
        accessToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Debug login error:', error);
    return NextResponse.json(
      { error: 'Debug login failed' },
      { status: 500 }
    );
  }
}
