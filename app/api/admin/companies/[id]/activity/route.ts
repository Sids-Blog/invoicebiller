import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies/[id]/activity
 * Returns audit logs for a specific company
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireSuperAdmin(req);
  if ("error" in authResult) return authResult.error;

  try {
    const companyId = (await params).id;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const activity = await serverQuery(
      `SELECT 
        a.id, a.entity_name, a.entity_id, a.action, a.old_data, a.new_data, a.created_at,
        u.email as actor_email, u.username as actor_username
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.company_id = $1 
       ORDER BY a.created_at DESC 
       LIMIT 50`,
      [companyId]
    );

    return NextResponse.json({ activity });
  } catch (error: any) {
    console.error('[API /admin/companies/[id]/activity] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
