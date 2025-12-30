/**
 * Authentication utilities for JWT token management
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-secret-change-in-production'
);

const TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const REFRESH_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface TokenPayload {
  sub: string; // user ID
  email: string;
  orgId: string;
  role: 'admin' | 'editor' | 'viewer';
  iat: number;
  exp: number;
}

/**
 * Generate JWT access token
 */
export async function createAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + TOKEN_EXPIRY))
    .sign(secret);

  return token;
}

/**
 * Generate JWT refresh token
 */
export async function createRefreshToken(userId: string) {
  const token = await new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + REFRESH_EXPIRY))
    .sign(secret);

  return token;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);

    const { sub, email, orgId, role, iat, exp } = payload as Record<string, unknown>;

    if (
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof orgId !== 'string' ||
      typeof role !== 'string' ||
      typeof iat !== 'number' ||
      typeof exp !== 'number'
    ) {
      throw new Error('Invalid token payload');
    }

    return { sub, email, orgId, role: role as TokenPayload['role'], iat, exp };
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Set authentication cookies
 */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY / 1000,
    path: '/',
  });

  cookieStore.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_EXPIRY / 1000,
    path: '/',
  });
}

/**
 * Clear authentication cookies
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
}

/**
 * Get token from cookies
 */
export async function getAuthTokens() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get('accessToken')?.value,
    refreshToken: cookieStore.get('refreshToken')?.value,
  };
}
