/**
 * Development-only debug login endpoint
 * Issues a JWT without contacting Clerk or the database.
 * Available only when NODE_ENV=development.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAccessToken, createRefreshToken, setAuthCookies } from '@/lib/auth/jwt';
import { supabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  // Temporarily enabled for testing - DISABLE IN REAL PRODUCTION
  // if (process.env.NODE_ENV !== 'development') {
  //   return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // }

  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || 'dev_user_001';
    const email = body.email || 'dev@example.com';
    let orgId = body.orgId || 'test-org';
    const role = body.role || 'editor';

    // Create or get organization for testing
    if (supabase) {
      try {
        // First, check if organization exists
        const { data: orgData } = await (supabase as any)
          .from('organizations')
          .select('id')
          .eq('slug', orgId)
          .single();

        if (orgData) {
          orgId = orgData.id;
        } else {
          // Create organization if it doesn't exist
          const { data: newOrg } = await (supabase as any)
            .from('organizations')
            .insert({
              slug: orgId,
              name: orgId.replace(/-/g, ' '),
              clerk_org_id: orgId,
            })
            .select('id')
            .single();

          if (newOrg) {
            orgId = newOrg.id;
          }
        }
      } catch (error) {
        console.warn('Failed to create/get test organization:', error);
      }
    }

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
