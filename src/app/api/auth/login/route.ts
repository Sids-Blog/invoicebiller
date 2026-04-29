import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * 
 * Validates credentials server-side using pgcrypto, returns session data.
 * Password comparison done in Postgres — hash never sent to client.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Fetch user
    const users = await serverQuery(
      `SELECT id, email, username FROM users WHERE email = $1`,
      [email]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = users[0];

    // 2. Verify password using pgcrypto crypt() — server-side only
    const verifyResult = await serverQuery(
      `SELECT (password_hash = crypt($1, password_hash)) AS is_valid FROM users WHERE id = $2`,
      [password, user.id]
    );

    if (!verifyResult || !verifyResult[0]?.is_valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const session = {
      user: { id: user.id, email: user.email, username: user.username },
    };

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error('[API /auth/login] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
