import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, normalizeSlug, readBody, toNumber } from '../_lib/http';
import { requireAdmin } from '../_lib/auth';

type ProductPayload = {
  title: string;
  slug?: string;
  description: string;
  brand: string;
  sport: string;
  subCategory: string;
  costPrice: number;
  sellingPrice: number;
  discountPrice?: number | null;
  stock: number;
  imageArray: string[];
  attributes?: Record<string, string>;
  sizes?: string[];
  weightGrams?: number | null;
  balance?: string | null;
  rating?: number;
};

function mapProduct(row: any) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    brand: row.brand,
    sport: row.sport,
    subCategory: row.sub_category,
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    discountPrice: row.discount_price == null ? null : Number(row.discount_price),
    stock: Number(row.stock),
    imageArray: row.images ?? [],
    attributes: row.attributes ?? {},
    sizes: row.sizes ?? [],
    weightGrams: row.weight_grams == null ? null : Number(row.weight_grams),
    balance: row.balance ?? null,
    rating: Number(row.rating ?? 0),
    createdAt: row.created_at,
  };
}

function parseFilters(req: any) {
  return {
    id: typeof req.query.id === 'string' ? req.query.id : '',
    slug: typeof req.query.slug === 'string' ? req.query.slug : '',
    sport: typeof req.query.sport === 'string' ? req.query.sport : '',
    brand: typeof req.query.brand === 'string' ? req.query.brand : '',
    search: typeof req.query.search === 'string' ? req.query.search : '',
  };
}

export default async function handler(req: any, res: any) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    methodNotAllowed(res);
    return;
  }

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const filters = parseFilters(req);

      const result = await sql`
        SELECT * FROM products
        WHERE (${filters.id} = '' OR id = ${filters.id})
          AND (${filters.slug} = '' OR slug = ${filters.slug})
          AND (${filters.sport} = '' OR sport = ${filters.sport})
          AND (${filters.brand} = '' OR brand = ${filters.brand})
          AND (${filters.search} = '' OR LOWER(title || ' ' || description) LIKE LOWER(${'%' + filters.search + '%' }))
        ORDER BY created_at DESC
      `;

      res.status(200).json(result.rows.map(mapProduct));
      return;
    }

    const admin = requireAdmin(req, res);
    if (!admin) {
      return;
    }

    if (req.method === 'POST') {
      const body = readBody<ProductPayload>(req);
      const id = `prd_${Date.now().toString(36)}`;
      const slug = normalizeSlug(body.slug || body.title);

      await sql`
        INSERT INTO products (
          id, title, slug, description, brand, sport, sub_category,
          cost_price, selling_price, discount_price, stock, images, attributes, sizes,
          weight_grams, balance, rating
        ) VALUES (
          ${id}, ${body.title.trim()}, ${slug}, ${body.description.trim()}, ${body.brand.trim()},
          ${body.sport.trim()}, ${body.subCategory.trim()}, ${toNumber(body.costPrice)}, ${toNumber(body.sellingPrice)},
          ${body.discountPrice == null ? null : toNumber(body.discountPrice)}, ${Math.max(0, Math.trunc(toNumber(body.stock)))},
          ${JSON.stringify(body.imageArray ?? [])}::jsonb,
          ${JSON.stringify(body.attributes ?? {})}::jsonb,
          ${JSON.stringify(body.sizes ?? [])}::jsonb,
          ${body.weightGrams == null ? null : Math.trunc(toNumber(body.weightGrams))},
          ${body.balance ?? null},
          ${toNumber(body.rating, 4.5)}
        )
      `;

      const created = await sql`SELECT * FROM products WHERE id = ${id} LIMIT 1`;
      res.status(201).json(mapProduct(created.rows[0]));
      return;
    }

    if (req.method === 'PUT') {
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      if (!id) {
        res.status(400).json({ error: 'Product id query param is required.' });
        return;
      }

      const body = readBody<Partial<ProductPayload>>(req);
      const existing = await sql`SELECT * FROM products WHERE id = ${id} LIMIT 1`;
      if (existing.rowCount === 0) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const row = existing.rows[0];
      const nextTitle = body.title?.trim() || row.title;
      const nextSlug = body.slug ? normalizeSlug(body.slug) : row.slug;

      await sql`
        UPDATE products
        SET
          title = ${nextTitle},
          slug = ${nextSlug},
          description = ${body.description?.trim() || row.description},
          brand = ${body.brand?.trim() || row.brand},
          sport = ${body.sport?.trim() || row.sport},
          sub_category = ${body.subCategory?.trim() || row.sub_category},
          cost_price = ${body.costPrice == null ? row.cost_price : toNumber(body.costPrice)},
          selling_price = ${body.sellingPrice == null ? row.selling_price : toNumber(body.sellingPrice)},
          discount_price = ${body.discountPrice === undefined ? row.discount_price : body.discountPrice == null ? null : toNumber(body.discountPrice)},
          stock = ${body.stock == null ? row.stock : Math.max(0, Math.trunc(toNumber(body.stock)))},
          images = ${body.imageArray ? JSON.stringify(body.imageArray) : JSON.stringify(row.images ?? [])}::jsonb,
          attributes = ${body.attributes ? JSON.stringify(body.attributes) : JSON.stringify(row.attributes ?? {})}::jsonb,
          sizes = ${body.sizes ? JSON.stringify(body.sizes) : JSON.stringify(row.sizes ?? [])}::jsonb,
          weight_grams = ${body.weightGrams === undefined ? row.weight_grams : body.weightGrams == null ? null : Math.trunc(toNumber(body.weightGrams))},
          balance = ${body.balance === undefined ? row.balance : body.balance},
          rating = ${body.rating == null ? row.rating : toNumber(body.rating)}
        WHERE id = ${id}
      `;

      const updated = await sql`SELECT * FROM products WHERE id = ${id} LIMIT 1`;
      res.status(200).json(mapProduct(updated.rows[0]));
      return;
    }

    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) {
      res.status(400).json({ error: 'Product id query param is required.' });
      return;
    }

    await sql`DELETE FROM products WHERE id = ${id}`;
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Products API failure.' });
  }
}
