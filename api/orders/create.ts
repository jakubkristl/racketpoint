import { ensureSchema, sql } from '../_lib/db';
import { getSessionUser } from '../_lib/auth';
import { methodNotAllowed, readBody, toNumber } from '../_lib/http';
import { enforceRateLimit, getClientIp } from '../_lib/rateLimit';
import { enforceTrustedOrigin, setNoStore } from '../_lib/security';

type OrderLine = {
  sku: string;
  quantity: number;
  priceEur: number;
};

type CreateOrderBody = {
  fullName: string;
  email: string;
  items: OrderLine[];
  billingAddress?: {
    city: string;
    address: string;
    phone: string;
  };
  paymentMethod: 'card' | 'cash_on_delivery';
  notes?: string;
  paymentProvider?: 'borica' | 'manual';
  payment?: {
    gatewayOrder?: string;
    rrn?: string;
    intRef?: string;
    amountEur?: number;
    currency?: string;
  };
  idempotencyKey?: string;
};

function normalizeItems(items: OrderLine[]) {
  return (items ?? [])
    .filter((item) => item.sku && item.quantity > 0)
    .map((item) => ({
      sku: item.sku,
      quantity: Math.max(1, Math.trunc(toNumber(item.quantity, 1))),
      priceEur: Math.max(0, toNumber(item.priceEur, 0)),
    }));
}

type ProductRow = {
  id: string;
  selling_price: number;
  discount_price: number | null;
  stock: number;
};

function effectivePrice(row: ProductRow) {
  if (row.discount_price != null && Number(row.discount_price) > 0) {
    return Number(row.discount_price);
  }

  return Number(row.selling_price);
}

async function loadProductForUpdate(sku: string) {
  const result = await sql`
    SELECT id, selling_price, discount_price, stock
    FROM products
    WHERE id = ${sku}
    LIMIT 1
  `;

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0] as ProductRow;
}

async function verifyBoricaPayment(gatewayOrder: string, expectedAmount: number) {
  const result = await sql`
    SELECT gateway_order, amount, currency, rc, action, rrn, int_ref, signature_valid, status
    FROM borica_payments
    WHERE gateway_order = ${gatewayOrder}
    LIMIT 1
  `;

  if (result.rowCount === 0) {
    return { ok: false as const, reason: 'Payment callback not found yet for this BORICA order.' };
  }

  const payment = result.rows[0] as {
    gateway_order: string;
    amount: number | null;
    currency: string | null;
    rc: string | null;
    action: string | null;
    rrn: string | null;
    int_ref: string | null;
    signature_valid: boolean;
    status: string;
  };

  if (!payment.signature_valid || payment.status !== 'approved') {
    return { ok: false as const, reason: 'BORICA payment is not approved or signature is invalid.' };
  }

  if ((payment.currency ?? '').toUpperCase() !== 'EUR') {
    return { ok: false as const, reason: 'Unsupported payment currency.' };
  }

  const paidAmount = Number(payment.amount ?? 0);
  if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - expectedAmount) > 0.01) {
    return { ok: false as const, reason: 'Paid amount does not match server order total.' };
  }

  return {
    ok: true as const,
    payment,
  };
}

function readIdempotencyKey(req: any, body: CreateOrderBody) {
  const fromHeader = String(req.headers?.['x-idempotency-key'] ?? '').trim();
  const fromBody = String(body.idempotencyKey ?? '').trim();
  const raw = fromHeader || fromBody;
  if (!raw) {
    return null;
  }
  return raw.slice(0, 120);
}

function mapExistingOrder(row: any) {
  return {
    id: row.id,
    status: row.status,
    totalAmount: Number(row.total_amount ?? 0),
    paymentStatus: row.payment_status,
  };
}

export default async function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const ip = getClientIp(req);
  if (!enforceRateLimit(req, res, { key: `orders:create:${ip}`, max: 60, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  if (!enforceTrustedOrigin(req, res, { allowWithoutOrigin: true })) {
    return;
  }

  try {
    await ensureSchema();
    const body = readBody<CreateOrderBody>(req);
    const items = normalizeItems(body.items);
    const idempotencyKey = readIdempotencyKey(req, body);

    if (!body.fullName?.trim() || !body.email?.trim() || items.length === 0) {
      res.status(400).json({ error: 'fullName, email and items are required.' });
      return;
    }

    if (idempotencyKey) {
      const existing = await sql`
        SELECT id, status, total_amount, payment_status
        FROM orders
        WHERE idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;

      if (existing.rowCount > 0) {
        res.status(200).json({
          ...mapExistingOrder(existing.rows[0]),
          idempotentReplay: true,
        });
        return;
      }
    }

    const id = `ord_${Date.now().toString(36)}`;
    const session = getSessionUser(req);

    // Resolve all prices from DB and atomically decrement stock per line.
    const decremented: Array<{ sku: string; quantity: number }> = [];
    const resolvedItems: OrderLine[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await loadProductForUpdate(item.sku);
      if (!product) {
        for (const rollback of decremented) {
          await sql`UPDATE products SET stock = stock + ${rollback.quantity} WHERE id = ${rollback.sku}`;
        }
        res.status(400).json({ error: `Product not found for SKU: ${item.sku}` });
        return;
      }

      const update = await sql`
        UPDATE products
        SET stock = stock - ${item.quantity}
        WHERE id = ${item.sku} AND stock >= ${item.quantity}
        RETURNING id, selling_price, discount_price, stock
      `;

      if (update.rowCount === 0) {
        for (const rollback of decremented) {
          await sql`UPDATE products SET stock = stock + ${rollback.quantity} WHERE id = ${rollback.sku}`;
        }
        res.status(409).json({ error: `Insufficient stock for SKU: ${item.sku}` });
        return;
      }

      decremented.push({ sku: item.sku, quantity: item.quantity });
      const updated = update.rows[0] as ProductRow;
      const serverPrice = effectivePrice(updated);
      resolvedItems.push({
        sku: item.sku,
        quantity: item.quantity,
        priceEur: serverPrice,
      });
      totalAmount += item.quantity * serverPrice;

      await sql`
        INSERT INTO stock_movements (id, sku, delta_quantity, reason, order_id, actor)
        VALUES (
          ${`stm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`},
          ${item.sku},
          ${-item.quantity},
          'order_reserve',
          ${id},
          ${session?.id ?? 'system'}
        )
      `;
    }

    if (body.paymentMethod === 'card') {
      const gatewayOrder = body.payment?.gatewayOrder?.trim();
      if (!gatewayOrder) {
        for (const rollback of decremented) {
          await sql`UPDATE products SET stock = stock + ${rollback.quantity} WHERE id = ${rollback.sku}`;
        }
        res.status(400).json({ error: 'Missing BORICA gateway order for card payment.' });
        return;
      }

      const paymentCheck = await verifyBoricaPayment(gatewayOrder, totalAmount);
      if (!paymentCheck.ok) {
        for (const rollback of decremented) {
          await sql`UPDATE products SET stock = stock + ${rollback.quantity} WHERE id = ${rollback.sku}`;
        }
        res.status(409).json({ error: paymentCheck.reason });
        return;
      }

      const existingForGateway = await sql`
        SELECT id
        FROM orders
        WHERE payment_reference = ${gatewayOrder}
        LIMIT 1
      `;

      if (existingForGateway.rowCount > 0) {
        for (const rollback of decremented) {
          await sql`UPDATE products SET stock = stock + ${rollback.quantity} WHERE id = ${rollback.sku}`;
        }
        res.status(409).json({ error: 'An order for this BORICA payment already exists.' });
        return;
      }
    }

    await sql`
      INSERT INTO orders (
        id, user_id, email, full_name, status, total_amount,
        payment_method, payment_status, payment_provider, payment_reference, idempotency_key, address, items, notes
      ) VALUES (
        ${id}, ${session?.id ?? null}, ${body.email.trim().toLowerCase()}, ${body.fullName.trim()},
        'Pending', ${totalAmount}, ${body.paymentMethod},
        ${body.paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'approved'},
        ${body.paymentProvider ?? null},
        ${body.payment?.gatewayOrder ?? null},
        ${idempotencyKey},
        ${JSON.stringify(body.billingAddress ?? null)}::jsonb,
        ${JSON.stringify(resolvedItems)}::jsonb,
        ${body.notes ?? null}
      )
    `;

    res.status(201).json({
      id,
      status: 'Pending',
      totalAmount,
      paymentStatus: body.paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'approved',
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === '23505') {
      const body = req.body as CreateOrderBody;
      const key = readIdempotencyKey(req, body);
      if (key) {
        const existing = await sql`
          SELECT id, status, total_amount, payment_status
          FROM orders
          WHERE idempotency_key = ${key}
          LIMIT 1
        `;

        if (existing.rowCount > 0) {
          res.status(200).json({
            ...mapExistingOrder(existing.rows[0]),
            idempotentReplay: true,
          });
          return;
        }
      }
    }

    res.status(500).json({ error: error instanceof Error ? error.message : 'Order create failed.' });
  }
}
