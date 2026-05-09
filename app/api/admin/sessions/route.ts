import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/sessions — Requires: superadmin session cookie.
 */
export async function GET(_req: NextRequest) {
  const authResult = await requireSuperAdmin(_req);
  if ('error' in authResult) return authResult.error;

  try {
    const rows = await serverQuery(`
      SELECT
        s.id,
        s.token,
        s.created_at,
        s.expires_at,
        s.last_active,
        s.terminated_at,
        s.ip_address,
        s.user_agent,
        u.id           AS user_id,
        u.email        AS user_email,
        u.username,
        u.is_superadmin,
        c.name         AS company_name,
        t.email        AS terminated_by_email
      FROM sessions s
      JOIN  users     u ON u.id = s.user_id
      LEFT JOIN companies c ON c.id = u.company_id
      LEFT JOIN users     t ON t.id = s.terminated_by
      ORDER BY s.created_at DESC
      LIMIT 200
    `);

    return NextResponse.json({ sessions: rows });
  } catch (error: any) {
    console.error('[API /admin/sessions GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/sessions
 * Body: { session_id, admin_user_id }
 */
export async function DELETE(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const { session_id, admin_user_id } = await req.json();

    if (!session_id || !admin_user_id) {
      return NextResponse.json(
        { error: 'session_id and admin_user_id are required' },
        { status: 400 }
      );
    }

    await serverQuery(
      `UPDATE sessions
       SET terminated_at = now(), terminated_by = $1
       WHERE id = $2 AND terminated_at IS NULL`,
      [admin_user_id, session_id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /admin/sessions DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
