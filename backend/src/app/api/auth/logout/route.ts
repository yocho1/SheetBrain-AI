/**
 * Logout endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/jwt';

export async function POST(_request: NextRequest) {
  try {
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    await clearAuthCookies();

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
