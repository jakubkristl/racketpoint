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
/** Lock list prices for Y-TEC PRO 120/125 + Dunlop Sonic Core Ultimate 132. */
const CATALOG_PRICE_YTEC_DUNLOP_ID = 'catalog-price-ytec-dunlop-2026-10-14';
/**
 * Retail list price locks (Admin / Jakub 2026-10-14).
 * Y-TEC PRO 120 has no club POS SKU — live row is Squashpoint `USQR24014`.
 * Dunlop “Sonic care 132” matches catalog title Dunlop Sonic Core Ultimate 132.
 * Clears discount_price so BF/Squashpoint promo fields do not undercut list until BF window.
 */
export const CATALOG_PRICE_YTEC_DUNLOP_UPDATES = [
  {
    sku: 'USQR24014',
    title: 'UNSQUASHABLE Y-TEC PRO 120',
    sellingPrice: 127,
  },
  {
    sku: 'POS-unsquashable-y-tec-pro-125',
    title: 'Unsquashable Y-TEC PRO 125',
    sellingPrice: 132,
  },
  {
    sku: 'POS-dunlop-sonic-core-ultimate-132',
    title: 'Dunlop Sonic Core Ultimate 132',
    sellingPrice: 147,
  },
] as const;
/**
 * Club website shelf was €165; racketpoint club listing was €125.
 * Raise the club selling price only. Do not touch discount_price — Black Weekend
 * 13–16 Nov 2026 keeps its own discount on the Unsquashable rackets.
 */
const SHOP_PRICE_MATCH_ID = 'shop-price-match-2026-11-13';
const CARBOFLEX_120_XTOP_V2_SKU = 'POS-tecnifibre-carboflex-120-x-top-v2';
const CARBOFLEX_120_XTOP_V2_SELL_EUR = 165;
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
    /** Stable id for an ops migration. Storefront orders leave this unset. */
    id?: string;
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
  const id = input.id?.trim() || `ord_${crypto.randomUUID()}`;

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
 * Ensure list selling_price and clear discount_price for the three Jakub price locks.
 * Re-runs while the ops migration is recorded so catalog-sync cannot wipe list prices.
 */
async function ensureCatalogPriceYtecDunlop(
  env: CommerceEnv,
): Promise<Array<{
  sku: string;
  title: string;
  sellingBefore: number | null;
  discountBefore: number | null;
  sellingAfter: number;
  missing: boolean;
}>> {
  const results: Array<{
    sku: string;
    title: string;
    sellingBefore: number | null;
    discountBefore: number | null;
    sellingAfter: number;
    missing: boolean;
  }> = [];

  for (const update of CATALOG_PRICE_YTEC_DUNLOP_UPDATES) {
    const row = await env.DB.prepare(
      'SELECT id, title, selling_price, discount_price FROM products WHERE id = ? LIMIT 1',
    )
      .bind(update.sku)
      .first<{ id: string; title: string; selling_price: number; discount_price: number | null }>();

    if (!row) {
      results.push({
        sku: update.sku,
        title: update.title,
        sellingBefore: null,
        discountBefore: null,
        sellingAfter: update.sellingPrice,
        missing: true,
      });
      continue;
    }

    const sellingBefore = Number(row.selling_price);
    const discountBefore = row.discount_price == null ? null : Number(row.discount_price);
    await env.DB.prepare(
      'UPDATE products SET selling_price = ?, discount_price = NULL WHERE id = ?',
    )
      .bind(update.sellingPrice, update.sku)
      .run();

    results.push({
      sku: update.sku,
      title: row.title || update.title,
      sellingBefore,
      discountBefore,
      sellingAfter: update.sellingPrice,
      missing: false,
    });
  }

  return results;
}

/**
 * Durable ops migration: set Y-TEC PRO 120/125 + Dunlop Sonic Core Ultimate 132 list prices.
 * Clears discount_price (null until BF 13–16 Nov recalculates Unsquashable rackets from selling).
 */
export async function applyCatalogPriceYtecDunlop(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(CATALOG_PRICE_YTEC_DUNLOP_ID)
    .first<{ id: string }>();

  const updates = await ensureCatalogPriceYtecDunlop(env);
  const missing = updates.filter((row) => row.missing).map((row) => row.sku);
  if (missing.length > 0) {
    throw new Error(`Missing product(s) for catalog price update: ${missing.join(', ')}`);
  }

  const details = JSON.stringify({
    updates,
    targets: CATALOG_PRICE_YTEC_DUNLOP_UPDATES,
  });

  if (already?.id) {
    await env.DB.prepare('UPDATE ops_migrations SET details = ?, applied_at = ? WHERE id = ?')
      .bind(details, new Date().toISOString(), CATALOG_PRICE_YTEC_DUNLOP_ID)
      .run();
    return { applied: false as const, reason: 'already-applied' as const, reEnsured: true as const, updates };
  }

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(CATALOG_PRICE_YTEC_DUNLOP_ID, new Date().toISOString(), details).run();

  return { applied: true as const, updates };
}

export async function catalogPriceYtecDunlopStatus(env: CommerceEnv) {
  await ensureOpsSchema(env);
  const row = await env.DB.prepare('SELECT id, applied_at, details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(CATALOG_PRICE_YTEC_DUNLOP_ID)
    .first<{ id: string; applied_at: string; details: string | null }>();

  const live: Array<{
    sku: string;
    title: string;
    sellingPrice: number | null;
    discountPrice: number | null;
    missing: boolean;
  }> = [];

  for (const update of CATALOG_PRICE_YTEC_DUNLOP_UPDATES) {
    const product = await env.DB.prepare(
      'SELECT id, title, selling_price, discount_price FROM products WHERE id = ? LIMIT 1',
    )
      .bind(update.sku)
      .first<{ id: string; title: string; selling_price: number; discount_price: number | null }>();

    live.push({
      sku: update.sku,
      title: product?.title ?? update.title,
      sellingPrice: product ? Number(product.selling_price) : null,
      discountPrice: product?.discount_price == null ? null : Number(product.discount_price),
      missing: !product,
    });
  }

  if (!row) {
    return json({ applied: false, id: CATALOG_PRICE_YTEC_DUNLOP_ID, targets: CATALOG_PRICE_YTEC_DUNLOP_UPDATES, live });
  }

  return json({
    applied: true,
    id: row.id,
    appliedAt: row.applied_at,
    details: row.details ? JSON.parse(row.details) : null,
    targets: CATALOG_PRICE_YTEC_DUNLOP_UPDATES,
    live,
  });
}

/**
 * Raise Tecnifibre Carboflex 120 X-Top V2 club shelf to €165 when it is lower.
 * Leaves discount_price unchanged so a temporary sale is not cleared.
 */
export async function applyShopPriceMatch(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const row = await env.DB.prepare(
    'SELECT id, title, selling_price, discount_price FROM products WHERE id = ? LIMIT 1',
  )
    .bind(CARBOFLEX_120_XTOP_V2_SKU)
    .first<{ id: string; title: string; selling_price: number; discount_price: number | null }>();

  const sellingBefore = row ? Number(row.selling_price) : null;
  const discountBefore = row?.discount_price == null ? null : Number(row.discount_price);
  const needsRaise = sellingBefore != null && sellingBefore < CARBOFLEX_120_XTOP_V2_SELL_EUR;

  if (needsRaise) {
    await env.DB.prepare('UPDATE products SET selling_price = ? WHERE id = ?')
      .bind(CARBOFLEX_120_XTOP_V2_SELL_EUR, CARBOFLEX_120_XTOP_V2_SKU)
      .run();
  }

  const details = JSON.stringify({
    sku: CARBOFLEX_120_XTOP_V2_SKU,
    title: row?.title ?? 'Tecnifibre Carboflex 120 X-Top V2',
    sellingBefore,
    sellingAfter: needsRaise ? CARBOFLEX_120_XTOP_V2_SELL_EUR : sellingBefore,
    discountPrice: discountBefore,
    missing: !row,
    raised: needsRaise,
  });

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(SHOP_PRICE_MATCH_ID)
    .first<{ id: string }>();

  if (already?.id) {
    if (needsRaise) {
      await env.DB.prepare('UPDATE ops_migrations SET details = ?, applied_at = ? WHERE id = ?')
        .bind(details, new Date().toISOString(), SHOP_PRICE_MATCH_ID)
        .run();
    }
    return {
      applied: false as const,
      reason: 'already-applied' as const,
      reEnsured: needsRaise,
      sellingBefore,
      discountPrice: discountBefore,
      missing: !row,
    };
  }

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(SHOP_PRICE_MATCH_ID, new Date().toISOString(), details).run();

  return {
    applied: true as const,
    sellingBefore,
    sellingAfter: needsRaise ? CARBOFLEX_120_XTOP_V2_SELL_EUR : sellingBefore,
    discountPrice: discountBefore,
    missing: !row,
    raised: needsRaise,
  };
}

const SQUASHPOINT_INVOICE_248151_ID = 'squashpoint-invoice-248151-2026-11-12';

const FAST_TEC_DESCRIPTION_BG = 'Обувка за скуош UNSQUASHABLE FAST-TEC PRO — най-лекият и най-нисък модел в серията. Разработена заедно с топ играчи, сред които Мигел Родригес, за бързо ускорение и контрол във всяка посока. Ултралеката горна част и Carbon Torsion Unit дават стабилност, без да отнемат гъвкавост. Тънката междинна подметка Speed-Tec държи стъпалото близо до пода, а U-FOAM омекотява петата и предната част. Подметката AbraZone с хексагонална шарка и заоблена пета осигурява сцепление при смяна на посоката. Размер от доставката: EU 43,5 (27,5 см).';

const RECOIL_ULTRA_DESCRIPTION_BG = 'Зала обувка Salming Recoil Ultra в бяло. Държи петата и средното стъпало стабилни, с мека яка и връзки за личен фит. Междинната подметка Recoil+ връща енергия и пази баланса между омекотяване и пъргавина. Подметката Hexagrip+ със заоблени ръбове държи на закрит под, а каналите отпред следват движението на стъпалото. Подходяща за скуош, волейбол, хандбал и бадминтон. Размер от доставката: EU 44 (28 см).';

const HEAD_WRISTBAND_DESCRIPTION_BG = 'Лента за китка Head 2,5" (6,4 см), комплект от 2 броя. Попива потта по време на игра и дава допълнителна стабилност на китката. Лека и удобна. Материал: 90% найлон / 10% еластан. Цветове от доставката: бял, антрацит, червен, оранжев и LN.';

const CYBER_TOUR_DESCRIPTION_BG = 'Ракета за скуош Head Cyber Tour за нови и любителски играчи. Капковидна глава и свеж дизайн. Най-лекият модел в линията Cyber. Технологията Amplified Fibre прави рамката по-твърда и добавя мощност, а балансът към главата помага при атакуващи удари. Кордаж 12x17, глава 500 см², тегло на рамката 160 гр, дължина 68,5 см. Доставя се с опънат кордаж, без калъф.';

/**
 * Squashpoint invoice 248151 (9 Nov 2026). Jakub's sell prices override the invoice.
 * Existing Fast-tec, Recoil Ultra White, and Head wristband rows are updated in place.
 * Head Cyber Tour (213054) is inserted. Stock is the invoice quantity; Fast-tec stock
 * is left as already recorded because that pair is already the club listing.
 */
export async function applySquashpointInvoice248151(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(SQUASHPOINT_INVOICE_248151_ID)
    .first<{ id: string }>();

  if (already?.id) {
    return { applied: false as const, reason: 'already-applied' as const };
  }

  const fastTec = await env.DB.prepare('SELECT id FROM products WHERE id = ? LIMIT 1')
    .bind('POS-unsquashable-fast-tec-pro-shoe')
    .first<{ id: string }>();
  if (fastTec?.id) {
    await env.DB.prepare(
      `UPDATE products SET description = ?, selling_price = ?, cost_price = ?, discount_price = NULL WHERE id = ?`,
    ).bind(FAST_TEC_DESCRIPTION_BG, 95, 66, 'POS-unsquashable-fast-tec-pro-shoe').run();
  }

  const recoil = await env.DB.prepare('SELECT id FROM products WHERE id = ? LIMIT 1')
    .bind('1233072-0707-4400')
    .first<{ id: string }>();
  if (recoil?.id) {
    await env.DB.prepare(
      `UPDATE products SET description = ?, selling_price = ?, cost_price = ?, discount_price = NULL, stock = ? WHERE id = ?`,
    ).bind(RECOIL_ULTRA_DESCRIPTION_BG, 100, 66, 1, '1233072-0707-4400').run();
  }

  const wristbandImages = JSON.stringify([
    'https://cdn.webshopapp.com/shops/40033/files/177634211/head-wristband-25-2-pack-white.jpg',
  ]);
  const wristbandAttrs = JSON.stringify({
    source: 'squashpoint.com',
    articleCode: '285050',
  });
  const wristband = await env.DB.prepare('SELECT id FROM products WHERE id = ? LIMIT 1')
    .bind('285050')
    .first<{ id: string }>();
  if (wristband?.id) {
    await env.DB.prepare(
      `UPDATE products SET title = ?, description = ?, selling_price = ?, cost_price = ?, discount_price = NULL, stock = ?, images = ?, attributes = ? WHERE id = ?`,
    ).bind(
      'Head Wristband 2,5" - 2 Pack',
      HEAD_WRISTBAND_DESCRIPTION_BG,
      10,
      5,
      10,
      wristbandImages,
      wristbandAttrs,
      '285050',
    ).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO products (
        id, title, slug, description, brand, sport, sub_category,
        cost_price, selling_price, discount_price, stock, images, attributes, sizes,
        weight_grams, balance, rating, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      '285050',
      'Head Wristband 2,5" - 2 Pack',
      'head-wristband-25-2-pack-285050',
      HEAD_WRISTBAND_DESCRIPTION_BG,
      'Head',
      'squash',
      'Grips',
      5,
      10,
      null,
      10,
      wristbandImages,
      wristbandAttrs,
      '[]',
      null,
      null,
      4.5,
      new Date().toISOString(),
    ).run();
  }

  const cyberImages = JSON.stringify(['/imports/product-images/head-cyber-tour.jpg']);
  const cyberAttrs = JSON.stringify({
    source: 'squashpoint-invoice',
    articleCode: '213054',
  });
  const cyber = await env.DB.prepare('SELECT id FROM products WHERE id = ? LIMIT 1')
    .bind('213054')
    .first<{ id: string }>();
  if (cyber?.id) {
    await env.DB.prepare(
      `UPDATE products SET title = ?, description = ?, brand = ?, sport = ?, sub_category = ?, cost_price = ?, selling_price = ?, discount_price = NULL, stock = ?, images = ?, attributes = ?, weight_grams = ?, balance = ? WHERE id = ?`,
    ).bind(
      'Head Cyber Tour',
      CYBER_TOUR_DESCRIPTION_BG,
      'Head',
      'squash',
      'Rackets',
      31.2,
      49,
      10,
      cyberImages,
      cyberAttrs,
      160,
      'Head-heavy',
      '213054',
    ).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO products (
        id, title, slug, description, brand, sport, sub_category,
        cost_price, selling_price, discount_price, stock, images, attributes, sizes,
        weight_grams, balance, rating, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      '213054',
      'Head Cyber Tour',
      'head-cyber-tour-213054',
      CYBER_TOUR_DESCRIPTION_BG,
      'Head',
      'squash',
      'Rackets',
      31.2,
      49,
      null,
      10,
      cyberImages,
      cyberAttrs,
      '[]',
      160,
      'Head-heavy',
      4.5,
      new Date().toISOString(),
    ).run();
  }

  const details = JSON.stringify({
    invoice: '248151',
    products: [
      { sku: 'POS-unsquashable-fast-tec-pro-shoe', sellingPrice: 95, updatedExisting: Boolean(fastTec?.id) },
      { sku: '1233072-0707-4400', sellingPrice: 100, stock: 1, updatedExisting: Boolean(recoil?.id) },
      { sku: '285050', sellingPrice: 10, stock: 10, updatedExisting: Boolean(wristband?.id) },
      { sku: '213054', sellingPrice: 49, stock: 10, costPrice: 31.2 },
    ],
  });

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(SQUASHPOINT_INVOICE_248151_ID, new Date().toISOString(), details).run();

  return { applied: true as const, id: SQUASHPOINT_INVOICE_248151_ID };
}

const SQUASHPOINT_INVOICE_247673_ID = 'squashpoint-invoice-247673-2026-08-18';
const ONSITE_SALE_NOV13_ID = 'onsite-sale-2026-11-13';
/** Stable order id so the Friday sale can be reported before the worker runs. */
const ONSITE_SALE_NOV13_ORDER_ID = 'ord_onsite-2026-11-13-head-radical-junior';
const HEAD_RADICAL_JUNIOR_SKU = '214152';
const YTEC_PRO_120_SKU = 'USQR24014';
const TOUR_TEC_GRIP_6_SKU = 'USQG21001W6';
/** 19:15 Europe/Sofia (UTC+2) on Friday 13 November 2026. */
const ONSITE_SALE_NOV13_AT = '2026-11-13T17:15:00.000Z';

const HEAD_RADICAL_JUNIOR_DESCRIPTION_BG = 'Детска ракета за скуош Head Radical Junior за начинаещи и юноши. Алуминиева рамка с покритие Nano Titanium за стабилност. Тегло 175 гр, глава 485 см², кордаж 14x19, баланс към дръжката, профил 19 мм. Фабрично опъната със синтетична корда, грип Cushion Grip размер 06. Цвят оранжев / сребро.';

const YTEC_PRO_120_DESCRIPTION_BG = 'Ракета за скуош UNSQUASHABLE Y-TEC PRO 120 за напреднали играчи. Рамка 120 грама от графит с PowerCore и PowerProfile, баланс към дръжката. Глава 500 см², кордаж 14x18, дължина 68,5 см, корда DuraFibre 1,20 мм, грип TOUR-TEC PRO PU. Цвят черен / бял. Без калъф.';

const TOUR_TEC_GRIP_DESCRIPTION_BG = 'Комплект от 6 броя резервни грипове UNSQUASHABLE TOUR-TEC PRO PU за скуош. Тънък профил 1,6 мм за по-добър усет, попива влагата и държи хвата стабилен при дълъг мач. Бял цвят, опаковка от рециклиран картон.';

type InvoiceStockRow = {
  found: boolean;
  created: boolean;
  stockBefore: number;
  stockAfter: number;
  sellingPrice: number;
  discountPrice: number | null;
};

/**
 * Add this invoice's units once. Keeps the selling price and any discount already on the row.
 * A missing row is inserted at the invoice quantity, using the shop price already published for that article.
 */
async function receiveInvoiceUnits(
  env: CommerceEnv,
  input: {
    sku: string;
    title: string;
    slug: string;
    description: string;
    brand: string;
    subCategory: string;
    cost: number;
    quantity: number;
    sellingPriceIfMissing: number;
    discountPriceIfMissing: number | null;
    image: string;
    weightGrams: number | null;
    balance: string | null;
  },
): Promise<InvoiceStockRow> {
  const existing = await env.DB.prepare(
    'SELECT id, stock, selling_price, discount_price FROM products WHERE id = ? LIMIT 1',
  )
    .bind(input.sku)
    .first<{ id: string; stock: number; selling_price: number; discount_price: number | null }>();

  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO products (
        id, title, slug, description, brand, sport, sub_category,
        cost_price, selling_price, discount_price, stock, images, attributes, sizes,
        weight_grams, balance, rating, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      input.sku,
      input.title,
      input.slug,
      input.description,
      input.brand,
      'squash',
      input.subCategory,
      input.cost,
      input.sellingPriceIfMissing,
      input.discountPriceIfMissing,
      input.quantity,
      JSON.stringify([input.image]),
      JSON.stringify({
        source: 'squashpoint-invoice',
        articleCode: input.sku,
        invoice: '247673',
        order: '102170',
      }),
      '[]',
      input.weightGrams,
      input.balance,
      4.5,
      new Date().toISOString(),
    ).run();
    await recordStockMovement(env, input.sku, input.quantity, 'invoice_247673', null);
    return {
      found: false,
      created: true,
      stockBefore: 0,
      stockAfter: input.quantity,
      sellingPrice: input.sellingPriceIfMissing,
      discountPrice: input.discountPriceIfMissing,
    };
  }

  const stockBefore = Number(existing.stock);
  const stockAfter = stockBefore + input.quantity;
  const sellingPrice = Number(existing.selling_price);
  const discountPrice = existing.discount_price == null ? null : Number(existing.discount_price);
  await env.DB.prepare(
    'UPDATE products SET description = ?, cost_price = ?, stock = ? WHERE id = ?',
  )
    .bind(input.description, input.cost, stockAfter, input.sku)
    .run();
  await recordStockMovement(env, input.sku, input.quantity, 'invoice_247673', null);
  return {
    found: true,
    created: false,
    stockBefore,
    stockAfter,
    sellingPrice,
    discountPrice,
  };
}

/**
 * Squashpoint invoice 247673 (18 Aug 2026, order 102170).
 * Head Radical Junior is inserted at cost €20 / shelf €49 / stock 10 (the sale migration sells one).
 * Y-TEC PRO 120 and the Tour-Tec grip keep their current selling prices. Each August quantity is added once.
 */
export async function applySquashpointInvoice247673(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(SQUASHPOINT_INVOICE_247673_ID)
    .first<{ id: string }>();

  if (already?.id) {
    return { applied: false as const, reason: 'already-applied' as const };
  }

  const juniorExisting = await env.DB.prepare('SELECT id, stock FROM products WHERE id = ? LIMIT 1')
    .bind(HEAD_RADICAL_JUNIOR_SKU)
    .first<{ id: string; stock: number }>();

  let junior: InvoiceStockRow;
  if (!juniorExisting) {
    junior = await receiveInvoiceUnits(env, {
      sku: HEAD_RADICAL_JUNIOR_SKU,
      title: 'Head Radical Junior',
      slug: 'head-radical-junior-214152',
      description: HEAD_RADICAL_JUNIOR_DESCRIPTION_BG,
      brand: 'Head',
      subCategory: 'Rackets',
      cost: 20,
      quantity: 10,
      sellingPriceIfMissing: 49,
      discountPriceIfMissing: null,
      image: '/imports/product-images/head-radical-junior.jpg',
      weightGrams: 175,
      balance: 'Head-light',
    });
  } else {
    // Already listed. Do not insert a twin and do not add another 10.
    await env.DB.prepare(
      'UPDATE products SET description = ?, cost_price = ?, selling_price = ?, discount_price = NULL WHERE id = ?',
    )
      .bind(HEAD_RADICAL_JUNIOR_DESCRIPTION_BG, 20, 49, HEAD_RADICAL_JUNIOR_SKU)
      .run();
    const stock = Number(juniorExisting.stock);
    junior = {
      found: true,
      created: false,
      stockBefore: stock,
      stockAfter: stock,
      sellingPrice: 49,
      discountPrice: null,
    };
  }

  const ytecShopPrice = CATALOG_PRICE_YTEC_DUNLOP_UPDATES.find((row) => row.sku === YTEC_PRO_120_SKU);
  const ytec = await receiveInvoiceUnits(env, {
    sku: YTEC_PRO_120_SKU,
    title: 'UNSQUASHABLE Y-TEC PRO 120',
    slug: 'unsquashable-y-tec-pro-120',
    description: YTEC_PRO_120_DESCRIPTION_BG,
    brand: 'Unsquashable',
    subCategory: 'Rackets',
    cost: 54,
    quantity: 16,
    sellingPriceIfMissing: ytecShopPrice?.sellingPrice ?? 127,
    discountPriceIfMissing: null,
    image: 'https://cdn.webshopapp.com/shops/40033/files/487988238/unsquashable-y-tec-pro-120.jpg',
    weightGrams: 120,
    balance: 'Head-light',
  });

  const grip = await receiveInvoiceUnits(env, {
    sku: TOUR_TEC_GRIP_6_SKU,
    title: 'UNSQUASHABLE TOUR-TEC PRO PU Grip - 6 Pack',
    slug: 'unsquashable-tour-tec-pro-pu-grip-pack',
    description: TOUR_TEC_GRIP_DESCRIPTION_BG,
    brand: 'Unsquashable',
    subCategory: 'Grips',
    cost: 10.95,
    quantity: 10,
    sellingPriceIfMissing: 29.95,
    discountPriceIfMissing: 14.95,
    image: 'https://cdn.webshopapp.com/shops/40033/files/463951897/unsquashable-tour-tec-pro-pu-grip-6-pack.jpg',
    weightGrams: null,
    balance: null,
  });

  const details = JSON.stringify({
    invoice: '247673',
    order: '102170',
    date: '2026-08-18',
    products: [
      { sku: HEAD_RADICAL_JUNIOR_SKU, ...junior, cost: 20 },
      { sku: YTEC_PRO_120_SKU, ...ytec, cost: 54, quantityAdded: 16 },
      { sku: TOUR_TEC_GRIP_6_SKU, ...grip, cost: 10.95, quantityAdded: 10 },
    ],
  });

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(SQUASHPOINT_INVOICE_247673_ID, new Date().toISOString(), details).run();

  return {
    applied: true as const,
    id: SQUASHPOINT_INVOICE_247673_ID,
    junior,
    ytec,
    grip,
  };
}

export async function invoice247673Status(env: CommerceEnv) {
  await ensureOpsSchema(env);
  const row = await env.DB.prepare('SELECT id, applied_at, details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(SQUASHPOINT_INVOICE_247673_ID)
    .first<{ id: string; applied_at: string; details: string | null }>();

  if (!row) {
    return json({ applied: false, id: SQUASHPOINT_INVOICE_247673_ID });
  }

  return json({
    applied: true,
    id: row.id,
    appliedAt: row.applied_at,
    details: row.details ? JSON.parse(row.details) : null,
  });
}

/**
 * Onsite sale, Friday 13 November 2026: 1× Head Radical Junior at €39.
 * Shelf stays €49. Stock goes from the invoice 10 to 9. No customer mail.
 */
export async function applyOnsiteSaleNov132026(env: CommerceEnv) {
  await ensureOpsSchema(env);

  const already = await env.DB.prepare('SELECT id FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(ONSITE_SALE_NOV13_ID)
    .first<{ id: string }>();

  if (already?.id) {
    return { applied: false as const, reason: 'already-applied' as const };
  }

  const product = await env.DB.prepare(
    'SELECT id, stock, cost_price, selling_price FROM products WHERE id = ? LIMIT 1',
  )
    .bind(HEAD_RADICAL_JUNIOR_SKU)
    .first<{ id: string; stock: number; cost_price: number; selling_price: number }>();

  if (!product) {
    throw new Error(`Missing product for onsite sale: ${HEAD_RADICAL_JUNIOR_SKU}`);
  }

  const existingOrder = await env.DB.prepare(
    'SELECT id FROM orders WHERE id = ? OR notes LIKE ? LIMIT 1',
  )
    .bind(ONSITE_SALE_NOV13_ORDER_ID, `%idempotency:${ONSITE_SALE_NOV13_ID}%`)
    .first<{ id: string }>();

  const stockBefore = Number(product.stock);
  let orderId = existingOrder?.id ?? ONSITE_SALE_NOV13_ORDER_ID;
  let totalAmount = 39;

  if (!existingOrder) {
    if (stockBefore < 1) {
      throw new Error(
        `Insufficient stock for onsite sale ${HEAD_RADICAL_JUNIOR_SKU} (have ${stockBefore}, need 1).`,
      );
    }

    const created = await insertCodOrder(env, {
      id: ONSITE_SALE_NOV13_ORDER_ID,
      fullName: 'Onsite sale / Jakub',
      email: 'admin@racketpoint.bg',
      items: [{ sku: HEAD_RADICAL_JUNIOR_SKU, quantity: 1, priceEur: 39 }],
      billingAddress: {
        city: 'Sofia',
        address: 'Onsite / Double Yellow',
        phone: '-',
      },
      notes: [
        'onsite',
        ONSITE_SALE_NOV13_ID,
        '1× Head Radical Junior @ €39',
        `idempotency:${ONSITE_SALE_NOV13_ID}`,
      ].join('\n'),
      shippingEur: 0,
      status: 'Delivered',
      createdAt: ONSITE_SALE_NOV13_AT,
    });
    orderId = created.id;
    totalAmount = created.totalAmount;
  }

  const after = await env.DB.prepare('SELECT stock, cost_price FROM products WHERE id = ? LIMIT 1')
    .bind(HEAD_RADICAL_JUNIOR_SKU)
    .first<{ stock: number; cost_price: number }>();
  const stockAfter = Number(after?.stock ?? stockBefore);
  const cost = Number(after?.cost_price ?? product.cost_price ?? 0);

  const details = JSON.stringify({
    orderId,
    totalAmount,
    revenue: totalAmount,
    costTotal: cost,
    profit: totalAmount - cost,
    sellingPrice: Number(product.selling_price),
    items: [{ sku: HEAD_RADICAL_JUNIOR_SKU, quantity: 1, priceEur: 39 }],
    stockBefore,
    stockAfter,
    at: ONSITE_SALE_NOV13_AT,
    timezone: 'Europe/Sofia',
  });

  await env.DB.prepare(
    'INSERT INTO ops_migrations (id, applied_at, details) VALUES (?, ?, ?)',
  ).bind(ONSITE_SALE_NOV13_ID, new Date().toISOString(), details).run();

  return {
    applied: true as const,
    orderId,
    totalAmount,
    revenue: totalAmount,
    costTotal: cost,
    profit: totalAmount - cost,
    stockBefore,
    stockAfter,
  };
}

export async function onsiteSaleNov13Status(env: CommerceEnv) {
  await ensureOpsSchema(env);
  const row = await env.DB.prepare('SELECT id, applied_at, details FROM ops_migrations WHERE id = ? LIMIT 1')
    .bind(ONSITE_SALE_NOV13_ID)
    .first<{ id: string; applied_at: string; details: string | null }>();

  if (!row) {
    return json({ applied: false, id: ONSITE_SALE_NOV13_ID });
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
