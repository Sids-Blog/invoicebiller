import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies
 * Returns all companies with user count, bill count, and seller_info.
 */
export async function GET(_req: NextRequest) {
  const authResult = await requireSuperAdmin(_req);
  if ('error' in authResult) return authResult.error;

  try {
    const companies = await serverQuery(`
      SELECT
        c.id,
        c.name,
        c.prefix,
        c.created_at,
        si.company_name,
        si.email       AS company_email,
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
        COUNT(DISTINCT u.id) AS user_count,
        COUNT(DISTINCT b.id) AS bill_count
      FROM companies c
      LEFT JOIN seller_info si ON si.company_id = c.id
      LEFT JOIN users        u  ON u.company_id  = c.id
      LEFT JOIN bills        b  ON b.company_id  = c.id
      GROUP BY c.id, c.name, c.created_at, c.prefix,
               si.company_name, si.email, si.contact_number, si.gst_number, si.address,
               si.trade_name, si.pan, si.upi_id, si.logo_url, si.bank_account_number,
               si.account_holder_name, si.account_no, si.branch, si.ifsc_code,
               si.default_cgst_pct, si.default_sgst_pct, si.default_cess_pct
      ORDER BY c.created_at DESC
    `);

    return NextResponse.json({ companies });
  } catch (error: any) {
    console.error('[API /admin/companies] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/companies
 * Body: { name, email, contact_number, primary_user_email, primary_user_password, primary_user_username }
 * Creates company + primary user in one transaction.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const {
      name, email, contact_number, prefix,
      primary_user_email, primary_user_password, primary_user_username,
    } = await req.json();

    if (!name || !primary_user_email || !primary_user_password) {
      return NextResponse.json(
        { error: 'Company name, user email, and password are required.' },
        { status: 400 }
      );
    }

    // 1. Create company
    const companyPrefix = prefix || name.substring(0, 3).toUpperCase();
    const companyRows = await serverQuery(
      `INSERT INTO companies (name, prefix) VALUES ($1, $2) RETURNING id`,
      [name, companyPrefix]
    );
    const company_id = companyRows[0].id;

    // 2. Seed seller_info
    await serverQuery(
      `INSERT INTO seller_info (company_id, company_name, email, contact_number)
       VALUES ($1, $2, $3, $4)`,
      [company_id, name, email || primary_user_email, contact_number || '']
    );

    // 3. Create primary user — set company_id + is_primary directly on the user row
    const userRows = await serverQuery(
      `INSERT INTO users (email, username, password_hash, is_superadmin, company_id, is_primary)
       VALUES ($1, $2, crypt($3, gen_salt('bf')), false, $4, true)
       ON CONFLICT (email)
         DO UPDATE SET company_id = $4, is_primary = true, username = EXCLUDED.username
       RETURNING id`,
      [
        primary_user_email,
        primary_user_username || primary_user_email.split('@')[0],
        primary_user_password,
        company_id,
      ]
    );

    return NextResponse.json({ success: true, company_id, user_id: userRows[0].id });
  } catch (error: any) {
    console.error('[API /admin/companies POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
