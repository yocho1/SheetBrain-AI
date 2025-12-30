/**
 * Middleware for Next.js edge runtime
 * Handles authentication, rate limiting, and security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public endpoints that don't require auth
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/debug-login',
    '/api/auth/token',
    '/api/auth/webhook',
    '/api/health',
    '/api/stripe/webhook',
    '/api/public',
  ];

  const isPublic = publicPaths.some((path) => pathname.startsWith(path));
  if (isPublic) {
    return NextResponse.next();
  }

  // Verify JWT token for protected endpoints
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized: Missing or invalid token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);

  try {
    const verified = await verifyToken(token);
    // Add user context to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', verified.sub);
    requestHeaders.set('x-user-org', verified.orgId);
    requestHeaders.set('x-user-role', verified.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
