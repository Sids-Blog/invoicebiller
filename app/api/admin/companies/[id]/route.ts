import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/companies/[id]
 * Updates company and seller_info details
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const companyId = params.id;
    const body = await req.json();
    
    const {
      company_name = null,
      company_email = null,
      contact_number = null,
      gst_number = null,
      address = null,
      trade_name = null,
      pan = null,
      upi_id = null,
      logo_url = null,
      bank_account_number = null,
      account_holder_name = null,
      account_no = null,
      branch = null,
      ifsc_code = null,
      default_cgst_pct = 9,
      default_sgst_pct = 9,
      default_cess_pct = 0,
      prefix = null,
      actor_id = null,
    } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch old data for audit log
    console.log('[API /admin/companies PUT] Fetching old data...');
    const oldDataRows = await serverQuery(
      `SELECT 
        c.name as company_name, 
        si.email as company_email, 
        si.contact_number, 
        si.gst_number, 
        si.address,
        si.trade_name,
        si.pan,
        si.upi_id,
        si.logo_url,
        si.bank_account_number,
        si.account_holder_name,
        si.account_no,
        si.branch,
        si.ifsc_code,
        si.default_cgst_pct,
        si.default_sgst_pct,
        si.default_cess_pct,
        c.prefix
       FROM companies c
       LEFT JOIN seller_info si ON si.company_id = c.id
       WHERE c.id = $1`,
      [companyId]
    );
    const oldData = oldDataRows[0] || {};

    // 2. Update company name and prefix in companies table
    if (company_name || prefix !== null) {
      await serverQuery(
        `UPDATE companies SET 
          name = COALESCE($1, name),
          prefix = COALESCE($2, prefix)
         WHERE id = $3`,
        [company_name, prefix, companyId]
      );
    }

    // 3. Update seller_info (UPSERT pattern)
    await serverQuery(
      `INSERT INTO seller_info (
        company_id, company_name, email, contact_number, gst_number, address,
        trade_name, pan, upi_id, logo_url, bank_account_number,
        account_holder_name, account_no, branch, ifsc_code,
        default_cgst_pct, default_sgst_pct, default_cess_pct
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (company_id) DO UPDATE SET
         company_name = COALESCE(EXCLUDED.company_name, seller_info.company_name),
         email = COALESCE(EXCLUDED.email, seller_info.email),
         contact_number = COALESCE(EXCLUDED.contact_number, seller_info.contact_number),
         gst_number = COALESCE(EXCLUDED.gst_number, seller_info.gst_number),
         address = COALESCE(EXCLUDED.address, seller_info.address),
         trade_name = COALESCE(EXCLUDED.trade_name, seller_info.trade_name),
         pan = COALESCE(EXCLUDED.pan, seller_info.pan),
         upi_id = COALESCE(EXCLUDED.upi_id, seller_info.upi_id),
         logo_url = COALESCE(EXCLUDED.logo_url, seller_info.logo_url),
         bank_account_number = COALESCE(EXCLUDED.bank_account_number, seller_info.bank_account_number),
         account_holder_name = COALESCE(EXCLUDED.account_holder_name, seller_info.account_holder_name),
         account_no = COALESCE(EXCLUDED.account_no, seller_info.account_no),
         branch = COALESCE(EXCLUDED.branch, seller_info.branch),
         ifsc_code = COALESCE(EXCLUDED.ifsc_code, seller_info.ifsc_code),
         default_cgst_pct = COALESCE(EXCLUDED.default_cgst_pct, seller_info.default_cgst_pct),
         default_sgst_pct = COALESCE(EXCLUDED.default_sgst_pct, seller_info.default_sgst_pct),
         default_cess_pct = COALESCE(EXCLUDED.default_cess_pct, seller_info.default_cess_pct)`,
      [
        companyId,
        company_name,
        company_email || '',
        contact_number || '',
        gst_number,
        address,
        trade_name,
        pan,
        upi_id,
        logo_url,
        bank_account_number,
        account_holder_name,
        account_no,
        branch,
        ifsc_code,
        default_cgst_pct,
        default_sgst_pct,
        default_cess_pct
      ]
    );

    // 4. Insert audit log
    if (actor_id) {
      try {
        await serverQuery(
          `INSERT INTO audit_logs (company_id, entity_name, entity_id, action, actor_id, old_data, new_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            companyId,
            'companies',
            companyId,
            'UPDATE',
            actor_id,
            JSON.stringify(oldData),
            JSON.stringify({ 
              company_name, company_email, contact_number, gst_number, address,
              trade_name, pan, upi_id, logo_url, bank_account_number,
              account_holder_name, account_no, branch, ifsc_code,
              default_cgst_pct, default_sgst_pct, default_cess_pct,
              prefix
            })
          ]
        );
      } catch (auditError) {
        console.error('[API /admin/companies PUT] Audit Log Error (Non-fatal):', auditError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /admin/companies PUT] CRITICAL Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/companies/[id]
 * Deletes a company and all its associated data (cascades)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const companyId = params.id;
    const { searchParams } = new URL(req.url);
    const actor_id = searchParams.get('actor_id');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch data for audit log before deletion
    const oldDataRows = await serverQuery(
      `SELECT name FROM companies WHERE id = $1`,
      [companyId]
    );
    const oldData = oldDataRows[0] || {};

    // 2. Insert audit log (before deletion so company_id FK still works, or use NULL for company_id if needed)
    if (actor_id) {
      await serverQuery(
        `INSERT INTO audit_logs (company_id, entity_name, entity_id, action, actor_id, old_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          companyId,
          'companies',
          companyId,
          'DELETE',
          actor_id,
          JSON.stringify(oldData)
        ]
      );
    }

    // 3. Delete the company (cascades to users, bills, products, seller_info)
    await serverQuery(`DELETE FROM companies WHERE id = $1`, [companyId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /admin/companies DELETE] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}