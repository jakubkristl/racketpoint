/**
 * Multi-product audit: Admin/API commercial fields overlay import catalog for every match,
 * and cost floor rejects below-cost list/promo. No product-specific IDs required.
 *
 * Usage: npx tsx scripts/verify-admin-price-overlay.ts
 */
import fs from 'fs';
import {
  findProductBySku,
  mergeApiProductsOverReference,
  resolveProductApiId,
  validateProductPricesAgainstCost,
} from '../src/data/store.ts';
import type { Product } from '../src/data/catalog.ts';

function mapItem(item: Record<string, unknown>): Product {
  const listPrice = Number(item.sellingPrice ?? item.selling_price ?? 0);
  const discountRaw = item.discountPrice ?? item.discount_price;
  const discountPrice = discountRaw == null || discountRaw === '' ? null : Number(discountRaw);
  const hasPromo = discountPrice != null
    && Number.isFinite(discountPrice)
    && Number.isFinite(listPrice)
    && discountPrice > 0
    && discountPrice < listPrice;
  const displayPrice = hasPromo ? discountPrice! : listPrice;
  const attributes = item.attributes && typeof item.attributes === 'object'
    ? Object.fromEntries(
      Object.entries(item.attributes as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'),
    )
    : undefined;

  return {
    sku: String(item.sku ?? item.id ?? ''),
    name: String(item.title ?? item.name ?? ''),
    categorySlug: 'squash',
    type: 'Racket',
    brand: String(item.brand ?? 'Racketpoint'),
    priceEur: Number.isFinite(listPrice) ? listPrice : 0,
    salePriceEur: hasPromo ? discountPrice! : undefined,
    originalPriceEur: hasPromo ? listPrice : undefined,
    price: `EUR ${Number.isFinite(displayPrice) ? displayPrice.toFixed(2) : '0.00'}`,
    costEur: Number(item.costPrice ?? item.cost_price ?? 0),
    stock: Number(item.stock ?? 0),
    details: String(item.description ?? ''),
    badges: hasPromo ? ['SALE'] : [],
    imageUrl: 'https://example.com/x.jpg',
    attributes,
  };
}

function commercialFingerprint(product: Product) {
  return {
    priceEur: product.priceEur,
    salePriceEur: product.salePriceEur ?? null,
    stock: product.stock,
    costEur: product.costEur,
  };
}

const reference = (JSON.parse(fs.readFileSync('public/imports/squashpoint-products.json', 'utf8')) as Record<string, unknown>[])
  .map(mapItem);
const apiRes = await fetch('https://www.racketpoint.bg/api/products');
const api = (await apiRes.json() as Record<string, unknown>[]).map(mapItem);
const merged = mergeApiProductsOverReference(api, reference);

const overlaid: Array<Record<string, unknown>> = [];
const apiOnly: Array<Record<string, unknown>> = [];
const failures: string[] = [];

for (const apiProduct of api) {
  const publicMatch = merged.find((product) => (
    product.attributes?.internalDbId === apiProduct.sku
    || product.sku === apiProduct.sku
  ));

  if (!publicMatch) {
    failures.push(`API product ${apiProduct.sku} missing from merged catalog`);
    continue;
  }

  const pricesMatch = publicMatch.priceEur === apiProduct.priceEur
    && (publicMatch.salePriceEur ?? null) === (apiProduct.salePriceEur ?? null)
    && publicMatch.stock === apiProduct.stock;

  if (!pricesMatch) {
    failures.push(
      `Overlay mismatch for ${apiProduct.sku}: shop=${JSON.stringify(commercialFingerprint(publicMatch))} api=${JSON.stringify(commercialFingerprint(apiProduct))}`,
    );
  }

  const resolvedId = resolveProductApiId(publicMatch);
  if (resolvedId !== apiProduct.sku && publicMatch.sku !== apiProduct.sku) {
    failures.push(`resolveProductApiId(${publicMatch.sku}) => ${resolvedId}, expected ${apiProduct.sku}`);
  }

  // Public URL lookup by import/public sku must still find the overlaid row.
  if (publicMatch.sku !== apiProduct.sku) {
    const byPublicSku = findProductBySku(merged, publicMatch.sku);
    if (!byPublicSku || byPublicSku.priceEur !== apiProduct.priceEur) {
      failures.push(`findProductBySku(${publicMatch.sku}) did not return Admin overlay for ${apiProduct.sku}`);
    }
  }

  const importRow = reference.find((item) => item.sku === publicMatch.sku);
  const overlaidFromImport = Boolean(importRow)
    && publicMatch.attributes?.internalDbId === apiProduct.sku;

  const entry = {
    apiSku: apiProduct.sku,
    publicSku: publicMatch.sku,
    name: publicMatch.name,
    brand: publicMatch.brand,
    beforeImport: commercialFingerprint(importRow ?? apiProduct),
    afterOverlay: commercialFingerprint(publicMatch),
    changedFromImport: Boolean(importRow)
      && JSON.stringify(commercialFingerprint(importRow)) !== JSON.stringify(commercialFingerprint(publicMatch)),
    matchVia: overlaidFromImport
      ? (publicMatch.sku === apiProduct.sku ? 'exact-sku' : 'identity')
      : 'api-only',
  };

  if (overlaidFromImport) {
    overlaid.push(entry);
  } else {
    apiOnly.push(entry);
  }
}

const costCases = [
  {
    label: 'list below cost',
    product: { priceEur: 50, salePriceEur: undefined, costEur: 75, price: '' },
    expectBlock: true,
  },
  {
    label: 'promo below cost',
    product: { priceEur: 120, salePriceEur: 40, costEur: 75, price: '' },
    expectBlock: true,
  },
  {
    label: 'list and promo at/above cost',
    product: { priceEur: 147, salePriceEur: 127, costEur: 75.02, price: '' },
    expectBlock: false,
  },
  {
    label: 'no cost set (floor skipped)',
    product: { priceEur: 10, salePriceEur: 5, costEur: 0, price: '' },
    expectBlock: false,
  },
];

for (const testCase of costCases) {
  const message = validateProductPricesAgainstCost(testCase.product);
  const blocked = message != null;
  if (blocked !== testCase.expectBlock) {
    failures.push(`Cost case "${testCase.label}" expected block=${testCase.expectBlock}, got message=${message}`);
  }
}

// Every live API product must either overlay an import row or remain as Admin-owned in the merge.
if (overlaid.length + apiOnly.length !== api.length) {
  failures.push(`Counted ${overlaid.length} overlaid + ${apiOnly.length} api-only, expected ${api.length}`);
}

if (overlaid.length < 1 && apiOnly.length < 1) {
  failures.push('Expected at least one Admin/API product in the live catalog');
}

const sampleOverlaid = overlaid.slice(0, 5);
const sampleApiOnly = apiOnly.slice(0, 5);

console.log(JSON.stringify({
  ok: failures.length === 0,
  apiProductCount: api.length,
  importProductCount: reference.length,
  overlaidCount: overlaid.length,
  apiOnlyCount: apiOnly.length,
  sampleOverlaid,
  sampleApiOnly,
  costFloorCases: costCases.map((testCase) => ({
    label: testCase.label,
    blocked: validateProductPricesAgainstCost(testCase.product) != null,
    message: validateProductPricesAgainstCost(testCase.product),
  })),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
