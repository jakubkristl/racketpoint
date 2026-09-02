import { ensureSchema, sql } from '../_lib/db';
import { getSessionUser, requireAdmin } from '../_lib/auth';
import { methodNotAllowed, readBody, toNumber } from '../_lib/http';
import { setNoStore } from '../_lib/security';

type StockAdjustmentBody = {
  sku: string;
  deltaQuantity: number;
  reason: string;
};

export default async function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const admin = requireAdmin(req, res);
  if (!admin) {
    return;
  }

  try {
    await ensureSchema();
    const body = readBody<StockAdjustmentBody>(req);
    const sku = String(body.sku ?? '').trim();
    const reason = String(body.reason ?? '').trim().slice(0, 160);
    const deltaQuantity = Math.trunc(toNumber(body.deltaQuantity));

    if (!sku || !reason || !deltaQuantity) {
      res.status(400).json({ error: 'SKU, non-zero quantity adjustment, and reason are required.' });
      return;
    }

    const updated = await sql`
      UPDATE products
      SET stock = stock + ${deltaQuantity}
      WHERE id = ${sku} AND stock + ${deltaQuantity} >= 0
      RETURNING id, stock
    `;

    if (updated.rowCount === 0) {
      res.status(409).json({ error: 'Product was not found or the adjustment would make stock negative.' });
      return;
    }

    const actor = getSessionUser(req)?.id ?? 'admin';
    await sql`
      INSERT INTO stock_movements (id, sku, delta_quantity, reason, actor)
      VALUES (
        ${`stm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`},
        ${sku},
        ${deltaQuantity},
        ${reason},
        ${actor}
      )
    `;

    res.status(200).json({ sku, stock: Number(updated.rows[0].stock) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Stock adjustment failed.' });
  }
}