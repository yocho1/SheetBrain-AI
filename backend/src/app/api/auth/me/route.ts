/**
 * Current user endpoint - Get authenticated user info
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    // Try to load user from DB; gracefully fall back in development
    try {
      const { supabase } = await import('@/lib/db');
      if (!supabase) {
        throw new Error('Supabase not configured');
      }
      const { data: user, error } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', payload.sub)
        .single();

      if (error || !user) {
        if (process.env.NODE_ENV === 'development') {
          return NextResponse.json(
            {
              user: {
                id: payload.sub,
                email: payload.email as string | undefined,
                role: payload.role as string | undefined,
                organization: (payload.orgId as string | undefined)
                  ? { id: payload.orgId as string }
                  : null,
              },
              source: 'dev-fallback',
            },
            { status: 200 }
          );
        }
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organization: user.organizations,
            createdAt: user.created_at,
          },
        },
        { status: 200 }
      );
    } catch {
      // Dev fallback: return minimal info from JWT when DB isn't configured
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          {
            user: {
              id: payload.sub,
              email: payload.email as string | undefined,
              role: payload.role as string | undefined,
              organization: (payload.orgId as string | undefined)
                ? { id: payload.orgId as string }
                : null,
            },
            source: 'dev-fallback',
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
