type CommerceEnv = {
  DB: D1Database;
};

export type OrderLineInput = {
  sku: string;
  quantity: number;
  priceEur?: number;
};

const ONSITE_SALE_OCT1_ID = 'onsite-sale-2026-10-01';

const TECH_TEE_M = {
  id: 'POS-tecnifibre-team-tech-tee-m',
  title: 'Tecnifibre Team Tech Tee — M',
  slug: 'tecnifibre-team-tech-tee-m',
  description: 'Tecnifibre Team Tech Tee, size M. Onsite club stock (Double Yellow).',
  brand: 'Tecnifibre',
  sport: 'Squash',
  subCategory: 'Apparel',
  costPrice: 24.24,
  sellingPrice: 36,
  discountPrice: null as number | null,
  stock: 2,
  images: [
    'https://reception-pos.jakub-personal.workers.dev/kiosk/store/products/apparel/Tecnifibre%20Team%20Tech%20Tee.avif',
  ],
  attributes: {
    source: 'reception-pos',
    size: 'M',
    onsiteSale: '2026-10-01',
  },
  sizes: ['M'],
};

/** Unsquashable rackets sold onsite @ €115 (Admin promo / discount price). */
const ONSITE_OCT1_LINES: Array<{ sku: string; quantity: number; expectedUnitPrice: number }> = [
  { sku: 'POS-unsquashable-miguel-rodriguez-autograph', quantity: 1, expectedUnitPrice: 115 },
  { sku: 'POS-unsquashable-miguel-rodriguez-one20', quantity: 1, expectedUnitPrice: 115 },
  { sku: TECH_TEE_M.id, quantity: 2, expectedUnitPrice: 36 },
];

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function paymentGatewaysResponse(_env: CommerceEnv) {
  return json({
    gateways: [
      {
        id: 'borica',
        title: 'BORICA Card Payment',
        type: 'redirect_form',
        enabled: false,
        currency: 'EUR',
        endpoint: '/api/payments/borica/init',
      },
      {
        id: 'cash_on_delivery',
        title: 'Cash on Delivery',
        type: 'offline',
        enabled: true,
        currency: 'EUR',
      },
    ],
  });
}

async function ensureOpsSchema(env: CommerceEnv) {
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS ops_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL,
      details TEXT
    );
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      order_id TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

async function ensureTechTeeM(env: CommerceEnv) {
  const existing = await env.DB.prepare('SELECT id, stock FROM products WHERE id = ? LIMIT 1')
    .bind(TECH_TEE_M.id)
    .first<{ id: string; stock: number }>();

  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO products (
        id, title, slug, description, brand, sport, sub_category,
        cost_price, selling_price, discount_price, stock, images, attributes, sizes,
        weight_grams, balance, rating, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 4.5, ?)`,
    ).bind(
      TECH_TEE_M.id,
      TECH_TEE_M.title,
      TECH_TEE_M.slug,
      TECH_TEE_M.description,
      TECH_TEE_M.brand,
      TECH_TEE_M.sport,
      TECH_TEE_M.subCategory,
      TECH_TEE_M.costPrice,
      TECH_TEE_M.sellingPrice,
      TECH_TEE_M.discountPrice,
      TECH_TEE_M.stock,
      JSON.stringify(TECH_TEE_M.images),
      JSON.stringify(TECH_TEE_M.attributes),
      JSON.stringify(TECH_TEE_M.sizes),
      new Date().toISOString(),
    ).run();
    return { created: true, stockBefore: TECH_TEE_M.stock };
  }

  // Ensure enough units for the known onsite sale without inventing extra inventory later.
  if (Number(existing.stock) < 2) {
    await env.DB.prepare('UPDATE products SET stock = ?, selling_price = ? WHERE id = ?')
      .bind(2, TECH_TEE_M.sellingPrice, TECH_TEE_M.id)
      .run();
    return { created: false, stockBefore: 2, toppedUpFrom: Number(existing.stock) };
  }

  await env.DB.prepare('UPDATE products SET selling_price = ?, discount_price = NULL WHERE id = ?')
    .bind(TECH_TEE_M.sellingPrice, TECH_TEE_M.id)
    .run();

  return { created: false, stockBefore: Number(existing.stock) };
}

function effectiveUnitPrice(row: { selling_price: number; discount_price: number | null }, override?: number) {
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
    return override;
  }

  if (row.discount_price != null && Number(row.discount_price) > 0) {
    return Number(row.discount_price);
  }

  return Number(row.selling_price);
}

async function recordStockMovement(
  env: CommerceEnv,
  sku: string,
  delta: number,
  reason: string,
  orderId: string | null,
) {
  await env.DB.prepare(
    `INSERT INTO stock_movements (id, sku, delta, reason, order_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(`sm_${crypto.randomUUID()}`, sku, delta, reason, orderId, new Date().toISOString()).run();
}

export async function createStorefrontOrder(request: Request, env: CommerceEnv) {
  await ensureOpsSchema(env);

  const body = await request.json<{
    fullName?: string;
    email?: string;
    items?: Array<{ sku?: string; quantity?: number; priceEur?: number }>;
    billingAddress?: { city?: string; address?: string; phone?: string };
    paymentMethod?: string;
    notes?: string;
    shippingEur?: number;
    idempotencyKey?: string;
  }>().catch(() => null);

  if (!body) {
    return json({ error: 'Missing request body.' }, 400);
  }

  const fullName = String(body.fullName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const notes = typeof body.notes === 'string' ? body.notes : null;
  const idempotencyKey = String(body.idempotencyKey ?? request.headers.get('x-idempotency-key') ?? '').trim();

  if (idempotencyKey) {
    const existing = await env.DB.prepare(
      `SELECT id FROM orders WHERE notes LIKE ? ORDER BY created_at DESC LIMIT 1`,
    ).bind(`%idempotency:${idempotencyKey}%`).first<{ id: string }>();
    if (existing?.id) {
      return json({ id: existing.id, reference: existing.id, ok: true, deduped: true });
    }
  }

  const items: OrderLineInput[] = (body.items ?? [])
    .filter((item) => item.sku && Number(item.quantity) > 0)
    .map((item) => ({
      sku: String(item.sku),
      quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
      priceEur: item.priceEur == null ? undefined : Number(item.priceEur),
    }));

  if (!fullName || !email || !/^\S+@\S+\.\S+$/.test(email) || items.length === 0) {
    return json({ error: 'fullName, email and items are required.' }, 400);
  }

  if (body.paymentMethod === 'card') {
    return json({ error: 'Card payment is not available yet. Use cash on delivery.' }, 400);
  }

  try {
    const created = await insertCodOrder(env, {
      fullName,
      email,
      items,
      billingAddress: body.billingAddress ?? null,
      notes: [
        notes ?? '',
        idempotencyKey ? `idempotency:${idempotencyKey}` : '',
      ].filter(Boolean).join('\n') || null,
      shippingEur: Math.max(0, Number(body.shippingEur ?? 0) || 0),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    });
    return json({ id: created.id, reference: created.id, ok: true }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Order create failed.' }, 400);
  }
}

async function insertCodOrder(
  env: CommerceEnv,
  input: {
    fullName: string;
    email: string;
    items: OrderLineInput[];
    billingAddress: unknown;
    notes: string | null;
    shippingEur: number;
    status: 'Pending' | 'Delivered';
    createdAt: string;
  },
) {
  const resolved: Array<{ sku: string; quantity: number; priceEur: number }> = [];
  let totalAmount = 0;

  for (const item of input.items) {
    const product = await env.DB.prepare(
      'SELECT id, selling_price, discount_price, stock FROM products WHERE id = ? LIMIT 1',
    ).bind(item.sku).first<{ id: string; selling_price: number; discount_price: number | null; stock: number }>();

    if (!product) {
      throw new Error(`Product not found for SKU: ${item.sku}`);
    }

    if (Number(product.stock) < item.quantity) {
      throw new Error(`Insufficient stock for ${item.sku} (have ${product.stock}, need ${item.quantity}).`);
    }

    const price = effectiveUnitPrice(product, item.priceEur);
    resolved.push({ sku: item.sku, quantity: item.quantity, priceEur: price });
    totalAmount += price * item.quantity;
  }

  totalAmount += input.shippingEur;
  const id = `ord_${crypto.randomUUID()}`;

  for (const line of resolved) {
    await env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
      .bind(line.quantity, line.sku, line.quantity)
      .run();
    await recordStockMovement(env, line.sku, -line.quantity, 'order_reserve', id);
  }

  await env.DB.prepare(
    `INSERT INTO orders (
      id, email, full_name, status, total_amount, payment_method, payment_status, address, items, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 'cash_on_delivery', 'cash_on_delivery', ?, ?, ?, ?)`,
  ).bind(
    id,
    input.email,
    input.fullName,
    input.status,
    totalAmount,
    JSON.stringify(input.billingAddress),
    JSON.stringify(resolved),
    input.notes,
    input.createdAt,
  ).run();

  return { id, items: resolved, totalAmount };
}

export async function listStorefrontOrders(request: Request, env: CommerceEnv) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? '';
  const includeAll = url.searchParams.get('all') === '1';

  const result = includeAll
    ? await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300').all<Record<string, unknown>>()
    : email
      ? await env.DB.prepare('SELECT * FROM orders WHERE email = ? ORDER BY created_at DESC LIMIT 200').bind(email).all<Record<string, unknown>>()
      : { results: [] as Record<string, unknown>[] };

  return json((result.results ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    status: row.status,
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    address: typeof row.address === 'string' ? JSON.parse(String(row.address)) : row.address,
    items: typeof row.items === 'string' ? JSON.parse(String(row.items)) : row.items,
    notes: row.notes,
    createdAt: row.created_at,
  })));
}

export async function updateStorefrontOrderStatus(request: Request, env: CommerceEnv) {
  const body = await request.json<{ orderId?: string; status?: string }>().catch(() => null);
  const orderId = String(body?.orderId ?? '').trim();
  const status = String(body?.status ?? '').trim();
  const allowed = ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

  if (!orderId || !allowed.includes(status)) {
    return json({ error: 'orderId and a valid status are required.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id, status, items FROM orders WHERE id = ? LIMIT 1')
    .bind(orderId)
    .first<{ id: string; status: string; items: string }>();

  if (!existing) {
    return json({ error: 'Order not found.' }, 404);
  }

  // Restock once on cancel/refund.
  if (
    (status === 'Cancelled' || status === 'Refunded')
    && existing.status !== 'Cancelled'
    && existing.status !== 'Refunded'
  ) {
    const items = typeof existing.items === 'string' ? JSON.parse(existing.items) as Array<{ sku: string; quantity: number }> : [];
    for (const line of items) {
      await env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
        .bind(Math.max(1, Math.trunc(Number(line.quantity) || 1)), line.sku)
        .run();
      await recordStockMovement(env, line.sku, Math.max(1, Math.trunc(Number(line.quantity) || 1)), 'order_restock', orderId);
    }
  }

  await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, orderId).run();
  return json({ ok: true, orderId, status });
}

export async function listStockMovements(env: CommerceEnv) {
  await ensureOpsSchema(env);
  const result = await env.DB.prepare(
    'SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 200',
  ).all<Record<string, unknown>>();

  return json((result.results ?? []).map((row) => ({
    id: row.id,
    sku: row.sku,
    delta: Number(row.delta),
    reason: row.reason,
    orderId: row.order_id,
    createdAt: row.created_at,
  })));
}

/**
 * Durable one-shot ops migration: Jakub's 2026-10-01 onsite retail sale.
 * Safe to call on every request — no-ops after first success.
 */
export async function applyOnsiteSaleOct12026(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(ONSITE_SALE_OCT1_ID)
    .first<{ id: string }>();

  if (already?.id) {
    return { applied: false, reason: 'already-applied' as const };
  }

  const tee = await ensureTechTeeM(env);

  const stockBefore: Record<string, number> = {};
  for (const line of ONSITE_OCT1_LINES) {
    const row = await env.DB.prepare('SELECT id, stock, selling_price, discount_price FROM products WHERE id = ? LIMIT 1')
      .bind(line.sku)
      .first<{ id: string; stock: number; selling_price: number; discount_price: number | null }>();

    if (!row) {
      throw new Error(`Missing product for onsite sale: ${line.sku}`);
    }

    stockBefore[line.sku] = Number(row.stock);
    if (Number(row.stock) < line.quantity) {
      throw new Error(`Insufficient stock for onsite sale ${line.sku}: have ${row.stock}, need ${line.quantity}`);
    }
  }

  const created = await insertCodOrder(env, {
    fullName: 'Onsite sale / Jakub',
    email: 'admin@racketpoint.bg',
    items: ONSITE_OCT1_LINES.map((line) => ({
      sku: line.sku,
      quantity: line.quantity,
      priceEur: line.expectedUnitPrice,
    })),
    billingAddress: {
      city: 'Sofia',
      address: 'Onsite / Double Yellow',
      phone: '-',
    },
    notes: [
      'onsite',
      ONSITE_SALE_OCT1_ID,
      '2× Unsquashable @ €115 + 2× Tecnifibre Tech Tee M @ €36 = €302',
      `idempotency:${ONSITE_SALE_OCT1_ID}`,
    ].join('\n'),
    shippingEur: 0,
    status: 'Delivered',
    createdAt: '2026-10-01T12:00:00.000Z',
  });

  const stockAfter: Record<string, number> = {};
  for (const line of ONSITE_OCT1_LINES) {
    const row = await env.DB.prepare('SELECT stock FROM products WHERE id = ? LIMIT 1')
      .bind(line.sku)
      .first<{ stock: number }>();
    stockAfter[line.sku] = Number(row?.stock ?? 0);
  }

  const details = JSON.stringify({
    orderId: created.id,
    totalAmount: created.totalAmount,
    items: created.items,
    stockBefore,
    stockAfter,
    techTee: tee,
  });

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(ONSITE_SALE_OCT1_ID, new Date().toISOString(), details).run();

  return {
    applied: true as const,
    orderId: created.id,
    totalAmount: created.totalAmount,
    stockBefore,
    stockAfter,
    items: created.items,
  };
}

export async function onsiteSaleOct1Status(env: CommerceEnv) {
  await ensureOpsSchema(env);
  const row = await env.DB.prepare('SELECT id, applied_at, details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(ONSITE_SALE_OCT1_ID)
    .first<{ id: string; applied_at: string; details: string | null }>();

  if (!row) {
    return json({ applied: false, id: ONSITE_SALE_OCT1_ID });
  }

  return json({
    applied: true,
    id: row.id,
    appliedAt: row.applied_at,
    details: row.details ? JSON.parse(row.details) : null,
  });
}
