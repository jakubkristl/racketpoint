import { products as starterProducts, type Product } from './catalog';

export type CatalogSeedRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  brand: string;
  sport: string;
  subCategory: string;
  costPrice: number;
  sellingPrice: number;
  discountPrice: number | null;
  stock: number;
  images: string[];
  attributes: Record<string, string>;
  weightGrams: number | null;
  balance: string | null;
};

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

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isUsableImage(url: string) {
  const normalized = url.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return !normalized.includes('reception-pos.jakub-personal.workers.dev')
    && !normalized.includes('cloudflareaccess.com')
    && !normalized.includes('via.placeholder.com');
}

function pickImages(values: unknown) {
  const list = Array.isArray(values) ? values : typeof values === 'string' && values ? [values] : [];
  return list
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(isUsableImage);
}

export function starterCatalogSeedRows(): CatalogSeedRow[] {
  return starterProducts.map((product) => {
    const sellingPrice = toNumber(product.salePriceEur ?? product.priceEur, 0);
    const originalPrice = toNumber(product.originalPriceEur ?? product.priceEur, sellingPrice);
    const images = pickImages([product.imageUrl]);

    return {
      id: product.sku,
      title: product.name,
      slug: slugify(`${product.name}-${product.sku}`) || product.sku.toLowerCase(),
      description: product.details || product.description || product.name,
      brand: product.brand,
      sport: product.categorySlug,
      subCategory: mapTypeToSubCategory(product.type),
      costPrice: toNumber(product.costEur, Number((sellingPrice * 0.56).toFixed(2))),
      sellingPrice: originalPrice > 0 ? originalPrice : sellingPrice,
      discountPrice: product.salePriceEur != null && product.salePriceEur < originalPrice ? product.salePriceEur : null,
      stock: Math.max(0, Math.trunc(toNumber(product.stock, 0))),
      images,
      attributes: {
        sourceSku: product.sku,
        productType: product.type,
        ...(product.attributes ?? {}),
      },
      weightGrams: product.weightGrams ?? null,
      balance: product.balance ?? null,
    };
  });
}

export function importedCatalogToSeedRows(payload: unknown): CatalogSeedRow[] {
  const list = Array.isArray(payload) ? payload : [];
  const rows: CatalogSeedRow[] = [];

  for (const raw of list) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const item = raw as Record<string, unknown>;
    const id = String(item.sku ?? item.id ?? '').trim();
    const title = String(item.title ?? item.name ?? '').trim();
    if (!id || !title) {
      continue;
    }

    const sellingPrice = toNumber(item.sellingPrice ?? item.selling_price ?? item.priceEur, 0);
    const discountPriceRaw = item.discountPrice ?? item.discount_price ?? item.salePriceEur;
    const discountPrice = discountPriceRaw == null ? null : toNumber(discountPriceRaw);
    const images = pickImages(item.imageArray ?? item.images ?? item.imageUrl);
    const attributes = item.attributes && typeof item.attributes === 'object'
      ? Object.fromEntries(
          Object.entries(item.attributes as Record<string, unknown>)
            .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'),
        )
      : {};

    rows.push({
      id,
      title,
      slug: slugify(`${title}-${id}`) || id.toLowerCase(),
      description: String(item.description ?? item.details ?? title),
      brand: String(item.brand ?? 'Racketpoint'),
      sport: String(item.sport ?? item.categorySlug ?? 'squash').toLowerCase(),
      subCategory: String(item.subCategory ?? item.sub_category ?? 'Rackets'),
      costPrice: toNumber(item.costPrice ?? item.cost_price, Number((sellingPrice * 0.56).toFixed(2))),
      sellingPrice,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < sellingPrice ? discountPrice : null,
      stock: Math.max(0, Math.trunc(toNumber(item.stock, 0))),
      images,
      attributes: {
        sourceSku: id,
        ...attributes,
      },
      weightGrams: item.weightGrams == null && item.weight_grams == null
        ? null
        : Math.trunc(toNumber(item.weightGrams ?? item.weight_grams, 0)),
      balance: typeof item.balance === 'string' ? item.balance : null,
    });
  }

  return rows;
}
