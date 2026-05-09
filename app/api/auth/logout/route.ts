import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout
 * Terminates the server-side session and clears the HttpOnly cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;

    if (token) {
      // Terminate the session in the DB so admin session monitor reflects it
      await serverQuery(
        `UPDATE sessions SET terminated_at = now() WHERE token = $1 AND terminated_at IS NULL`,
        [token]
      );
    }

    const response = NextResponse.json({ success: true });

    // Clear the HttpOnly cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Immediately expire
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[API /auth/logout] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
