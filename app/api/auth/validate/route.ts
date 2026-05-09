import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

const IDLE_TIMEOUT_MINUTES = 30;

/**
 * POST /api/auth/validate
 * No body needed — reads session token from the HttpOnly cookie automatically.
 * Validates session, updates last_active, returns valid: true/false.
 */
export async function POST(request: NextRequest) {
  try {
    // Read from HttpOnly cookie — the token is never exposed to client JS
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ valid: false, reason: 'No session cookie' }, { status: 401 });
    }

    const rows = await serverQuery(
      `SELECT id, user_id, expires_at, last_active, terminated_at FROM sessions WHERE token = $1`,
      [token]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ valid: false, reason: 'Session not found' }, { status: 401 });
    }

    const session = rows[0];

    if (session.terminated_at) {
      return NextResponse.json({ valid: false, reason: 'Session terminated' }, { status: 401 });
    }

    const now = new Date();

    if (new Date(session.expires_at) < now) {
      return NextResponse.json({ valid: false, reason: 'Session expired' }, { status: 401 });
    }

    const idleMs = now.getTime() - new Date(session.last_active).getTime();
    const idleMins = idleMs / (1000 * 60);
    if (idleMins > IDLE_TIMEOUT_MINUTES) {
      await serverQuery(
        `UPDATE sessions SET terminated_at = now() WHERE id = $1`,
        [session.id]
      );
      return NextResponse.json({ valid: false, reason: 'Idle timeout' }, { status: 401 });
    }

    await serverQuery(
      `UPDATE sessions SET last_active = now() WHERE id = $1`,
      [session.id]
    );

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    console.error('[API /auth/validate] Error:', error);
    return NextResponse.json({ valid: false, reason: 'Server error' }, { status: 500 });
  }
}
