import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, readBody } from '../_lib/http';
import { requireAdmin } from '../_lib/auth';
import { setNoStore } from '../_lib/security';

type UpdateStatusBody = {
  orderId: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded';
  paymentStatus?: string;
  paymentReference?: string;
};

function toOrderLines(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ sku: string; quantity: number }>;
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Record<string, unknown>;
      const sku = typeof record.sku === 'string' ? record.sku : '';
      const quantity = Number(record.quantity ?? 0);
      if (!sku || !Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }
      return { sku, quantity: Math.trunc(quantity) };
    })
    .filter((item): item is { sku: string; quantity: number } => Boolean(item));
}

function shouldRestock(nextStatus: UpdateStatusBody['status']) {
  return nextStatus === 'Cancelled' || nextStatus === 'Refunded';
}

export default async function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'PUT') {
    methodNotAllowed(res);
    return;
  }

  const admin = requireAdmin(req, res);
  if (!admin) {
    return;
  }

  try {
    await ensureSchema();
    const body = readBody<UpdateStatusBody>(req);

    if (!body.orderId || !body.status) {
      res.status(400).json({ error: 'orderId and status are required.' });
      return;
    }

    const existing = await sql`
      SELECT id, items, stock_reverted_at
      FROM orders
      WHERE id = ${body.orderId}
      LIMIT 1
    `;

    if (existing.rowCount === 0) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const order = existing.rows[0] as {
      id: string;
      items: unknown;
      stock_reverted_at: string | null;
    };

    const needsRestock = shouldRestock(body.status) && !order.stock_reverted_at;
    if (needsRestock) {
      const lines = toOrderLines(order.items);

      for (const line of lines) {
        await sql`UPDATE products SET stock = stock + ${line.quantity} WHERE id = ${line.sku}`;
        await sql`
          INSERT INTO stock_movements (id, sku, delta_quantity, reason, order_id, actor)
          VALUES (
            ${`stm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`},
            ${line.sku},
            ${line.quantity},
            'order_restock',
            ${order.id},
            ${admin.id}
          )
        `;
      }
    }

    const result = await sql`
      UPDATE orders
      SET
        status = ${body.status},
        payment_status = COALESCE(${body.paymentStatus ?? null}, payment_status),
        payment_reference = COALESCE(${body.paymentReference ?? null}, payment_reference),
        stock_reverted_at = CASE
          WHEN ${needsRestock} THEN NOW()
          ELSE stock_reverted_at
        END
      WHERE id = ${body.orderId}
      RETURNING *
    `;

    res.status(200).json({ ok: true, order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update order status.' });
  }
}
