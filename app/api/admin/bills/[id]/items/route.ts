import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bills/[id]/items
 * Returns bill items for a specific bill
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireSuperAdmin(req);
  if ("error" in authResult) return authResult.error;

  try {
    const billId = (await params).id;

    if (!billId) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    const items = await serverQuery(
      `SELECT 
        id, bill_id, product_name, quantity, price, unit,
        hsn_sac, hsn_sac_type, cgst_rate, sgst_rate, cess_rate,
        additional_desc
       FROM bill_items 
       WHERE bill_id = $1 
       ORDER BY id ASC`,
      [billId]
    );

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('[API /admin/bills/[id]/items] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}