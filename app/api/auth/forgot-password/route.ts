import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { sendPasswordResetEmail } from '@/lib/mailer';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Rate limit: 3 reset requests per email per 15 minutes (in-memory)
const resetAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 3;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const record = resetAttempts.get(email);
  if (!record || now > record.resetAt) {
    resetAttempts.set(email, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (record.count >= MAX_ATTEMPTS) return true;
  record.count++;
  return false;
}

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Generates a secure reset token, stores it in DB, and emails the reset link.
 * Always returns 200 regardless of whether the email exists (prevents user enumeration).
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit by email to prevent abuse
    if (isRateLimited(normalizedEmail)) {
      // Still return 200 to prevent enumeration, but don't send
      return NextResponse.json({ success: true });
    }

    // Lookup user — do NOT reveal if email exists in the error response
    const users = await serverQuery(
      `SELECT id, email, username FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (!users || users.length === 0) {
      // Return success even for unknown emails — prevents user enumeration attacks
      return NextResponse.json({ success: true });
    }

    const user = users[0];

    // Invalidate any previous unused tokens for this user
    await serverQuery(
      `UPDATE password_reset_tokens SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()`,
      [user.id]
    );

    // Generate a cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Store token in DB (expires in 1 hour)
    await serverQuery(
      `INSERT INTO password_reset_tokens (user_id, token)
       VALUES ($1, $2)`,
      [user.id, token]
    );

    // Send the email
    await sendPasswordResetEmail({
      to: user.email,
      resetToken: token,
      username: user.username,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /auth/forgot-password] Error:', error);
    // Return generic success to prevent information leakage
    return NextResponse.json({ success: true });
  }
}
