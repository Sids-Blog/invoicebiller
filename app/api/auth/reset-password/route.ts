import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password
 * Body: { token: string, password: string }
 *
 * Validates the reset token and updates the user's password.
 * Marks the token as used and terminates all existing sessions.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Look up the token
    const rows = await serverQuery(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at
       FROM password_reset_tokens prt
       WHERE prt.token = $1`,
      [token]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'This reset link is invalid.' },
        { status: 400 }
      );
    }

    const resetRecord = rows[0];

    // Check if already used
    if (resetRecord.used_at) {
      return NextResponse.json(
        { error: 'This reset link has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(resetRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const userId = resetRecord.user_id;

    // Update password using pgcrypto (same as the login hash)
    await serverQuery(
      `UPDATE users
       SET password_hash = crypt($1, gen_salt('bf', 10))
       WHERE id = $2`,
      [password, userId]
    );

    // Mark token as used
    await serverQuery(
      `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
      [resetRecord.id]
    );

    // Terminate all existing sessions for this user (force fresh login everywhere)
    await serverQuery(
      `UPDATE sessions SET terminated_at = now()
       WHERE user_id = $1 AND terminated_at IS NULL`,
      [userId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /auth/reset-password] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/auth/reset-password?token=<token>
 * Quick token validity check used by the reset page to show/hide the form.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, reason: 'No token provided' }, { status: 400 });
    }

    const rows = await serverQuery(
      `SELECT expires_at, used_at FROM password_reset_tokens WHERE token = $1`,
      [token]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ valid: false, reason: 'Invalid token' });
    }

    const { expires_at, used_at } = rows[0];

    if (used_at) {
      return NextResponse.json({ valid: false, reason: 'already_used' });
    }
    if (new Date(expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: 'expired' });
    }

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    console.error('[API /auth/reset-password GET] Error:', error);
    return NextResponse.json({ valid: false, reason: 'Server error' }, { status: 500 });
  }
}
