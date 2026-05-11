import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies/[id]/products
 * Returns all products for a specific company
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

    const products = await serverQuery(
      `SELECT 
        id, name, price, unit, hsn_sac, hsn_sac_type,
        cgst_rate, sgst_rate, cess_rate, created_at
       FROM products 
       WHERE company_id = $1 
       ORDER BY name ASC`,
      [companyId]
    );

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('[API /admin/companies/[id]/products] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}