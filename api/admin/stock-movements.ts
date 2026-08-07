import { ensureSchema, sql } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';
import { methodNotAllowed } from '../_lib/http';
import { setNoStore } from '../_lib/security';

export default async function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'GET') {
    methodNotAllowed(res);
    return;
  }

  const admin = requireAdmin(req, res);
  if (!admin) {
    return;
  }

  try {
    await ensureSchema();

    const result = await sql`
      SELECT
        sm.id,
        sm.sku,
        sm.delta_quantity,
        sm.reason,
        sm.order_id,
        sm.actor,
        sm.created_at,
        p.title AS product_title
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.sku
      ORDER BY sm.created_at DESC
      LIMIT 200
    `;

    const payload = result.rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      deltaQuantity: Number(row.delta_quantity),
      reason: row.reason,
      orderId: row.order_id,
      actor: row.actor,
      createdAt: row.created_at,
      productTitle: row.product_title,
    }));

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Stock movements endpoint failed.' });
  }
}
