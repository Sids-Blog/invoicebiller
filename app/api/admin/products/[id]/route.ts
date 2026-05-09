import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/products/[id]
 * Updates a product's details
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const productId = params.id;
    const body = await req.json();
    const {
      name,
      price,
      unit,
      hsn_sac,
      hsn_sac_type,
      cgst_rate,
      sgst_rate,
      cess_rate,
      company_id, // For audit log
      actor_id,   // For audit log
    } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // 1. Fetch old data for audit log
    const oldDataRows = await serverQuery(
      `SELECT name, price, unit, hsn_sac, hsn_sac_type, cgst_rate, sgst_rate, cess_rate FROM products WHERE id = $1`,
      [productId]
    );
    const oldData = oldDataRows[0] || {};

    // 2. Update product
    await serverQuery(
      `UPDATE products SET 
        name = $1,
        price = $2,
        unit = $3,
        hsn_sac = $4,
        hsn_sac_type = $5,
        cgst_rate = $6,
        sgst_rate = $7,
        cess_rate = $8
       WHERE id = $9`,
      [name, price, unit, hsn_sac, hsn_sac_type, cgst_rate, sgst_rate, cess_rate, productId]
    );

    // 3. Audit log
    if (actor_id && company_id) {
      await serverQuery(
        `INSERT INTO audit_logs (company_id, entity_name, entity_id, action, actor_id, old_data, new_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          company_id,
          'products',
          productId,
          'UPDATE',
          actor_id,
          JSON.stringify(oldData),
          JSON.stringify({ name, price, unit, hsn_sac, hsn_sac_type, cgst_rate, sgst_rate, cess_rate })
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /admin/products/[id] PUT] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/[id]
 * Deletes a product
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const productId = params.id;
    const { searchParams } = new URL(req.url);
    const company_id = searchParams.get('company_id');
    const actor_id = searchParams.get('actor_id');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // 1. Fetch data for audit log before deletion
    const oldDataRows = await serverQuery(
      `SELECT name FROM products WHERE id = $1`,
      [productId]
    );
    const oldData = oldDataRows[0] || {};

    // 2. Audit log
    if (actor_id && company_id) {
      await serverQuery(
        `INSERT INTO audit_logs (company_id, entity_name, entity_id, action, actor_id, old_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          company_id,
          'products',
          productId,
          'DELETE',
          actor_id,
          JSON.stringify(oldData)
        ]
      );
    }

    // 3. Delete
    await serverQuery(`DELETE FROM products WHERE id = $1`, [productId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /admin/products/[id] DELETE] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
