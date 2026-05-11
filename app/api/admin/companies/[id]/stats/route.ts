import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies/[id]/stats
 * Returns statistics for a specific company
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
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Get company statistics
    const stats = await serverQuery(
      `SELECT 
         COUNT(DISTINCT p.id) as product_count,
         COUNT(DISTINCT b.id) as bill_count,
         COUNT(DISTINCT CASE WHEN b.type = 'invoice' THEN b.id END) as invoice_count,
         COUNT(DISTINCT CASE WHEN b.type = 'quotation' THEN b.id END) as quotation_count,
         COALESCE(SUM(CASE WHEN b.type = 'invoice' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
         COALESCE(SUM(b.total_amount), 0) as total_bill_value
       FROM companies c
       LEFT JOIN products p ON p.company_id = c.id
       LEFT JOIN bills b ON b.company_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [companyId]
    );

    // Get recent activity (last 5 bills)
    const recentActivity = await serverQuery(
      `SELECT 
         b.id,
         b.invoice_number,
         b.type,
         b.customer_name,
         b.total_amount,
         b.created_at
       FROM bills b
       WHERE b.company_id = $1
       ORDER BY b.created_at DESC
       LIMIT 5`,
      [companyId]
    );

    const result = {
      stats: stats[0] || {
        product_count: 0,
        bill_count: 0,
        invoice_count: 0,
        quotation_count: 0,
        total_revenue: 0,
        total_bill_value: 0
      },
      recent_activity: recentActivity
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /admin/companies/[id]/stats] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}