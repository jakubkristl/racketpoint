import { importedCatalogToSeedRows, starterCatalogSeedRows, type CatalogSeedRow } from './data/catalogSeed';

type CommerceEnv = {
  DB: D1Database;
  ASSETS: Fetcher;
  BORICA_PRIVATE_KEY_PEM?: string;
  BORICA_TERMINAL_ID?: string;
};

let starterEnsured = false;
let importedEnsured = false;

export async function ensureStorefrontCatalog(env: CommerceEnv, request: Request) {
  if (!starterEnsured) {
    await batchUpsert(env, starterCatalogSeedRows());
    starterEnsured = true;
  }

  if (importedEnsured) {
    return;
  }

  const importedRows = await loadImportedCatalog(env, request);
  if (importedRows.length > 0) {
    await batchUpsert(env, importedRows);
  }

  importedEnsured = true;
}

function upsertStatement(env: CommerceEnv, row: CatalogSeedRow) {
  return env.DB.prepare(
    `INSERT INTO products (
      id, title, slug, description, brand, sport, sub_category,
      cost_price, selling_price, discount_price, stock, images, attributes, sizes,
      weight_grams, balance, rating, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, 4.5, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      slug = excluded.slug,
      description = excluded.description,
      brand = excluded.brand,
      sport = excluded.sport,
      sub_category = excluded.sub_category,
      cost_price = excluded.cost_price,
      selling_price = excluded.selling_price,
      discount_price = excluded.discount_price,
      images = excluded.images,
      attributes = excluded.attributes,
      weight_grams = excluded.weight_grams,
      balance = excluded.balance`,
  ).bind(
    row.id,
    row.title,
    row.slug,
    row.description,
    row.brand,
    row.sport,
    row.subCategory,
    row.costPrice,
    row.sellingPrice,
    row.discountPrice,
    row.stock,
    JSON.stringify(row.images),
    JSON.stringify(row.attributes),
    row.weightGrams,
    row.balance,
    new Date().toISOString(),
  );
}

async function batchUpsert(env: CommerceEnv, rows: CatalogSeedRow[]) {
  const chunkSize = 20;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    try {
      await env.DB.batch(chunk.map((row) => upsertStatement(env, row)));
    } catch {
      for (const row of chunk) {
        try {
          await upsertStatement(env, row).run();
        } catch {
          // Skip rows that collide on unique slug or other constraints.
        }
      }
    }
  }
}

async function loadImportedCatalog(env: CommerceEnv, request: Request) {
  try {
    const response = await env.ASSETS.fetch(new URL('/imports/squashpoint-products.json', request.url));
    if (!response.ok) {
      return [] as CatalogSeedRow[];
    }

    return importedCatalogToSeedRows(await response.json());
  } catch {
    return [] as CatalogSeedRow[];
  }
}

export function paymentGatewaysResponse(env: CommerceEnv) {
  return Response.json({
    gateways: [
      {
        id: 'borica',
        title: 'BORICA Card Payment',
        type: 'redirect_form',
        enabled: Boolean((env.BORICA_PRIVATE_KEY_PEM ?? '').trim() && (env.BORICA_TERMINAL_ID ?? '').trim()),
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
  }, { headers: { 'Cache-Control': 'no-store' } });
}

type OrderBody = {
  fullName?: string;
  email?: string;
  items?: Array<{ sku?: string; quantity?: number; priceEur?: number }>;
  billingAddress?: { city?: string; address?: string; phone?: string };
  paymentMethod?: string;
  notes?: string;
  shippingEur?: number;
};

export async function createStorefrontOrder(request: Request, env: CommerceEnv) {
  await ensureStorefrontCatalog(env, request);

  const body = await request.json<OrderBody>().catch(() => null);
  if (!body) {
    return Response.json({ error: 'Missing request body.' }, { status: 400 });
  }

  const fullName = String(body.fullName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const items = (body.items ?? [])
    .filter((item) => item.sku && Number(item.quantity) > 0)
    .map((item) => ({
      sku: String(item.sku),
      quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
    }));

  if (!fullName || !email || !/^\S+@\S+\.\S+$/.test(email) || items.length === 0) {
    return Response.json({ error: 'fullName, email and items are required.' }, { status: 400 });
  }

  if (body.paymentMethod === 'card') {
    return Response.json({ error: 'Card payment is not available yet. Use cash on delivery.' }, { status: 400 });
  }

  const resolved: Array<{ sku: string; quantity: number; priceEur: number }> = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await env.DB.prepare(
      'SELECT id, selling_price, discount_price, stock FROM products WHERE id = ? LIMIT 1',
    ).bind(item.sku).first<{ id: string; selling_price: number; discount_price: number | null; stock: number }>();

    if (!product) {
      return Response.json({ error: `Product not found for SKU: ${item.sku}` }, { status: 400 });
    }

    const price = product.discount_price != null && Number(product.discount_price) > 0
      ? Number(product.discount_price)
      : Number(product.selling_price);
    resolved.push({ sku: item.sku, quantity: item.quantity, priceEur: price });
    totalAmount += price * item.quantity;

    await env.DB.prepare(
      'UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?',
    ).bind(item.quantity, item.sku).run();
  }

  const shippingEur = Math.max(0, Number(body.shippingEur ?? 0) || 0);
  totalAmount += shippingEur;

  const id = `ord_${crypto.randomUUID()}`;
  await env.DB.prepare(
    `INSERT INTO orders (
      id, email, full_name, status, total_amount, payment_method, payment_status, address, items, notes, created_at
    ) VALUES (?, ?, ?, 'Pending', ?, 'cash_on_delivery', 'cash_on_delivery', ?, ?, ?, ?)`,
  ).bind(
    id,
    email,
    fullName,
    totalAmount,
    JSON.stringify(body.billingAddress ?? null),
    JSON.stringify(resolved),
    body.notes ?? null,
    new Date().toISOString(),
  ).run();

  return Response.json({ id, reference: id, ok: true }, { status: 201 });
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

  return Response.json((result.results ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    status: row.status,
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    notes: row.notes,
    createdAt: row.created_at,
  })), { headers: { 'Cache-Control': 'no-store' } });
}
