import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/role?userId=<uuid>
 * Returns is_superadmin + company_id for the user.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const rows = await serverQuery(
      `SELECT is_superadmin, company_id, is_primary
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ role: null, company_id: null });
    }

    const row = rows[0];
    const role = row.is_superadmin ? 'superadmin' : 'company_admin';
    return NextResponse.json({ role, company_id: row.company_id });
  } catch (error: any) {
    console.error('[API /auth/role] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
