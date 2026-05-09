import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies/seller-info?companyName=<name>
 * Returns seller info for a specific company by name
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { searchParams } = new URL(req.url);
    const companyName = searchParams.get('companyName');

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const sellerInfo = await serverQuery(
      `SELECT 
        si.company_name, si.email, si.contact_number, si.address,
        si.gst_number, si.bank_account_number, si.account_holder_name,
        si.branch, si.ifsc_code, si.trade_name, si.pan, si.upi_id,
        si.logo_url, si.default_cgst_pct, si.default_sgst_pct, si.default_cess_pct
       FROM seller_info si
       JOIN companies c ON c.id = si.company_id
       WHERE c.name = $1 OR si.company_name = $1
       LIMIT 1`,
      [companyName]
    );

    if (sellerInfo.length === 0) {
      return NextResponse.json(
        { error: 'Seller info not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ sellerInfo: sellerInfo[0] });
  } catch (error: any) {
    console.error('[API /admin/companies/seller-info] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}