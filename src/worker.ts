type ProductPayload = {
	title?: string;
	description?: string;
	brand?: string;
	sport?: string;
	subCategory?: string;
	costPrice?: number;
	sellingPrice?: number;
	discountPrice?: number | null;
	stock?: number;
	imageArray?: string[];
	attributes?: Record<string, unknown>;
	weightGrams?: number | null;
	balance?: string | null;
	rating?: number;
};

const schema = `
	CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, addresses TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL);
	CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL);
	CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT NOT NULL, brand TEXT NOT NULL, sport TEXT NOT NULL, sub_category TEXT NOT NULL, cost_price REAL NOT NULL, selling_price REAL NOT NULL, discount_price REAL, stock INTEGER NOT NULL, images TEXT NOT NULL, attributes TEXT NOT NULL, sizes TEXT NOT NULL DEFAULT '[]', weight_grams INTEGER, balance TEXT, rating REAL NOT NULL DEFAULT 4.5, created_at TEXT NOT NULL);
`;

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (error: string, status: number) => json({ error }, status);
const text = (value: unknown, limit = 4000) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const numeric = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

async function isAdmin(request: Request, env: Env) {
	const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
	if (!token) return false;
	const session = await env.DB.prepare("SELECT u.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>? AND u.role='ADMIN'")
		.bind(token, new Date().toISOString()).first();
	return Boolean(session);
}

function productRow(row: Record<string, unknown>) {
	return {
		id: row.id, title: row.title, slug: row.slug, description: row.description, brand: row.brand, sport: row.sport,
		subCategory: row.sub_category, costPrice: row.cost_price, sellingPrice: row.selling_price, discountPrice: row.discount_price,
		stock: row.stock, imageArray: JSON.parse(String(row.images ?? '[]')), attributes: JSON.parse(String(row.attributes ?? '{}')),
		sizes: JSON.parse(String(row.sizes ?? '[]')), weightGrams: row.weight_grams, balance: row.balance, rating: row.rating, createdAt: row.created_at,
	};
}

async function products(request: Request, env: Env) {
	if (request.method === 'GET') {
		const rows = await env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all<Record<string, unknown>>();
		return json(rows.results.map(productRow));
	}

	if (request.method !== 'PUT' && request.method !== 'POST') return fail('Method not allowed.', 405);
	if (!await isAdmin(request, env)) return fail('Admin role required.', 403);
	const body = await request.json<ProductPayload>();
	const url = new URL(request.url);
	const id = text(url.searchParams.get('id'), 120) || `prd_${crypto.randomUUID()}`;
	const title = text(body.title, 180);
	if (!title) return fail('Product title is required.', 400);
	const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || id;
	await env.DB.prepare(`INSERT INTO products (id,title,slug,description,brand,sport,sub_category,cost_price,selling_price,discount_price,stock,images,attributes,sizes,weight_grams,balance,rating,created_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
		ON CONFLICT(id) DO UPDATE SET title=excluded.title,slug=excluded.slug,description=excluded.description,brand=excluded.brand,sport=excluded.sport,sub_category=excluded.sub_category,cost_price=excluded.cost_price,selling_price=excluded.selling_price,discount_price=excluded.discount_price,stock=excluded.stock,images=excluded.images,attributes=excluded.attributes,weight_grams=excluded.weight_grams,balance=excluded.balance,rating=excluded.rating`)
		.bind(id, title, slug, text(body.description), text(body.brand), text(body.sport), text(body.subCategory), Math.max(0, numeric(body.costPrice)), Math.max(0, numeric(body.sellingPrice)), body.discountPrice == null ? null : Math.max(0, numeric(body.discountPrice)), Math.max(0, Math.trunc(numeric(body.stock))), JSON.stringify(body.imageArray ?? []), JSON.stringify(body.attributes ?? {}), '[]', body.weightGrams == null ? null : Math.trunc(numeric(body.weightGrams)), text(body.balance) || null, Math.max(0, numeric(body.rating, 4.5)), new Date().toISOString()).run();
	return json({ id, ok: true }, request.method === 'POST' ? 201 : 200);
}

export default {
	async fetch(request, env: Env) {
		try {
			if (new URL(request.url).pathname === '/api/products') {
				await env.DB.exec(schema);
				return products(request, env);
			}
			return env.ASSETS.fetch(request);
		} catch (error) {
			return fail(error instanceof Error ? error.message : 'Request failed.', 500);
		}
	},
} satisfies ExportedHandler<Env>;
