type AppSecrets = { ADMIN_EMAIL?: string; ADMIN_PASSWORD?: string };
type AppEnvironment = Env & AppSecrets;
type ProductInput = { title?: string; description?: string; brand?: string; sport?: string; subCategory?: string; costPrice?: number; sellingPrice?: number; discountPrice?: number | null; stock?: number; imageArray?: string[]; attributes?: Record<string, string>; sizes?: string[]; weightGrams?: number | null; balance?: string | null; rating?: number };
type SessionUser = { id: string; name: string; email: string; role: 'USER' | 'ADMIN'; addresses: unknown[] };

const encoder = new TextEncoder();
const schema = `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, addresses TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT NOT NULL, brand TEXT NOT NULL, sport TEXT NOT NULL, sub_category TEXT NOT NULL, cost_price REAL NOT NULL, selling_price REAL NOT NULL, discount_price REAL, stock INTEGER NOT NULL, images TEXT NOT NULL, attributes TEXT NOT NULL, sizes TEXT NOT NULL, weight_grams INTEGER, balance TEXT, rating REAL NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, user_id TEXT, email TEXT NOT NULL, full_name TEXT NOT NULL, status TEXT NOT NULL, total_amount REAL NOT NULL, payment_method TEXT NOT NULL, payment_status TEXT NOT NULL, address TEXT, items TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS stock_movements (id TEXT PRIMARY KEY, sku TEXT NOT NULL, delta_quantity INTEGER NOT NULL, reason TEXT NOT NULL, order_id TEXT, actor TEXT, created_at TEXT NOT NULL);`;

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (error: string, status: number) => json({ error }, status);
const string = (value: unknown, maximum = 4000) => typeof value === 'string' ? value.trim().slice(0, maximum) : '';
const numeric = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const parsed = (value: string, fallback: unknown) => { try { return JSON.parse(value); } catch { return fallback; } };

function asBase64(bytes: Uint8Array) { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary); }
function bytes(value: string) { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }
async function passwordHash(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 50000, hash: 'SHA-256' }, key, 256);
  return `${asBase64(salt)}:${asBase64(new Uint8Array(result))}`;
}
async function verifyPassword(password: string, value: string) {
  const [salt, hash] = value.split(':'); if (!salt || !hash) return false;
  const candidate = (await passwordHash(password, bytes(salt))).split(':')[1];
  const actual = bytes(candidate); const expected = bytes(hash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}
async function readBody<T>(request: Request) { if (Number(request.headers.get('content-length') ?? 0) > 1_000_000) throw new Error('Request body is too large.'); return request.json() as Promise<T>; }

async function ensureDatabase(env: AppEnvironment) {
  await env.DB.exec(schema);
}

async function syncAdminAccount(env: AppEnvironment) {
  const email = string(env.ADMIN_EMAIL, 254).toLowerCase(); const password = env.ADMIN_PASSWORD ?? '';
  if (!email || password.length < 12) return;
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  const hash = await passwordHash(password);
  if (!existing) {
    await env.DB.prepare('INSERT INTO users (id, name, email, password_hash, role, addresses, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(`adm_${crypto.randomUUID()}`, 'Racketpoint Admin', email, hash, 'ADMIN', '[]', new Date().toISOString()).run();
    return;
  }
  await env.DB.prepare("UPDATE users SET password_hash = ?, role = 'ADMIN' WHERE email = ?").bind(hash, email).run();
}
async function userFor(request: Request, env: AppEnvironment): Promise<SessionUser | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim(); if (!token) return null;
  const row = await env.DB.prepare('SELECT u.id, u.name, u.email, u.role, u.addresses FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?').bind(token, new Date().toISOString()).first<{ id: string; name: string; email: string; role: 'USER' | 'ADMIN'; addresses: string }>();
  return row ? { ...row, addresses: parsed(row.addresses, []) as unknown[] } : null;
}
async function adminFor(request: Request, env: AppEnvironment) { const user = await userFor(request, env); return user?.role === 'ADMIN' ? user : null; }

async function auth(request: Request, env: AppEnvironment, registration: boolean) {
  const input = await readBody<{ name?: string; email?: string; password?: string }>(request); const email = string(input.email, 254).toLowerCase(); const password = input.password ?? '';
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return fail('Valid email and password of at least 8 characters are required.', 400);
  if (!registration) await syncAdminAccount(env);
  let record = await env.DB.prepare('SELECT id, name, email, role, addresses, password_hash FROM users WHERE email=?').bind(email).first<{ id: string; name: string; email: string; role: 'USER' | 'ADMIN'; addresses: string; password_hash: string }>();
  if (registration) {
    const name = string(input.name, 80); if (!name) return fail('Name is required.', 400); if (record) return fail('Account already exists.', 409);
    record = { id: `usr_${crypto.randomUUID()}`, name, email, role: 'USER', addresses: '[]', password_hash: await passwordHash(password) };
    await env.DB.prepare('INSERT INTO users (id,name,email,password_hash,role,addresses,created_at) VALUES (?,?,?,?,?,?,?)').bind(record.id, record.name, record.email, record.password_hash, record.role, record.addresses, new Date().toISOString()).run();
  } else if (!record || !await verifyPassword(password, record.password_hash)) return fail('Invalid credentials.', 401);
  const token = crypto.randomUUID(); await env.DB.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)').bind(token, record.id, new Date(Date.now() + 604800000).toISOString()).run();
  return json({ token, user: { id: record.id, name: record.name, email: record.email, role: record.role, addresses: parsed(record.addresses, []) } }, registration ? 201 : 200);
}

async function profile(request: Request, env: AppEnvironment) {
  const user = await userFor(request, env); if (!user) return fail('Unauthorized.', 401); if (request.method === 'GET') return json(user); if (request.method !== 'PUT') return fail('Method not allowed.', 405);
  const input = await readBody<{ name?: string; addresses?: unknown[] }>(request); const name = string(input.name, 80) || user.name; const addresses = Array.isArray(input.addresses) ? input.addresses.slice(0, 10) : user.addresses;
  await env.DB.prepare('UPDATE users SET name=?,addresses=? WHERE id=?').bind(name, JSON.stringify(addresses), user.id).run(); return json({ ...user, name, addresses });
}

function mapProduct(row: Record<string, unknown>) { return { id: row.id, title: row.title, slug: row.slug, description: row.description, brand: row.brand, sport: row.sport, subCategory: row.sub_category, costPrice: row.cost_price, sellingPrice: row.selling_price, discountPrice: row.discount_price, stock: row.stock, imageArray: parsed(row.images as string, []), attributes: parsed(row.attributes as string, {}), sizes: parsed(row.sizes as string, []), weightGrams: row.weight_grams, balance: row.balance, rating: row.rating, createdAt: row.created_at }; }
function productSlug(title: string) { return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `product-${crypto.randomUUID().slice(0, 8)}`; }
async function productApi(request: Request, env: AppEnvironment) {
  const url = new URL(request.url); if (request.method === 'GET') { const result = await env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all<Record<string, unknown>>(); return json(result.results.map(mapProduct)); }
  if (!await adminFor(request, env)) return fail('Admin role required.', 403); const id = string(url.searchParams.get('id'), 120);
  if (request.method === 'DELETE') { if (!id) return fail('Product id is required.', 400); await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run(); return json({ ok: true }); }
  if (request.method !== 'POST' && request.method !== 'PUT') return fail('Method not allowed.', 405);
  const input = await readBody<ProductInput>(request); const title = string(input.title, 180); if (!title) return fail('Product title is required.', 400);
  const fields = [title, productSlug(title), string(input.description), string(input.brand), string(input.sport), string(input.subCategory), Math.max(0, numeric(input.costPrice)), Math.max(0, numeric(input.sellingPrice)), input.discountPrice == null ? null : Math.max(0, numeric(input.discountPrice)), Math.max(0, Math.trunc(numeric(input.stock))), JSON.stringify(input.imageArray ?? []), JSON.stringify(input.attributes ?? {}), JSON.stringify(input.sizes ?? []), input.weightGrams == null ? null : Math.trunc(numeric(input.weightGrams)), string(input.balance) || null, Math.max(0, numeric(input.rating, 4.5))];
  if (request.method === 'POST') { const productId = `prd_${crypto.randomUUID()}`; await env.DB.prepare('INSERT INTO products (id,title,slug,description,brand,sport,sub_category,cost_price,selling_price,discount_price,stock,images,attributes,sizes,weight_grams,balance,rating,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(productId, ...fields, new Date().toISOString()).run(); return json({ id: productId }, 201); }
  if (!id) return fail('Product id is required.', 400); await env.DB.prepare('UPDATE products SET title=?,slug=?,description=?,brand=?,sport=?,sub_category=?,cost_price=?,selling_price=?,discount_price=?,stock=?,images=?,attributes=?,sizes=?,weight_grams=?,balance=?,rating=? WHERE id=?').bind(...fields, id).run(); return json({ ok: true });
}

async function stock(request: Request, env: AppEnvironment) {
  const admin = await adminFor(request, env); if (!admin) return fail('Admin role required.', 403);
  if (request.method === 'GET') { const result = await env.DB.prepare('SELECT sm.*,p.title product_title FROM stock_movements sm LEFT JOIN products p ON p.id=sm.sku ORDER BY sm.created_at DESC LIMIT 200').all<Record<string, unknown>>(); return json(result.results.map((row) => ({ id: row.id, sku: row.sku, deltaQuantity: row.delta_quantity, reason: row.reason, orderId: row.order_id, actor: row.actor, createdAt: row.created_at, productTitle: row.product_title }))); }
  const input = await readBody<{ sku?: string; deltaQuantity?: number; reason?: string }>(request); const sku = string(input.sku, 120); const delta = Math.trunc(numeric(input.deltaQuantity)); const reason = string(input.reason, 160);
  if (!sku || !delta || !reason) return fail('SKU, non-zero quantity adjustment, and reason are required.', 400); const updated = await env.DB.prepare('UPDATE products SET stock=stock+? WHERE id=? AND stock+?>=0 RETURNING stock').bind(delta, sku, delta).first<{ stock: number }>(); if (!updated) return fail('Product was not found or stock would become negative.', 409);
  await env.DB.prepare('INSERT INTO stock_movements (id,sku,delta_quantity,reason,actor,created_at) VALUES (?,?,?,?,?,?)').bind(`stm_${crypto.randomUUID()}`, sku, delta, reason, admin.id, new Date().toISOString()).run(); return json({ sku, stock: updated.stock });
}

async function createOrder(request: Request, env: AppEnvironment) {
  const input = await readBody<{ fullName?: string; email?: string; items?: Array<{ sku?: string; quantity?: number }>; billingAddress?: unknown; paymentMethod?: string; notes?: string }>(request); const fullName = string(input.fullName, 100); const email = string(input.email, 254).toLowerCase(); const lines = (input.items ?? []).map((item) => ({ sku: string(item.sku, 120), quantity: Math.max(1, Math.trunc(numeric(item.quantity, 1))) })).filter((item) => item.sku);
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !lines.length) return fail('Name, email and at least one item are required.', 400); if (input.paymentMethod !== 'cash_on_delivery') return fail('Online payments are not configured yet. Select cash on delivery.', 503);
  const resolved: Array<{ sku: string; quantity: number; priceEur: number }> = []; for (const line of lines) { const product = await env.DB.prepare('SELECT selling_price,discount_price,stock FROM products WHERE id=?').bind(line.sku).first<{ selling_price: number; discount_price: number | null; stock: number }>(); if (!product || product.stock < line.quantity) return fail(`Insufficient stock for ${line.sku}.`, 409); const update = await env.DB.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?').bind(line.quantity, line.sku, line.quantity).run(); if (!update.meta.changes) return fail(`Insufficient stock for ${line.sku}.`, 409); resolved.push({ ...line, priceEur: product.discount_price ?? product.selling_price }); }
  const id = `ord_${crypto.randomUUID()}`; const now = new Date().toISOString(); const user = await userFor(request, env); const total = resolved.reduce((sum, line) => sum + line.quantity * line.priceEur, 0); await env.DB.prepare('INSERT INTO orders (id,user_id,email,full_name,status,total_amount,payment_method,payment_status,address,items,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, user?.id ?? null, email, fullName, 'Pending', total, 'cash_on_delivery', 'cash_on_delivery', JSON.stringify(input.billingAddress ?? null), JSON.stringify(resolved), string(input.notes), now).run(); return json({ id }, 201);
}

async function orders(request: Request, env: AppEnvironment) {
  const user = await userFor(request, env); if (!user) return fail('Unauthorized.', 401);
  const all = new URL(request.url).searchParams.get('all') === '1';
  if (all && user.role !== 'ADMIN') return fail('Admin role required.', 403);
  const result = all
    ? await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300').all<Record<string, unknown>>()
    : await env.DB.prepare('SELECT * FROM orders WHERE email=? ORDER BY created_at DESC LIMIT 200').bind(user.email).all<Record<string, unknown>>();
  return json(result.results.map((row) => ({ id: row.id, userId: row.user_id, email: row.email, fullName: row.full_name, status: row.status, totalAmount: row.total_amount, paymentMethod: row.payment_method, paymentStatus: row.payment_status, address: parsed(row.address as string, null), items: parsed(row.items as string, []), notes: row.notes, createdAt: row.created_at })));
}

async function orderStatus(request: Request, env: AppEnvironment) {
  if (!await adminFor(request, env)) return fail('Admin role required.', 403);
  const input = await readBody<{ orderId?: string; status?: string }>(request); const orderId = string(input.orderId, 120); const status = string(input.status, 20);
  if (!orderId || !['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'].includes(status)) return fail('A valid order and status are required.', 400);
  const result = await env.DB.prepare('UPDATE orders SET status=? WHERE id=? RETURNING id,status').bind(status, orderId).first();
  return result ? json({ ok: true, order: result }) : fail('Order not found.', 404);
}

async function adminStats(request: Request, env: AppEnvironment) { if (!await adminFor(request, env)) return fail('Admin role required.', 403); const stats = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM products) products,(SELECT COUNT(*) FROM orders) orders,(SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status!='Cancelled') revenueEur").first(); return json(stats ?? { users: 0, products: 0, orders: 0, revenueEur: 0 }); }

export default { async fetch(request, env: AppEnvironment) {
  const path = new URL(request.url).pathname;
  try {
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    await ensureDatabase(env);
    if (path === '/api/auth/register' && request.method === 'POST') return auth(request, env, true);
    if (path === '/api/auth/login' && request.method === 'POST') return auth(request, env, false);
    if (path === '/api/auth/profile') return profile(request, env);
    if (path === '/api/products') return productApi(request, env);
    if (path === '/api/orders' && request.method === 'GET') return orders(request, env);
    if (path === '/api/orders/create' && request.method === 'POST') return createOrder(request, env);
    if (path === '/api/orders/status' && request.method === 'PUT') return orderStatus(request, env);
    if (path === '/api/admin/stock-adjustments' && request.method === 'POST') return stock(request, env);
    if (path === '/api/admin/stock-movements' && request.method === 'GET') return stock(request, env);
    if (path === '/api/admin/stats' && request.method === 'GET') return adminStats(request, env);
    return fail('Not found.', 404);
  } catch (error) { console.error(JSON.stringify({ path, error: error instanceof Error ? error.message : 'Unknown error' })); return fail(error instanceof Error ? error.message : 'Request failed.', 500); }
} } satisfies ExportedHandler<AppEnvironment>;