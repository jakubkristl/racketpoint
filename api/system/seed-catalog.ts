import { products as starterProducts, type Product } from '../../src/data/catalog';
import { requireAdmin } from '../_lib/auth';
import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, normalizeSlug } from '../_lib/http';

function mapTypeToSubCategory(type: Product['type']) {
  if (type === 'Balls') {
    return 'Balls';
  }

  if (type === 'Wear') {
    return 'Apparel';
  }

  if (type === 'Shoe') {
    return 'Footwear';
  }

  if (type === 'Bag') {
    return 'Bags';
  }

  if (type === 'String') {
    return 'Strings';
  }

  if (type === 'Grip') {
    return 'Grips';
  }

  if (type === 'Accessory') {
    return 'Accessories';
  }

  return 'Rackets';
}

function toSafeNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const admin = requireAdmin(req, res);
    if (!admin) {
      return;
    }
  }

  try {
    await ensureSchema();

    let inserted = 0;
    for (const product of starterProducts) {
      const id = `prd_${product.sku.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      const slug = normalizeSlug(`${product.name}-${product.sku}`);
      const description = product.description || product.details || product.name;
      const result = await sql`
        INSERT INTO products (
          id, title, slug, description, brand, sport, sub_category,
          cost_price, selling_price, discount_price, stock, images, attributes, sizes,
          weight_grams, balance, rating
        ) VALUES (
          ${id},
          ${product.name},
          ${slug},
          ${description},
          ${product.brand},
          ${product.categorySlug},
          ${mapTypeToSubCategory(product.type)},
          ${toSafeNumber(product.costEur, Math.max(0, toSafeNumber(product.priceEur, 0) * 0.56))},
          ${toSafeNumber(product.priceEur, 0)},
          NULL,
          ${Math.max(0, Math.trunc(toSafeNumber(product.stock, 12)))},
          ${JSON.stringify([product.imageUrl])}::jsonb,
          ${JSON.stringify({
            color: product.color ?? null,
            headShape: product.headShape ?? null,
            sourceSku: product.sku,
          })}::jsonb,
          ${JSON.stringify([])}::jsonb,
          ${product.weightGrams ?? null},
          ${product.balance ?? null},
          4.5
        )
        ON CONFLICT (slug) DO NOTHING
      `;

      inserted += result.rowCount ?? 0;
    }

    const countResult = await sql`SELECT COUNT(*)::int AS count FROM products`;
    res.status(200).json({
      ok: true,
      inserted,
      totalProducts: countResult.rows[0]?.count ?? 0,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Catalog seed failed.' });
  }
}
