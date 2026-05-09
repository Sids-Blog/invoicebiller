import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users — Requires: superadmin session cookie.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    let rows;
    if (companyId) {
      rows = await serverQuery(
        `SELECT
           u.id, u.email, u.username, u.is_superadmin, u.is_primary,
           u.company_id, c.name AS company_name, u.created_at
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id
         WHERE u.company_id = $1
         ORDER BY u.is_primary DESC, u.created_at ASC`,
        [companyId]
      );
    } else {
      rows = await serverQuery(
        `SELECT
           u.id, u.email, u.username, u.is_superadmin, u.is_primary,
           u.company_id, c.name AS company_name, u.created_at
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id
         ORDER BY u.created_at DESC`
      );
    }

    return NextResponse.json({ users: rows });
  } catch (error: any) {
    console.error('[API /admin/users GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Body: { email, username, password, company_id, is_primary }
 * Adds a new user to an existing company.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const { email, username, password, company_id, is_primary } = await req.json();

    if (!email || !password || !company_id) {
      return NextResponse.json(
        { error: 'email, password, and company_id are required.' },
        { status: 400 }
      );
    }

    // If promoting to primary, demote any existing primary first
    if (is_primary) {
      await serverQuery(
        `UPDATE users SET is_primary = false WHERE company_id = $1`,
        [company_id]
      );
    }

    // Create (or update) the user, setting company_id + is_primary inline
    const userRows = await serverQuery(
      `INSERT INTO users (email, username, password_hash, is_superadmin, company_id, is_primary)
       VALUES ($1, $2, crypt($3, gen_salt('bf')), false, $4, $5)
       ON CONFLICT (email)
         DO UPDATE SET company_id = $4, is_primary = $5, username = EXCLUDED.username
       RETURNING id`,
      [email, username || email.split('@')[0], password, company_id, is_primary ?? false]
    );

    return NextResponse.json({ success: true, user_id: userRows[0].id });
  } catch (error: any) {
    console.error('[API /admin/users POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
