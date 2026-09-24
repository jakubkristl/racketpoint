/**
 * Verify Admin catalog dedupe: import + default seed twins collapse by identity.
 * Run: npx tsx scripts/verify-catalog-dedupe.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products as defaultProducts, type Product } from '../src/data/catalog';
import {
  buildIdentityKeySet,
  collectProductIdentityKeys,
  productMatchesIdentityKeys,
} from '../src/data/productIdentity';
import { mergeApiProductsOverReference } from '../src/data/store';

const root = path.dirname(fileURLToPath(import.meta.url));
const importPath = path.resolve(root, '../public/imports/squashpoint-products.json');

function mapImportRow(item: any): Product {
  const listPrice = Number(item.sellingPrice ?? item.priceEur ?? 0);
  const discountRaw = item.discountPrice ?? item.salePriceEur;
  const discountPrice = discountRaw == null || discountRaw === '' ? null : Number(discountRaw);
  const hasPromo =
    discountPrice != null
    && Number.isFinite(discountPrice)
    && Number.isFinite(listPrice)
    && discountPrice > 0
    && discountPrice < listPrice;

  return {
    sku: String(item.sku ?? item.id ?? ''),
    name: String(item.title ?? item.name ?? 'Unnamed'),
    categorySlug: String(item.sport ?? item.categorySlug ?? 'squash'),
    type: 'Racket',
    brand: String(item.brand ?? 'Racketpoint'),
    priceEur: Number.isFinite(listPrice) ? listPrice : 0,
    salePriceEur: hasPromo ? discountPrice! : undefined,
    originalPriceEur: hasPromo ? listPrice : undefined,
    price: `EUR ${(hasPromo ? discountPrice! : listPrice).toFixed(2)}`,
    costEur: Number(item.costPrice ?? 0),
    stock: Number(item.stock ?? 0),
    details: String(item.description ?? ''),
    badges: hasPromo ? ['SALE'] : [],
    imageUrl: Array.isArray(item.imageArray) ? String(item.imageArray[0] ?? '') : String(item.imageUrl ?? ''),
    attributes: item.attributes && typeof item.attributes === 'object'
      ? Object.fromEntries(
          Object.entries(item.attributes).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
        )
      : undefined,
  };
}

function mergeWithDefaultCatalog(base: Product[]) {
  const existingSkus = new Set(base.map((product) => product.sku));
  const existingIdentityKeys = buildIdentityKeySet(base);
  return [
    ...base,
    ...defaultProducts.filter((product) => {
      if (existingSkus.has(product.sku)) return false;
      if (productMatchesIdentityKeys(product, existingIdentityKeys)) return false;
      return true;
    }),
  ];
}

function countYtec120(products: Product[]) {
  return products.filter((product) => /y-tec pro 120/i.test(product.name)).length;
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(importPath, 'utf8')) as any[];
  const referenceCatalog = raw.map(mapImportRow);

  // Simulate live API: Admin-edited USQR24014 with list 127 / promo 99.95
  const apiProducts: Product[] = [
    {
      sku: 'USQR24014',
      name: 'UNSQUASHABLE Y-TEC PRO 120',
      categorySlug: 'squash',
      type: 'Racket',
      brand: 'Unsquashable',
      priceEur: 127,
      salePriceEur: 99.95,
      originalPriceEur: 127,
      price: 'EUR 99.95',
      costEur: 70,
      stock: 12,
      details: 'Admin edited',
      badges: ['SALE'],
      imageUrl: 'https://example.com/ytec.jpg',
    },
  ];

  const beforeExactOnly = (() => {
    const overrideBySku = new Map(apiProducts.map((product) => [product.sku, product] as const));
    const combined = referenceCatalog.map((product) => overrideBySku.get(product.sku) ?? product);
    for (const product of apiProducts) {
      if (!referenceCatalog.some((reference) => reference.sku === product.sku)) {
        combined.push(product);
      }
    }
    // Old mergeWithDefaultCatalog (SKU-only)
    const existingSkus = new Set(combined.map((product) => product.sku));
    return [...combined, ...defaultProducts.filter((product) => !existingSkus.has(product.sku))];
  })();

  const after = mergeWithDefaultCatalog(mergeApiProductsOverReference(apiProducts, referenceCatalog));

  const ytecBefore = countYtec120(beforeExactOnly);
  const ytecAfter = countYtec120(after);
  const removed = beforeExactOnly.length - after.length;

  const ytecRow = after.find((product) => /y-tec pro 120/i.test(product.name));
  const overlaid =
    ytecRow
    && ytecRow.sku === 'USQR24014'
    && ytecRow.priceEur === 127
    && ytecRow.salePriceEur === 99.95
    && ytecRow.attributes?.internalDbId === 'USQR24014';

  const result = {
    ok: ytecBefore >= 2 && ytecAfter === 1 && Boolean(overlaid) && removed >= 1,
    importCount: referenceCatalog.length,
    defaultCount: defaultProducts.length,
    beforeCount: beforeExactOnly.length,
    afterCount: after.length,
    removed,
    ytecBefore,
    ytecAfter,
    overlaid,
    ytecIdentityKeys: ytecRow ? collectProductIdentityKeys(ytecRow) : [],
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
