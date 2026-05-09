import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies/[id]/documents
 * Returns all invoices and quotations for a specific company
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireSuperAdmin(req);
  if ("error" in authResult) return authResult.error;

  try {
    const companyId = params.id;

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Get all bills (invoices and quotations) for the company
    const documents = await serverQuery(
      `SELECT 
         b.id,
         b.invoice_number,
         b.type,
         b.customer_name,
         b.customer_phone,
         b.customer_address,
         b.customer_gstin,
         b.total_amount,
         b.discount,
         b.gst_amount,
         b.is_gst_bill,
         b.comments,
         b.date_of_bill,
         b.created_at,
         COUNT(bi.id) as item_count
       FROM bills b
       LEFT JOIN bill_items bi ON bi.bill_id = b.id
       WHERE b.company_id = $1
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [companyId]
    );

    // Separate into invoices and quotations
    const invoices = documents.filter(doc => doc.type === 'invoice');
    const quotations = documents.filter(doc => doc.type === 'quotation');

    return NextResponse.json({ 
      documents: {
        invoices,
        quotations,
        total_count: documents.length,
        invoice_count: invoices.length,
        quotation_count: quotations.length
      }
    });
  } catch (error: any) {
    console.error('[API /admin/companies/[id]/documents] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}