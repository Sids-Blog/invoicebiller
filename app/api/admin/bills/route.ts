import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bills?companyId=<uuid>
 * Returns bills + quotations for a company (or all companies).
 * Requires: superadmin session cookie.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    let query: string;
    let params: (string | undefined)[];

    if (companyId) {
      query = `
        SELECT
          b.id, b.invoice_number, b.type, b.customer_name, b.customer_phone,
          b.total_amount, b.is_gst_bill, b.date_of_bill, b.created_at,
          COALESCE(si.company_name, c.name) AS company_name,
          u.email AS created_by_email
        FROM bills b
        JOIN companies c ON c.id = b.company_id
        LEFT JOIN seller_info si ON si.company_id = b.company_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.company_id = $1
        ORDER BY b.date_of_bill DESC
      `;
      params = [companyId];
    } else {
      query = `
        SELECT
          b.id, b.invoice_number, b.type, b.customer_name, b.customer_phone,
          b.total_amount, b.is_gst_bill, b.date_of_bill, b.created_at,
          COALESCE(si.company_name, c.name) AS company_name,
          u.email AS created_by_email
        FROM bills b
        JOIN companies c ON c.id = b.company_id
        LEFT JOIN seller_info si ON si.company_id = b.company_id
        LEFT JOIN users u ON u.id = b.created_by
        ORDER BY b.date_of_bill DESC
      `;
      params = [];
    }

    const bills = await serverQuery(query, params as string[]);
    return NextResponse.json({ bills });
  } catch (error: any) {
    console.error('[API /admin/bills] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
