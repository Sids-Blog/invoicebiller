import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

const SESSION_DURATION_HOURS = 8;

// ── In-memory rate limiter (per serverless instance) ──────────────────────
// Tracks failed login attempts per IP. Resets per instance restart, which
// is acceptable for this scale. Upgrade to Redis/Upstash for multi-instance.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_ATTEMPTS) return true;

  record.count++;
  return false;
}

function clearRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Security changes:
 * - Rate limited: 5 attempts per IP per 15 minutes
 * - Session token is set as an HttpOnly cookie — NOT returned in the response body
 * - Response body only contains safe user metadata (no token)
 */
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // ── Rate limiting ─────────────────────────────────────────
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // ── Fetch user ────────────────────────────────────────────
    const users = await serverQuery(
      `SELECT id, email, username, is_superadmin, company_id FROM users WHERE email = $1`,
      [email]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = users[0];

    // ── Verify password via pgcrypto ──────────────────────────
    const verifyResult = await serverQuery(
      `SELECT (password_hash = crypt($1, password_hash)) AS is_valid FROM users WHERE id = $2`,
      [password, user.id]
    );

    if (!verifyResult || !verifyResult[0]?.is_valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Successful auth — clear rate limit counter for this IP
    clearRateLimit(ip);

    // ── Create server-side session in DB ──────────────────────
    const user_agent = request.headers.get('user-agent') || null;

    const sessionRows = await serverQuery(
      `INSERT INTO sessions (user_id, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, now() + INTERVAL '${SESSION_DURATION_HOURS} hours')
       RETURNING token`,
      [user.id, ip, user_agent]
    );

    const session_token = sessionRows[0].token;

    // ── Build response — token goes in cookie only ────────────
    const session = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        is_superadmin: user.is_superadmin,
        company_id: user.company_id ?? null,
        // NOTE: session_token is intentionally NOT returned in the body.
        // It is sent as an HttpOnly cookie below.
      },
    };

    const response = NextResponse.json({ session });

    // HttpOnly cookie — inaccessible to JavaScript, immune to XSS token theft
    response.cookies.set('session_token', session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * SESSION_DURATION_HOURS,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[API /auth/login] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
