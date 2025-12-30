/**
 * Token endpoint - Generate and refresh JWT tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, createAccessToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Missing refresh token' },
        { status: 400 }
      );
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken).catch(() => null);

    if (!payload || !payload.sub) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Create new access token with same payload
    const newAccessToken = await createAccessToken({
      sub: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      role: payload.role,
    });

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
