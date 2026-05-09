import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

export interface ServerSession {
  user_id: string;
  is_superadmin: boolean;
  company_id: string | null;
}

/**
 * Extracts and validates the session token from the HttpOnly cookie.
 * Returns null if the token is missing, expired, or terminated.
 */
export async function getServerSession(req: NextRequest): Promise<ServerSession | null> {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;

  try {
    const rows = await serverQuery(
      `SELECT s.user_id, u.is_superadmin, u.company_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1
         AND s.terminated_at IS NULL
         AND s.expires_at > now()`,
      [token]
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Guards a route handler — requires any authenticated session.
 * Returns { session } on success, or { error: NextResponse } on failure.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ session: ServerSession } | { error: NextResponse }> {
  const session = await getServerSession(req);
  if (!session) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session };
}

/**
 * Guards a route handler — requires a superadmin session.
 * Returns { session } on success, or { error: NextResponse } on failure.
 */
export async function requireSuperAdmin(
  req: NextRequest
): Promise<{ session: ServerSession } | { error: NextResponse }> {
  const session = await getServerSession(req);
  if (!session) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!session.is_superadmin) {
    return {
      error: NextResponse.json({ error: 'Forbidden: superadmin access required' }, { status: 403 }),
    };
  }
  return { session };
}
