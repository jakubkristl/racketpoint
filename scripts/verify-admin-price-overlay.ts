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

const reference = (JSON.parse(fs.readFileSync('public/imports/squashpoint-products.json', 'utf8')) as Record<string, unknown>[])
  .map(mapItem);
const apiRes = await fetch('https://www.racketpoint.bg/api/products');
const api = (await apiRes.json() as Record<string, unknown>[]).map(mapItem);
const merged = mergeApiProductsOverReference(api, reference);
const product = findProductBySku(merged, '10326928');

const before = reference.find((item) => item.sku === '10326928');

console.log(JSON.stringify({
  before: before && {
    priceEur: before.priceEur,
    salePriceEur: before.salePriceEur,
    stock: before.stock,
  },
  after: product && {
    sku: product.sku,
    priceEur: product.priceEur,
    salePriceEur: product.salePriceEur,
    stock: product.stock,
    costEur: product.costEur,
    apiId: resolveProductApiId(product),
  },
  costValidationOk: product ? validateProductPricesAgainstCost(product) : 'missing',
  costValidationBlocked: validateProductPricesAgainstCost({
    priceEur: 50,
    salePriceEur: 40,
    costEur: 75,
    price: '',
  }),
}, null, 2));
