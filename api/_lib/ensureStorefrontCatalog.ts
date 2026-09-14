import { starterCatalogSeedRows } from '../../src/data/catalogSeed';
import { sql } from './db';

let starterEnsured = false;

export async function ensureStarterCatalogInPostgres() {
  if (starterEnsured) {
    return;
  }

  const countResult = await sql`SELECT COUNT(*)::int AS count FROM products`;
  const count = Number(countResult.rows[0]?.count ?? 0);
  const rows = starterCatalogSeedRows();

  if (count >= rows.length) {
    starterEnsured = true;
    return;
  }

  for (const product of rows) {
    await sql`
      INSERT INTO products (
        id, title, slug, description, brand, sport, sub_category,
        cost_price, selling_price, discount_price, stock, images, attributes, sizes,
        weight_grams, balance, rating
      ) VALUES (
        ${product.id}, ${product.title}, ${product.slug}, ${product.description}, ${product.brand},
        ${product.sport}, ${product.subCategory}, ${product.costPrice}, ${product.sellingPrice},
        ${product.discountPrice}, ${product.stock},
        ${JSON.stringify(product.images)}::jsonb,
        ${JSON.stringify(product.attributes)}::jsonb,
        ${JSON.stringify([])}::jsonb,
        ${product.weightGrams}, ${product.balance}, 4.5
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        brand = EXCLUDED.brand,
        sport = EXCLUDED.sport,
        sub_category = EXCLUDED.sub_category,
        cost_price = EXCLUDED.cost_price,
        selling_price = EXCLUDED.selling_price,
        discount_price = EXCLUDED.discount_price,
        images = EXCLUDED.images,
        attributes = EXCLUDED.attributes,
        weight_grams = EXCLUDED.weight_grams,
        balance = EXCLUDED.balance
    `;
  }

  starterEnsured = true;
}
