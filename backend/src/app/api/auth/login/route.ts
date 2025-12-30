/**
 * Phase 2 uses /api/auth/debug-login for local and sidebar auth, so this
 * legacy login route is stubbed to unblock builds and deployments.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: true,
      message:
        'Login route is disabled for this release. Use /api/auth/debug-login to obtain a bearer token.',
    },
    { status: 200 }
  );
}
