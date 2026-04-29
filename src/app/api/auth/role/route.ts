import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/role?userId=<uuid>
 * Returns the role name for a given user.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const rows = await serverQuery(
      `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );

    const role = rows && rows.length > 0 ? rows[0].name : null;
    return NextResponse.json({ role });
  } catch (error: any) {
    console.error('[API /auth/role] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
