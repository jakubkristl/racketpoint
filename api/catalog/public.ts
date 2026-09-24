import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed } from '../_lib/http';

/**
 * Public sell-price + stock feed for the Double Yellow club website.
 * Never exposes costPrice.
 */
function mapPublicProduct(row: any) {
  const attributes = row.attributes ?? {};
  const sourceSku =
    typeof attributes.sourceSku === 'string' && attributes.sourceSku.trim()
      ? attributes.sourceSku.trim()
      : null;

  return {
    id: String(row.id),
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    sellingPrice: Number(row.selling_price),
    discountPrice: row.discount_price == null ? null : Number(row.discount_price),
    stock: Number(row.stock ?? 0),
    sourceSku,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    methodNotAllowed(res);
    return;
  }

  try {
    await ensureSchema();

    const result = await sql`
      SELECT id, slug, title, selling_price, discount_price, stock, attributes
      FROM products
      ORDER BY created_at DESC
    `;

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(result.rows.map(mapPublicProduct));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Public catalog failure.' });
  }
}
