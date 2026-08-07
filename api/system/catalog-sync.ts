import { requireAdmin } from '../_lib/auth';
import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, normalizeSlug, readBody } from '../_lib/http';

type ProductType = 'Racket' | 'Balls' | 'Wear' | 'Bag' | 'Accessory' | 'String' | 'Grip' | 'Shoe';

type CatalogProductPayload = {
  sku: string;
  name: string;
  categorySlug: string;
  type: ProductType;
  brand: string;
  priceEur?: number;
  salePriceEur?: number;
  originalPriceEur?: number;
  costEur?: number;
  stock?: number;
  details?: string;
  description?: string;
  imageUrl?: string;
  balance?: string;
  weightGrams?: number;
  attributes?: Record<string, string>;
};

type CatalogSyncPayload = {
  products?: CatalogProductPayload[];
};

function toFiniteNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toOptionalFiniteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toSafeInt(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(numeric));
}

function mapTypeToSubCategory(type: ProductType) {
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

function sanitizeProductPayload(raw: CatalogProductPayload, index: number) {
  const sku = String(raw.sku ?? '').trim();
  const title = String(raw.name ?? '').trim();
  const sport = String(raw.categorySlug ?? '').trim().toLowerCase();
  const brand = String(raw.brand ?? '').trim();
  const type = String(raw.type ?? '').trim() as ProductType;

  if (!sku) {
    throw new Error(`Product at index ${index} is missing sku.`);
  }

  if (!title) {
    throw new Error(`Product ${sku} is missing name.`);
  }

  if (!sport) {
    throw new Error(`Product ${sku} is missing categorySlug.`);
  }

  if (!brand) {
    throw new Error(`Product ${sku} is missing brand.`);
  }

  const allowedTypes = new Set<ProductType>(['Racket', 'Balls', 'Wear', 'Bag', 'Accessory', 'String', 'Grip', 'Shoe']);
  if (!allowedTypes.has(type)) {
    throw new Error(`Product ${sku} has unsupported type ${String(raw.type)}.`);
  }

  const priceEur = toOptionalFiniteNumber(raw.priceEur);
  const originalPrice = toOptionalFiniteNumber(raw.originalPriceEur);
  const salePrice = toOptionalFiniteNumber(raw.salePriceEur);

  const sellingPrice = toFiniteNumber(originalPrice ?? priceEur ?? salePrice, 0);
  const discountPrice = salePrice != null && salePrice < sellingPrice ? salePrice : null;

  return {
    sku,
    title,
    slug: normalizeSlug(`${title}-${sku}`),
    description: String(raw.details ?? raw.description ?? '').trim() || title,
    brand,
    sport,
    subCategory: mapTypeToSubCategory(type),
    costPrice: toFiniteNumber(raw.costEur, 0),
    sellingPrice,
    discountPrice,
    stock: toSafeInt(raw.stock, 0),
    images: [String(raw.imageUrl ?? '').trim()].filter(Boolean),
    attributes: {
      ...(raw.attributes ?? {}),
      sourceSku: sku,
      productType: type,
    },
    sizes: [],
    weightGrams: raw.weightGrams == null ? null : toSafeInt(raw.weightGrams, 0),
    balance: raw.balance ?? null,
    rating: 4.5,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const admin = requireAdmin(req, res);
  if (!admin) {
    return;
  }

  try {
    await ensureSchema();

    const body = readBody<CatalogSyncPayload>(req);
    if (!Array.isArray(body.products) || body.products.length === 0) {
      res.status(400).json({ error: 'Payload must include a non-empty products array.' });
      return;
    }

    const normalizedProducts = body.products.map((entry, index) => sanitizeProductPayload(entry, index));

    const existingResult = await sql`SELECT id, slug, attributes FROM products`;
    const existingById = new Map<string, string>();
    const existingBySlug = new Map<string, string>();
    const existingBySourceSku = new Map<string, string>();

    for (const row of existingResult.rows) {
      const id = String(row.id);
      existingById.set(id, id);
      existingBySlug.set(String(row.slug), id);

      const attributes = row.attributes && typeof row.attributes === 'object'
        ? row.attributes as Record<string, unknown>
        : {};
      const sourceSku = typeof attributes.sourceSku === 'string' ? attributes.sourceSku : null;
      if (sourceSku) {
        existingBySourceSku.set(sourceSku, id);
      }
    }

    let inserted = 0;
    let updated = 0;

    for (const product of normalizedProducts) {
      const existingId = existingById.get(product.sku)
        ?? existingBySourceSku.get(product.sku)
        ?? existingBySlug.get(product.slug)
        ?? null;

      if (!existingId) {
        await sql`
          INSERT INTO products (
            id, title, slug, description, brand, sport, sub_category,
            cost_price, selling_price, discount_price, stock, images, attributes, sizes,
            weight_grams, balance, rating
          ) VALUES (
            ${product.sku}, ${product.title}, ${product.slug}, ${product.description}, ${product.brand},
            ${product.sport}, ${product.subCategory}, ${product.costPrice}, ${product.sellingPrice},
            ${product.discountPrice == null ? null : product.discountPrice}, ${product.stock},
            ${JSON.stringify(product.images)}::jsonb,
            ${JSON.stringify(product.attributes)}::jsonb,
            ${JSON.stringify(product.sizes)}::jsonb,
            ${product.weightGrams}, ${product.balance}, ${product.rating}
          )
        `;

        inserted += 1;
        continue;
      }

      await sql`
        UPDATE products
        SET
          title = ${product.title},
          slug = ${product.slug},
          description = ${product.description},
          brand = ${product.brand},
          sport = ${product.sport},
          sub_category = ${product.subCategory},
          cost_price = ${product.costPrice},
          selling_price = ${product.sellingPrice},
          discount_price = ${product.discountPrice == null ? null : product.discountPrice},
          stock = ${product.stock},
          images = ${JSON.stringify(product.images)}::jsonb,
          attributes = ${JSON.stringify(product.attributes)}::jsonb,
          sizes = ${JSON.stringify(product.sizes)}::jsonb,
          weight_grams = ${product.weightGrams},
          balance = ${product.balance},
          rating = ${product.rating}
        WHERE id = ${existingId}
      `;

      updated += 1;
    }

    const totalResult = await sql`SELECT COUNT(*)::int AS count FROM products`;

    res.status(200).json({
      ok: true,
      inserted,
      updated,
      processed: normalizedProducts.length,
      totalProducts: totalResult.rows[0]?.count ?? 0,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Catalog sync failed.' });
  }
}
