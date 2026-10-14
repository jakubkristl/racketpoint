type CommerceEnv = {
  DB: D1Database;
  ASSETS?: Fetcher;
};

export type OrderLineInput = {
  sku: string;
  quantity: number;
  priceEur?: number;
};

type ResolvedOrderLine = {
  sku: string;
  quantity: number;
  priceEur: number;
  /** True when units were reserved from on-hand stock (restock on cancel). */
  reserved: boolean;
  fulfillment: 'stock' | 'made_to_order';
};

const ONSITE_SALE_OCT1_ID = 'onsite-sale-2026-10-01';
const ONSITE_SALE_OCT9_ID = 'onsite-sale-2026-10-09';
const ONSITE_SALE_OCT12_ID = 'onsite-sale-2026-10-12';
/** Apply 10% Unsquashable racket promo (Bulgarian BF 13–16 Nov 2026 Sofia). */
const BF_UNSQUASHABLE_APPLY_ID = 'bf-unsquashable-rackets-2026-11';
/** Clear the same promo after Mon 16 Nov 2026 23:59 Sofia. */
const BF_UNSQUASHABLE_CLEAR_ID = 'bf-unsquashable-rackets-2026-11-clear';
/** Sale live Fri 13 Nov 00:00 Sofia (EET, UTC+2). Soft announce Wed 11 is marketing-only. */
const BF_UNSQUASHABLE_START_MS = Date.parse('2026-11-13T00:00:00+02:00');
/** Hard end Mon 16 Nov 2026 23:59:59.999 Sofia. */
const BF_UNSQUASHABLE_END_MS = Date.parse('2026-11-16T23:59:59.999+02:00');
/** All 13 live D1 Unsquashable racket SKUs (exclude shoes/bags/grips/string reel). */
export const BF_UNSQUASHABLE_RACKET_SKUS = [
  'POS-unsquashable-miguel-rodriguez-one20',
  'POS-unsquashable-miguel-rodriguez-autograph',
  'POS-unsquashable-nick-wall-125-limited-edition',
  'POS-unsquashable-hero-pro-125-brazil',
  'POS-unsquashable-y-tec-125',
  'POS-unsquashable-y-tec-pro-125',
  'POS-unsquashable-y-tec-pro-110',
  'POS-unsquashable-tour-tec-pro-125',
  'POS-unsquashable-james-willstrop-signature',
  'POS-unsquashable-ultra-lite-120',
  'POS-unsquashable-ultra-lite-135',
  'POS-unsquashable-syn-tec-125',
  'POS-unsquashable-sam-gerrits-autograph',
] as const;
const SELLABLE_CATALOG_SYNC_ID = 'sellable-catalog-sync-v1';
const SELLABLE_CATALOG_PROGRESS_ID = 'sellable-catalog-sync-v1-progress';
const SELLABLE_CATALOG_CHUNK = 40;
const AUDIT_COD_CANCEL_ID = 'cancel-audit-ord-cf478810';
const AUDIT_COD_ORDER_ID = 'ord_cf478810-c17f-462e-99fa-f3b2eefe90df';
/** Checkout audit (€1) + checkout-unblock verify (Pending/Cancelled probe). */
const CLEAR_TEST_AUDIT_ORDERS_ID = 'clear-test-audit-orders-2026-10-14';
const TEST_AUDIT_ORDER_IDS = [
  'ord_cf478810-c17f-462e-99fa-f3b2eefe90df',
  'ord_4c06b789-dfc1-4e93-b82d-493c6de1fcab',
] as const;

function roundMoneyEur(value: number) {
  return Math.round(value * 100) / 100;
}

function blackFridayUnsquashableWindow(nowMs = Date.now()) {
  if (nowMs < BF_UNSQUASHABLE_START_MS) {
    return 'before' as const;
  }
  if (nowMs <= BF_UNSQUASHABLE_END_MS) {
    return 'live' as const;
  }
  return 'after' as const;
}

type CatalogSeedRow = {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  brand?: string;
  sport?: string;
  sub_category?: string;
  cost_price?: number;
  selling_price?: number;
  discount_price?: number | null;
  stock?: number;
  images?: string[];
  attributes?: Record<string, unknown>;
  sizes?: unknown[];
  weight_grams?: number | null;
  balance?: string | null;
  rating?: number;
};

let cachedSellableRows: CatalogSeedRow[] | null = null;

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

const OLAND_JERSEY_DY = {
  id: 'POS-oland-jersey-double-yellow',
  title: 'Oland Jersey Double Yellow',
  slug: 'oland-jersey-double-yellow',
  description: 'Oland Jersey Double Yellow. Onsite club stock (Double Yellow).',
  brand: 'Oland',
  sport: 'Squash',
  subCategory: 'Apparel',
  /** User-specified club cost / sell for 2026-10-09 onsite sale. */
  costPrice: 13,
  sellingPrice: 30,
  discountPrice: null as number | null,
  stock: 1,
  images: [
    'https://reception-pos.jakub-personal.workers.dev/kiosk/store/products/apparel/Oland%20Jersey%20Double%20Yellow.jpg',
  ],
  attributes: {
    source: 'reception-pos',
    sourceSku: 'oland-jersey-double-yellow-mr9iayg9',
    onsiteSale: '2026-10-09',
  },
  sizes: [] as string[],
};

const FAST_TEC_PRO_SHOE_SKU = 'POS-unsquashable-fast-tec-pro-shoe';

/** 2026-10-09 onsite: 1× FAST-TEC Pro shoe (live Admin €95) + 1× Oland DY jersey (€30). */
const ONSITE_OCT9_LINES: Array<{ sku: string; quantity: number; expectedUnitPrice: number }> = [
  { sku: FAST_TEC_PRO_SHOE_SKU, quantity: 1, expectedUnitPrice: 95 },
  { sku: OLAND_JERSEY_DY.id, quantity: 1, expectedUnitPrice: 30 },
];

/** Club POS SKU for Dunlop Junior Protective Eyewear (not Squashpoint twin `10352187`). */
const DUNLOP_JUNIOR_EYEWEAR_SKU = 'POS-dunlop-junior-protective-eyewear';
/** User-specified onsite sell price 2026-10-12; catalog was €21 / cost €18.15. */
const DUNLOP_JUNIOR_EYEWEAR_SELL_EUR = 29;
const DUNLOP_JUNIOR_EYEWEAR_COST_EUR = 18.15;

/** 2026-10-12 onsite: 1× Dunlop Junior Protective Eyewear @ €29. */
const ONSITE_OCT12_LINES: Array<{ sku: string; quantity: number; expectedUnitPrice: number }> = [
  { sku: DUNLOP_JUNIOR_EYEWEAR_SKU, quantity: 1, expectedUnitPrice: DUNLOP_JUNIOR_EYEWEAR_SELL_EUR },
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
  // D1 exec is unreliable with multiple statements in one call — create separately.
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS ops_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL,
      details TEXT
    )`,
  ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      delta_quantity INTEGER NOT NULL,
      reason TEXT NOT NULL,
      order_id TEXT,
      actor TEXT,
      created_at TEXT NOT NULL
    )`,
  ).run();

  const info = await env.DB.prepare('PRAGMA table_info(stock_movements)').all<{ name: string }>();
  const columns = new Set((info.results ?? []).map((row) => row.name));
  if (!columns.has('delta_quantity')) {
    await env.DB.prepare('ALTER TABLE stock_movements RENAME TO stock_movements_legacy').run();
    await env.DB.prepare(
      `CREATE TABLE stock_movements (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL,
        delta_quantity INTEGER NOT NULL,
        reason TEXT NOT NULL,
        order_id TEXT,
        actor TEXT,
        created_at TEXT NOT NULL
      )`,
    ).run();
  }
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
    `INSERT INTO stock_movements (id, sku, delta_quantity, reason, order_id, actor, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    `sm_${crypto.randomUUID()}`,
    sku,
    delta,
    reason,
    orderId,
    'system',
    new Date().toISOString(),
  ).run();
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
      // Shipping is free for now (no Speedy/Econt rates).
      shippingEur: 0,
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
    /** When set, skip stock checks/decrements and force these unit prices (recovery / ops). */
    skipStockDecrement?: boolean;
  },
) {
  const resolved: ResolvedOrderLine[] = [];
  let totalAmount = 0;

  for (const item of input.items) {
    const product = await env.DB.prepare(
      'SELECT id, selling_price, discount_price, stock FROM products WHERE id = ? LIMIT 1',
    ).bind(item.sku).first<{ id: string; selling_price: number; discount_price: number | null; stock: number }>();

    if (!product) {
      throw new Error(`Product not found for SKU: ${item.sku}`);
    }

    const onHand = Number(product.stock);
    const madeToOrder = !input.skipStockDecrement && onHand <= 0;

    // Stocked items still require enough units. Stock 0 / made-to-order may order without decrement.
    if (!input.skipStockDecrement && !madeToOrder && onHand < item.quantity) {
      throw new Error(`Insufficient stock for ${item.sku} (have ${product.stock}, need ${item.quantity}).`);
    }

    const price = effectiveUnitPrice(product, item.priceEur);
    resolved.push({
      sku: item.sku,
      quantity: item.quantity,
      priceEur: price,
      reserved: input.skipStockDecrement ? false : !madeToOrder,
      fulfillment: madeToOrder ? 'made_to_order' : 'stock',
    });
    totalAmount += price * item.quantity;
  }

  totalAmount += input.shippingEur;
  const id = `ord_${crypto.randomUUID()}`;

  const statements = [];
  if (!input.skipStockDecrement) {
    for (const line of resolved) {
      if (!line.reserved) {
        continue;
      }

      statements.push(
        env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
          .bind(line.quantity, line.sku, line.quantity),
      );
      statements.push(
        env.DB.prepare(
          `INSERT INTO stock_movements (id, sku, delta_quantity, reason, order_id, actor, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          `sm_${crypto.randomUUID()}`,
          line.sku,
          -line.quantity,
          'order_reserve',
          id,
          'system',
          new Date().toISOString(),
        ),
      );
    }
  }

  statements.push(
    env.DB.prepare(
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
    ),
  );

  await env.DB.batch(statements);

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

  // Restock once on cancel/refund — only lines that reserved on-hand stock.
  if (
    (status === 'Cancelled' || status === 'Refunded')
    && existing.status !== 'Cancelled'
    && existing.status !== 'Refunded'
  ) {
    const items = typeof existing.items === 'string'
      ? JSON.parse(existing.items) as Array<{
        sku: string;
        quantity: number;
        reserved?: boolean;
        fulfillment?: string;
      }>
      : [];
    for (const line of items) {
      const qty = Math.max(1, Math.trunc(Number(line.quantity) || 1));
      const shouldRestock = line.fulfillment === 'made_to_order'
        ? false
        : line.reserved !== false;
      if (!shouldRestock) {
        continue;
      }

      await env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
        .bind(qty, line.sku)
        .run();
      await recordStockMovement(env, line.sku, qty, 'order_restock', orderId);
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
    delta: Number(row.delta_quantity ?? row.delta ?? 0),
    deltaQuantity: Number(row.delta_quantity ?? row.delta ?? 0),
    reason: row.reason,
    orderId: row.order_id,
    actor: row.actor ?? 'system',
    createdAt: row.created_at,
  })));
}

/**
 * Durable one-shot ops migration: Jakub's 2026-10-01 onsite retail sale.
 * Safe to call on every request — no-ops after first success.
 * Recovers from partial prior attempts (stock already reduced, order missing).
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
    const row = await env.DB.prepare('SELECT id, stock FROM products WHERE id = ? LIMIT 1')
      .bind(line.sku)
      .first<{ id: string; stock: number }>();

    if (!row) {
      throw new Error(`Missing product for onsite sale: ${line.sku}`);
    }

    stockBefore[line.sku] = Number(row.stock);
  }

  // Expected finals after this known sale (started at 1 / 1 / 2).
  const expectedFinal: Record<string, number> = {};
  for (const line of ONSITE_OCT1_LINES) {
    expectedFinal[line.sku] = 0;
  }

  // If a prior attempt already took racket units but failed before writing the order,
  // create the commercial order without re-decrementing those SKUs; only pull down leftovers.
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
    skipStockDecrement: true,
  });

  const reconcileStatements = [];
  for (const line of ONSITE_OCT1_LINES) {
    const current = stockBefore[line.sku] ?? 0;
    const target = expectedFinal[line.sku] ?? 0;
    if (current > target) {
      const delta = current - target;
      reconcileStatements.push(
        env.DB.prepare('UPDATE products SET stock = ? WHERE id = ?').bind(target, line.sku),
      );
      reconcileStatements.push(
        env.DB.prepare(
          `INSERT INTO stock_movements (id, sku, delta_quantity, reason, order_id, actor, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          `sm_${crypto.randomUUID()}`,
          line.sku,
          -delta,
          'order_reserve',
          created.id,
          'system',
          new Date().toISOString(),
        ),
      );
    }
  }

  if (reconcileStatements.length > 0) {
    await env.DB.batch(reconcileStatements);
  }

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
    recovery: true,
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

async function ensureOlandJerseyDy(env: CommerceEnv) {
  const existing = await env.DB.prepare(
    'SELECT id, stock, cost_price, selling_price FROM products WHERE id = ? LIMIT 1',
  )
    .bind(OLAND_JERSEY_DY.id)
    .first<{ id: string; stock: number; cost_price: number; selling_price: number }>();

  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO products (
        id, title, slug, description, brand, sport, sub_category,
        cost_price, selling_price, discount_price, stock, images, attributes, sizes,
        weight_grams, balance, rating, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 4.5, ?)`,
    ).bind(
      OLAND_JERSEY_DY.id,
      OLAND_JERSEY_DY.title,
      OLAND_JERSEY_DY.slug,
      OLAND_JERSEY_DY.description,
      OLAND_JERSEY_DY.brand,
      OLAND_JERSEY_DY.sport,
      OLAND_JERSEY_DY.subCategory,
      OLAND_JERSEY_DY.costPrice,
      OLAND_JERSEY_DY.sellingPrice,
      OLAND_JERSEY_DY.discountPrice,
      OLAND_JERSEY_DY.stock,
      JSON.stringify(OLAND_JERSEY_DY.images),
      JSON.stringify(OLAND_JERSEY_DY.attributes),
      JSON.stringify(OLAND_JERSEY_DY.sizes),
      new Date().toISOString(),
    ).run();
    return { created: true, stockBefore: OLAND_JERSEY_DY.stock };
  }

  // Lock user-specified price/cost; ensure at least 1 unit for this known sale.
  const stockBefore = Math.max(1, Number(existing.stock) || 0);
  await env.DB.prepare(
    'UPDATE products SET cost_price = ?, selling_price = ?, discount_price = NULL, stock = ? WHERE id = ?',
  )
    .bind(OLAND_JERSEY_DY.costPrice, OLAND_JERSEY_DY.sellingPrice, stockBefore, OLAND_JERSEY_DY.id)
    .run();

  return {
    created: false,
    stockBefore,
    toppedUpFrom: Number(existing.stock),
  };
}

/**
 * Durable one-shot ops migration: Jakub's 2026-10-09 onsite retail sale.
 * Seeds Oland jersey if missing, then writes one Delivered COD order (stock −1 each).
 */
export async function applyOnsiteSaleOct92026(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(ONSITE_SALE_OCT9_ID)
    .first<{ id: string }>();

  if (already?.id) {
    return { applied: false, reason: 'already-applied' as const };
  }

  const jersey = await ensureOlandJerseyDy(env);

  const stockBefore: Record<string, number> = {};
  for (const line of ONSITE_OCT9_LINES) {
    const row = await env.DB.prepare(
      'SELECT id, stock, selling_price, discount_price, cost_price FROM products WHERE id = ? LIMIT 1',
    )
      .bind(line.sku)
      .first<{
        id: string;
        stock: number;
        selling_price: number;
        discount_price: number | null;
        cost_price: number;
      }>();

    if (!row) {
      throw new Error(`Missing product for onsite sale: ${line.sku}`);
    }

    const onHand = Number(row.stock);
    if (onHand < line.quantity) {
      throw new Error(
        `Insufficient stock for onsite sale ${line.sku} (have ${onHand}, need ${line.quantity}).`,
      );
    }

    stockBefore[line.sku] = onHand;
  }

  const created = await insertCodOrder(env, {
    fullName: 'Onsite sale / Jakub',
    email: 'admin@racketpoint.bg',
    items: ONSITE_OCT9_LINES.map((line) => ({
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
      ONSITE_SALE_OCT9_ID,
      '1× Unsquashable FAST-TEC Pro shoe @ €95 + 1× Oland Jersey Double Yellow @ €30 = €125',
      `idempotency:${ONSITE_SALE_OCT9_ID}`,
    ].join('\n'),
    shippingEur: 0,
    status: 'Delivered',
    createdAt: '2026-10-09T08:00:00.000Z',
  });

  const stockAfter: Record<string, number> = {};
  const costs: Record<string, number> = {};
  for (const line of ONSITE_OCT9_LINES) {
    const row = await env.DB.prepare('SELECT stock, cost_price FROM products WHERE id = ? LIMIT 1')
      .bind(line.sku)
      .first<{ stock: number; cost_price: number }>();
    stockAfter[line.sku] = Number(row?.stock ?? 0);
    costs[line.sku] = Number(row?.cost_price ?? 0);
  }

  const revenue = created.totalAmount;
  const costTotal = ONSITE_OCT9_LINES.reduce(
    (sum, line) => sum + (costs[line.sku] ?? 0) * line.quantity,
    0,
  );

  const details = JSON.stringify({
    orderId: created.id,
    totalAmount: created.totalAmount,
    revenue,
    costTotal,
    profit: revenue - costTotal,
    items: created.items,
    stockBefore,
    stockAfter,
    costs,
    olandJersey: jersey,
  });

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(ONSITE_SALE_OCT9_ID, new Date().toISOString(), details).run();

  return {
    applied: true as const,
    orderId: created.id,
    totalAmount: created.totalAmount,
    revenue,
    costTotal,
    profit: revenue - costTotal,
    stockBefore,
    stockAfter,
    items: created.items,
  };
}

export async function onsiteSaleOct9Status(env: CommerceEnv) {
  await ensureOpsSchema(env);
  const row = await env.DB.prepare('SELECT id, applied_at, details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(ONSITE_SALE_OCT9_ID)
    .first<{ id: string; applied_at: string; details: string | null }>();

  if (!row) {
    return json({ applied: false, id: ONSITE_SALE_OCT9_ID });
  }

  return json({
    applied: true,
    id: row.id,
    appliedAt: row.applied_at,
    details: row.details ? JSON.parse(row.details) : null,
  });
}

/**
 * Lock club sell price to the onsite €29 before creating the COD line.
 * Keeps known club cost; does not invent stock.
 */
async function ensureDunlopJuniorEyewearPrice(env: CommerceEnv) {
  const existing = await env.DB.prepare(
    'SELECT id, stock, cost_price, selling_price FROM products WHERE id = ? LIMIT 1',
  )
    .bind(DUNLOP_JUNIOR_EYEWEAR_SKU)
    .first<{ id: string; stock: number; cost_price: number; selling_price: number }>();

  if (!existing) {
    throw new Error(`Missing product for onsite sale: ${DUNLOP_JUNIOR_EYEWEAR_SKU}`);
  }

  const cost = Number(existing.cost_price) > 0
    ? Number(existing.cost_price)
    : DUNLOP_JUNIOR_EYEWEAR_COST_EUR;

  await env.DB.prepare(
    'UPDATE products SET cost_price = ?, selling_price = ?, discount_price = NULL WHERE id = ?',
  )
    .bind(cost, DUNLOP_JUNIOR_EYEWEAR_SELL_EUR, DUNLOP_JUNIOR_EYEWEAR_SKU)
    .run();

  return {
    stockBeforeUpdate: Number(existing.stock),
    sellingBefore: Number(existing.selling_price),
    cost,
  };
}

/**
 * Durable one-shot ops migration: Jakub's 2026-10-12 onsite Dunlop Junior Eyewear sale.
 * Sets sell €29, then writes one Delivered COD order (stock −1).
 */
export async function applyOnsiteSaleOct122026(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(ONSITE_SALE_OCT12_ID)
    .first<{ id: string }>();

  if (already?.id) {
    return { applied: false, reason: 'already-applied' as const };
  }

  const priceLock = await ensureDunlopJuniorEyewearPrice(env);

  const stockBefore: Record<string, number> = {};
  for (const line of ONSITE_OCT12_LINES) {
    const row = await env.DB.prepare(
      'SELECT id, stock, selling_price, discount_price, cost_price FROM products WHERE id = ? LIMIT 1',
    )
      .bind(line.sku)
      .first<{
        id: string;
        stock: number;
        selling_price: number;
        discount_price: number | null;
        cost_price: number;
      }>();

    if (!row) {
      throw new Error(`Missing product for onsite sale: ${line.sku}`);
    }

    const onHand = Number(row.stock);
    if (onHand < line.quantity) {
      throw new Error(
        `Insufficient stock for onsite sale ${line.sku} (have ${onHand}, need ${line.quantity}).`,
      );
    }

    stockBefore[line.sku] = onHand;
  }

  const created = await insertCodOrder(env, {
    fullName: 'Onsite sale / Jakub',
    email: 'admin@racketpoint.bg',
    items: ONSITE_OCT12_LINES.map((line) => ({
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
      ONSITE_SALE_OCT12_ID,
      '1× Dunlop Junior Protective Eyewear @ €29',
      `idempotency:${ONSITE_SALE_OCT12_ID}`,
    ].join('\n'),
    shippingEur: 0,
    status: 'Delivered',
    createdAt: '2026-10-12T12:00:00.000Z',
  });

  const stockAfter: Record<string, number> = {};
  const costs: Record<string, number> = {};
  for (const line of ONSITE_OCT12_LINES) {
    const row = await env.DB.prepare('SELECT stock, cost_price FROM products WHERE id = ? LIMIT 1')
      .bind(line.sku)
      .first<{ stock: number; cost_price: number }>();
    stockAfter[line.sku] = Number(row?.stock ?? 0);
    costs[line.sku] = Number(row?.cost_price ?? 0);
  }

  const revenue = created.totalAmount;
  const costTotal = ONSITE_OCT12_LINES.reduce(
    (sum, line) => sum + (costs[line.sku] ?? 0) * line.quantity,
    0,
  );

  const details = JSON.stringify({
    orderId: created.id,
    totalAmount: created.totalAmount,
    revenue,
    costTotal,
    profit: revenue - costTotal,
    items: created.items,
    stockBefore,
    stockAfter,
    costs,
    priceLock,
  });

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(ONSITE_SALE_OCT12_ID, new Date().toISOString(), details).run();

  return {
    applied: true as const,
    orderId: created.id,
    totalAmount: created.totalAmount,
    revenue,
    costTotal,
    profit: revenue - costTotal,
    stockBefore,
    stockAfter,
    items: created.items,
  };
}

export async function onsiteSaleOct12Status(env: CommerceEnv) {
  await ensureOpsSchema(env);
  const row = await env.DB.prepare('SELECT id, applied_at, details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(ONSITE_SALE_OCT12_ID)
    .first<{ id: string; applied_at: string; details: string | null }>();

  if (!row) {
    return json({ applied: false, id: ONSITE_SALE_OCT12_ID });
  }

  return json({
    applied: true,
    id: row.id,
    appliedAt: row.applied_at,
    details: row.details ? JSON.parse(row.details) : null,
  });
}

/**
 * Bulgarian Black Friday: set discount_price = round(selling_price × 0.9, 2) on all 13
 * Unsquashable racket SKUs. Leaves selling_price / cost_price unchanged.
 * Date-gated to Fri 13 Nov 00:00 → Mon 16 Nov 23:59 Sofia unless `force`.
 * Re-ensures prices while the apply migration is recorded and window is live
 * (guards against catalog-sync wiping promo mid-sale).
 */
export async function applyBlackFridayUnsquashableDiscount(
  env: CommerceEnv,
  options?: { force?: boolean; nowMs?: number },
) {
  await ensureOpsSchema(env);

  const nowMs = options?.nowMs ?? Date.now();
  const window = blackFridayUnsquashableWindow(nowMs);
  if (!options?.force && window === 'before') {
    return { applied: false as const, reason: 'before-window' as const, window };
  }
  if (!options?.force && window === 'after') {
    return { applied: false as const, reason: 'after-window' as const, window };
  }

  const clearRow = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(BF_UNSQUASHABLE_CLEAR_ID)
    .first<{ id: string }>();
  if (clearRow?.id && !options?.force) {
    return { applied: false as const, reason: 'already-cleared' as const, window };
  }

  const prices: Array<{
    sku: string;
    title: string;
    sellingPrice: number;
    discountBefore: number | null;
    discountAfter: number;
    updated: boolean;
  }> = [];

  for (const sku of BF_UNSQUASHABLE_RACKET_SKUS) {
    const row = await env.DB.prepare(
      'SELECT id, title, selling_price, discount_price FROM products WHERE id = ? LIMIT 1',
    )
      .bind(sku)
      .first<{ id: string; title: string; selling_price: number; discount_price: number | null }>();

    if (!row) {
      throw new Error(`Missing product for Black Friday promo: ${sku}`);
    }

    const sellingPrice = Number(row.selling_price);
    const discountAfter = roundMoneyEur(sellingPrice * 0.9);
    const discountBefore = row.discount_price == null ? null : Number(row.discount_price);
    const needsUpdate = discountBefore == null || Math.abs(discountBefore - discountAfter) > 0.001;

    if (needsUpdate) {
      await env.DB.prepare('UPDATE products SET discount_price = ? WHERE id = ?')
        .bind(discountAfter, sku)
        .run();
    }

    prices.push({
      sku,
      title: row.title,
      sellingPrice,
      discountBefore,
      discountAfter,
      updated: needsUpdate,
    });
  }

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(BF_UNSQUASHABLE_APPLY_ID)
    .first<{ id: string }>();

  const updatedCount = prices.filter((row) => row.updated).length;
  const details = JSON.stringify({
    window,
    forced: Boolean(options?.force),
    skus: [...BF_UNSQUASHABLE_RACKET_SKUS],
    prices,
    updatedCount,
  });

  if (!already?.id) {
    await env.DB.prepare(
      'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
    ).bind(BF_UNSQUASHABLE_APPLY_ID, new Date().toISOString(), details).run();
  } else if (updatedCount > 0) {
    await env.DB.prepare('UPDATE ops_migrations SET details = ?, applied_at = ? WHERE id = ?')
      .bind(details, new Date().toISOString(), BF_UNSQUASHABLE_APPLY_ID)
      .run();
  }

  if (updatedCount === 0 && already?.id) {
    return { applied: false as const, reason: 'already-applied' as const, window, prices };
  }

  return {
    applied: true as const,
    window,
    updatedCount,
    prices,
  };
}

/**
 * End of BF: clear discount_price on the same 13 Unsquashable racket SKUs.
 * Runs automatically after Mon 16 Nov 23:59 Sofia, or immediately with `force`
 * (ops rollback / Mon 16 end checklist).
 */
export async function clearBlackFridayUnsquashableDiscount(
  env: CommerceEnv,
  options?: { force?: boolean; nowMs?: number },
) {
  await ensureOpsSchema(env);

  const nowMs = options?.nowMs ?? Date.now();
  const window = blackFridayUnsquashableWindow(nowMs);
  if (!options?.force && window !== 'after') {
    return { applied: false as const, reason: 'still-in-or-before-window' as const, window };
  }

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(BF_UNSQUASHABLE_CLEAR_ID)
    .first<{ id: string }>();

  if (already?.id && !options?.force) {
    return { applied: false as const, reason: 'already-cleared' as const, window };
  }

  const cleared: Array<{
    sku: string;
    title: string;
    sellingPrice: number;
    discountBefore: number | null;
  }> = [];

  for (const sku of BF_UNSQUASHABLE_RACKET_SKUS) {
    const row = await env.DB.prepare(
      'SELECT id, title, selling_price, discount_price FROM products WHERE id = ? LIMIT 1',
    )
      .bind(sku)
      .first<{ id: string; title: string; selling_price: number; discount_price: number | null }>();

    if (!row) {
      throw new Error(`Missing product for Black Friday clear: ${sku}`);
    }

    const discountBefore = row.discount_price == null ? null : Number(row.discount_price);
    if (discountBefore != null) {
      await env.DB.prepare('UPDATE products SET discount_price = NULL WHERE id = ?')
        .bind(sku)
        .run();
    }

    cleared.push({
      sku,
      title: row.title,
      sellingPrice: Number(row.selling_price),
      discountBefore,
    });
  }

  const details = JSON.stringify({
    window,
    forced: Boolean(options?.force),
    skus: [...BF_UNSQUASHABLE_RACKET_SKUS],
    cleared,
  });

  if (already?.id) {
    await env.DB.prepare('UPDATE ops_migrations SET details = ?, applied_at = ? WHERE id = ?')
      .bind(details, new Date().toISOString(), BF_UNSQUASHABLE_CLEAR_ID)
      .run();
  } else {
    await env.DB.prepare(
      'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
    ).bind(BF_UNSQUASHABLE_CLEAR_ID, new Date().toISOString(), details).run();
  }

  return { applied: true as const, window, cleared };
}

/** Status for BF Unsquashable apply + clear migrations and current window. */
export async function blackFridayUnsquashableStatus(env: CommerceEnv) {
  await ensureOpsSchema(env);
  const window = blackFridayUnsquashableWindow();
  const applyRow = await env.DB.prepare('SELECT id, applied_at, details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(BF_UNSQUASHABLE_APPLY_ID)
    .first<{ id: string; applied_at: string; details: string | null }>();
  const clearRow = await env.DB.prepare('SELECT id, applied_at, details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(BF_UNSQUASHABLE_CLEAR_ID)
    .first<{ id: string; applied_at: string; details: string | null }>();

  return json({
    window,
    startsAt: new Date(BF_UNSQUASHABLE_START_MS).toISOString(),
    endsAt: new Date(BF_UNSQUASHABLE_END_MS).toISOString(),
    skus: [...BF_UNSQUASHABLE_RACKET_SKUS],
    apply: applyRow
      ? {
          applied: true,
          id: applyRow.id,
          appliedAt: applyRow.applied_at,
          details: applyRow.details ? JSON.parse(applyRow.details) : null,
        }
      : { applied: false, id: BF_UNSQUASHABLE_APPLY_ID },
    clear: clearRow
      ? {
          applied: true,
          id: clearRow.id,
          appliedAt: clearRow.applied_at,
          details: clearRow.details ? JSON.parse(clearRow.details) : null,
        }
      : { applied: false, id: BF_UNSQUASHABLE_CLEAR_ID },
  });
}

function normalizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
}

function toSeedRow(raw: Record<string, unknown>): CatalogSeedRow | null {
  const id = String(raw.id ?? raw.sku ?? '').trim();
  const title = String(raw.title ?? raw.name ?? '').trim();
  if (!id || !title) {
    return null;
  }

  const images = Array.isArray(raw.images)
    ? raw.images.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : Array.isArray(raw.imageArray)
      ? raw.imageArray.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : typeof raw.imageUrl === 'string' && raw.imageUrl.trim()
        ? [raw.imageUrl.trim()]
        : [];

  const originalPrice = Number(raw.originalPriceEur ?? raw.selling_price ?? raw.sellingPrice ?? NaN);
  const salePrice = Number(raw.salePriceEur ?? raw.discount_price ?? raw.discountPrice ?? NaN);
  const fallbackPrice = Number(raw.priceEur ?? 0) || 0;
  const sellingPrice = Number.isFinite(originalPrice) && originalPrice > 0
    ? originalPrice
    : (Number.isFinite(salePrice) && salePrice > 0 ? salePrice : fallbackPrice);
  const discountPrice = Number.isFinite(salePrice) && salePrice > 0 && salePrice < sellingPrice
    ? salePrice
    : (raw.discount_price == null && raw.discountPrice == null
      ? null
      : Number(raw.discount_price ?? raw.discountPrice));

  return {
    id,
    title,
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    description: String(raw.description ?? raw.details ?? title),
    brand: String(raw.brand ?? 'Racketpoint'),
    sport: String(raw.sport ?? raw.categorySlug ?? 'squash'),
    sub_category: String(raw.sub_category ?? raw.subCategory ?? 'Rackets'),
    cost_price: Number(raw.cost_price ?? raw.costPrice ?? raw.costEur ?? 0) || 0,
    selling_price: sellingPrice,
    discount_price: discountPrice == null || !Number.isFinite(Number(discountPrice))
      ? null
      : Number(discountPrice),
    stock: Math.max(0, Math.trunc(Number(raw.stock ?? 0) || 0)),
    images,
    attributes: raw.attributes && typeof raw.attributes === 'object'
      ? raw.attributes as Record<string, unknown>
      : {},
    sizes: Array.isArray(raw.sizes) ? raw.sizes : [],
    weight_grams: raw.weight_grams == null && raw.weightGrams == null
      ? null
      : Math.trunc(Number(raw.weight_grams ?? raw.weightGrams)),
    balance: typeof raw.balance === 'string' ? raw.balance : null,
    rating: Number(raw.rating ?? 4.5) || 4.5,
  };
}

async function fetchAssetJsonArray(env: CommerceEnv, path: string) {
  if (!env.ASSETS) {
    return [] as CatalogSeedRow[];
  }

  const response = await env.ASSETS.fetch(new Request(`https://assets.local${path}`));
  if (!response.ok) {
    return [] as CatalogSeedRow[];
  }

  const payload = await response.json().catch(() => null);
  if (!Array.isArray(payload)) {
    return [] as CatalogSeedRow[];
  }

  return payload
    .map((entry) => toSeedRow(entry as Record<string, unknown>))
    .filter((row): row is CatalogSeedRow => Boolean(row));
}

async function upsertCatalogRows(
  env: CommerceEnv,
  rows: CatalogSeedRow[],
  options?: { overwriteStock?: boolean },
) {
  let inserted = 0;
  let updated = 0;

  for (const product of rows) {
    const existing = await env.DB.prepare('SELECT id, stock FROM products WHERE id = ? LIMIT 1')
      .bind(product.id)
      .first<{ id: string; stock: number }>();

    const slugBase = normalizeSlug(String(product.slug ?? product.title).replace(/\.html$/i, ''));
    const slug = `${slugBase}-${product.id}`.slice(0, 180);
    const incomingStock = Math.max(0, Math.trunc(Number(product.stock ?? 0) || 0));
    const stock = options?.overwriteStock || !existing
      ? incomingStock
      : Number(existing.stock);

    const values = [
      product.id,
      product.title,
      slug,
      product.description ?? product.title,
      product.brand ?? 'Racketpoint',
      product.sport ?? 'squash',
      product.sub_category ?? 'Rackets',
      Math.max(0, Number(product.cost_price ?? 0) || 0),
      Math.max(0, Number(product.selling_price ?? 0) || 0),
      product.discount_price == null ? null : Math.max(0, Number(product.discount_price) || 0),
      stock,
      JSON.stringify(product.images ?? []),
      JSON.stringify(product.attributes ?? {}),
      JSON.stringify(product.sizes ?? []),
      product.weight_grams == null ? null : Math.trunc(Number(product.weight_grams)),
      product.balance ?? null,
      Math.max(0, Number(product.rating ?? 4.5) || 4.5),
      new Date().toISOString(),
    ] as const;

    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO products (
          id, title, slug, description, brand, sport, sub_category,
          cost_price, selling_price, discount_price, stock, images, attributes, sizes,
          weight_grams, balance, rating, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(...values).run();
      inserted += 1;
      continue;
    }

    if (options?.overwriteStock) {
      await env.DB.prepare(
        `UPDATE products SET
          title=?, slug=?, description=?, brand=?, sport=?, sub_category=?,
          cost_price=?, selling_price=?, discount_price=?, stock=?, images=?, attributes=?,
          sizes=?, weight_grams=?, balance=?, rating=?
         WHERE id=?`,
      ).bind(
        values[1], values[2], values[3], values[4], values[5], values[6],
        values[7], values[8], values[9], values[10], values[11], values[12],
        values[13], values[14], values[15], values[16],
        product.id,
      ).run();
    } else {
      await env.DB.prepare(
        `UPDATE products SET
          title=?, slug=?, description=?, brand=?, sport=?, sub_category=?,
          cost_price=?, selling_price=?, discount_price=?, images=?, attributes=?,
          sizes=?, weight_grams=?, balance=?, rating=?
         WHERE id=?`,
      ).bind(
        values[1], values[2], values[3], values[4], values[5], values[6],
        values[7], values[8], values[9], values[11], values[12],
        values[13], values[14], values[15], values[16],
        product.id,
      ).run();
    }

    updated += 1;
  }

  return { inserted, updated, processed: rows.length };
}

async function loadSellableCatalogRows(env: CommerceEnv) {
  if (cachedSellableRows) {
    return cachedSellableRows;
  }

  const [importRows, clubRows] = await Promise.all([
    fetchAssetJsonArray(env, '/imports/squashpoint-products.json'),
    fetchAssetJsonArray(env, '/imports/club-pos-d1.json'),
  ]);

  const byId = new Map<string, CatalogSeedRow>();
  for (const row of importRows) {
    byId.set(row.id, row);
  }
  // Club POS overrides import when SKUs collide (club truth for onsite stocked SKUs).
  for (const row of clubRows) {
    byId.set(row.id, row);
  }

  cachedSellableRows = [...byId.values()];
  return cachedSellableRows;
}

/**
 * Chunked catalog upsert so Worker CPU limits are not blown on one request.
 * Preserves existing on-hand stock for products already in D1.
 * Call repeatedly (or via waitUntil) until `done: true`.
 */
export async function applySellableCatalogSync(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(SELLABLE_CATALOG_SYNC_ID)
    .first<{ id: string }>();

  if (already?.id) {
    return { applied: false as const, reason: 'already-applied' as const, done: true as const };
  }

  const rows = await loadSellableCatalogRows(env);
  if (rows.length === 0) {
    throw new Error('Sellable catalog seed assets were empty or unavailable.');
  }

  const progressRow = await env.DB.prepare('SELECT details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(SELLABLE_CATALOG_PROGRESS_ID)
    .first<{ details: string | null }>();

  const progress = progressRow?.details
    ? JSON.parse(progressRow.details) as { offset?: number; inserted?: number; updated?: number }
    : { offset: 0, inserted: 0, updated: 0 };

  const offset = Math.max(0, Math.trunc(Number(progress.offset ?? 0) || 0));
  const chunk = rows.slice(offset, offset + SELLABLE_CATALOG_CHUNK);
  const result = chunk.length > 0
    ? await upsertCatalogRows(env, chunk, { overwriteStock: false })
    : { inserted: 0, updated: 0, processed: 0 };

  const nextOffset = offset + chunk.length;
  const inserted = Number(progress.inserted ?? 0) + result.inserted;
  const updated = Number(progress.updated ?? 0) + result.updated;
  const done = nextOffset >= rows.length;

  if (done) {
    const total = await env.DB.prepare('SELECT COUNT(*) AS count FROM products').first<{ count: number }>();
    await env.DB.prepare('DELETE FROM ops_migrations WHERE id = ?').bind(SELLABLE_CATALOG_PROGRESS_ID).run();
    await env.DB.prepare(
      'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
    ).bind(
      SELLABLE_CATALOG_SYNC_ID,
      new Date().toISOString(),
      JSON.stringify({
        inserted,
        updated,
        processed: rows.length,
        totalProducts: Number(total?.count ?? 0),
        chunked: true,
      }),
    ).run();

    return {
      applied: true as const,
      done: true as const,
      inserted,
      updated,
      processed: rows.length,
      totalProducts: Number(total?.count ?? 0),
    };
  }

  const details = JSON.stringify({ offset: nextOffset, inserted, updated, total: rows.length });
  if (progressRow) {
    await env.DB.prepare('UPDATE ops_migrations SET details = ?, applied_at = ? WHERE id = ?')
      .bind(details, new Date().toISOString(), SELLABLE_CATALOG_PROGRESS_ID)
      .run();
  } else {
    await env.DB.prepare(
      'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
    ).bind(SELLABLE_CATALOG_PROGRESS_ID, new Date().toISOString(), details).run();
  }

  return {
    applied: true as const,
    done: false as const,
    offset: nextOffset,
    inserted,
    updated,
    processed: nextOffset,
    total: rows.length,
  };
}

export async function syncCatalogFromRequest(request: Request, env: CommerceEnv) {
  await ensureOpsSchema(env);

  const body = await request.json<{ products?: unknown[]; overwriteStock?: boolean }>().catch(() => null);
  if (!body || !Array.isArray(body.products) || body.products.length === 0) {
    return json({ error: 'Payload must include a non-empty products array.' }, 400);
  }

  const rows = body.products
    .map((entry) => toSeedRow(entry as Record<string, unknown>))
    .filter((row): row is CatalogSeedRow => Boolean(row));

  if (rows.length === 0) {
    return json({ error: 'No valid products in payload.' }, 400);
  }

  const result = await upsertCatalogRows(env, rows, { overwriteStock: Boolean(body.overwriteStock) });
  const total = await env.DB.prepare('SELECT COUNT(*) AS count FROM products').first<{ count: number }>();

  return json({
    ok: true,
    ...result,
    totalProducts: Number(total?.count ?? 0),
  });
}

/** Cancel the checkout-audit COD probe and restock USQR24014 if still open. */
export async function cancelAuditCodProbe(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(AUDIT_COD_CANCEL_ID)
    .first<{ id: string }>();

  if (already?.id) {
    return { applied: false as const, reason: 'already-applied' as const };
  }

  const existing = await env.DB.prepare('SELECT id, status, items FROM orders WHERE id = ? LIMIT 1')
    .bind(AUDIT_COD_ORDER_ID)
    .first<{ id: string; status: string; items: string }>();

  if (!existing) {
    await env.DB.prepare(
      'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
    ).bind(
      AUDIT_COD_CANCEL_ID,
      new Date().toISOString(),
      JSON.stringify({ orderId: AUDIT_COD_ORDER_ID, found: false }),
    ).run();
    return { applied: true as const, found: false as const, orderId: AUDIT_COD_ORDER_ID };
  }

  if (existing.status === 'Cancelled' || existing.status === 'Refunded') {
    await env.DB.prepare(
      'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
    ).bind(
      AUDIT_COD_CANCEL_ID,
      new Date().toISOString(),
      JSON.stringify({ orderId: AUDIT_COD_ORDER_ID, found: true, alreadyStatus: existing.status }),
    ).run();
    return {
      applied: true as const,
      found: true as const,
      orderId: AUDIT_COD_ORDER_ID,
      status: existing.status,
      restocked: false as const,
    };
  }

  const items = typeof existing.items === 'string'
    ? JSON.parse(existing.items) as Array<{ sku: string; quantity: number; reserved?: boolean; fulfillment?: string }>
    : [];

  for (const line of items) {
    const qty = Math.max(1, Math.trunc(Number(line.quantity) || 1));
    const shouldRestock = line.fulfillment === 'made_to_order' ? false : line.reserved !== false;
    if (!shouldRestock) {
      continue;
    }
    await env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
      .bind(qty, line.sku)
      .run();
    await recordStockMovement(env, line.sku, qty, 'order_restock', AUDIT_COD_ORDER_ID);
  }

  await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?')
    .bind('Cancelled', AUDIT_COD_ORDER_ID)
    .run();

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(
    AUDIT_COD_CANCEL_ID,
    new Date().toISOString(),
    JSON.stringify({ orderId: AUDIT_COD_ORDER_ID, found: true, status: 'Cancelled', restocked: true }),
  ).run();

  return {
    applied: true as const,
    found: true as const,
    orderId: AUDIT_COD_ORDER_ID,
    status: 'Cancelled' as const,
    restocked: true as const,
  };
}

/** Hard-delete known checkout test/audit probe orders so they leave Admin + P&L. */
export async function clearTestAuditOrders(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(CLEAR_TEST_AUDIT_ORDERS_ID)
    .first<{ id: string }>();

  if (already?.id) {
    return { applied: false as const, reason: 'already-applied' as const };
  }

  const deleted: string[] = [];
  const missing: string[] = [];

  for (const orderId of TEST_AUDIT_ORDER_IDS) {
    const existing = await env.DB.prepare('SELECT id, status FROM orders WHERE id = ? LIMIT 1')
      .bind(orderId)
      .first<{ id: string; status: string }>();

    if (!existing) {
      missing.push(orderId);
      continue;
    }

    await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(orderId).run();
    deleted.push(orderId);
  }

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(
    CLEAR_TEST_AUDIT_ORDERS_ID,
    new Date().toISOString(),
    JSON.stringify({ deleted, missing, orderIds: [...TEST_AUDIT_ORDER_IDS] }),
  ).run();

  return {
    applied: true as const,
    deleted,
    missing,
  };
}

export async function clearTestAuditOrdersStatus(env: CommerceEnv) {
  await ensureOpsSchema(env);
  const row = await env.DB.prepare('SELECT id, applied_at, details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(CLEAR_TEST_AUDIT_ORDERS_ID)
    .first<{ id: string; applied_at: string; details: string }>();

  const lingering: string[] = [];
  for (const orderId of TEST_AUDIT_ORDER_IDS) {
    const existing = await env.DB.prepare('SELECT id FROM orders WHERE id = ? LIMIT 1')
      .bind(orderId)
      .first<{ id: string }>();
    if (existing?.id) {
      lingering.push(orderId);
    }
  }

  return json({
    id: CLEAR_TEST_AUDIT_ORDERS_ID,
    applied: Boolean(row?.id),
    appliedAt: row?.applied_at ?? null,
    details: row?.details ? JSON.parse(row.details) : null,
    lingering,
  });
}
