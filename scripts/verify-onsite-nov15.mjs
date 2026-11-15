#!/usr/bin/env node
/**
 * Post-deploy check for the 15 November 2026 Y-TEC PRO 120 onsite sale.
 * Usage: node scripts/verify-onsite-nov15.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://racketpoint.bg').replace(/\/$/, '');

const SKU = 'USQR24014';
const ORDER_ID = 'ord_onsite-2026-11-15-ytec-pro-120';
const SATURDAY_ORDER = 'ord_onsite-2026-11-14-ytec-pro-120';

async function main() {
  const statusRes = await fetch(`${base}/api/admin/onsite-sale-nov15`);
  const status = await statusRes.json();
  console.log('sale:', JSON.stringify(status, null, 2));

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  const product = products.find((item) => item.id === SKU);
  const details = status.details ?? {};

  let ok = Boolean(status.applied) && !details.missing;
  if (!product) {
    console.error(`MISSING product ${SKU}`);
    ok = false;
  } else {
    console.log(`${SKU}: stock=${product.stock} sell=${product.sellingPrice} discount=${product.discountPrice}`);
    if (Number(product.stock) !== 26) {
      console.error(`  expected stock 26, got ${product.stock}`);
      ok = false;
    }
    if (Math.abs(Number(product.sellingPrice) - 127) > 0.01) {
      console.error(`  shelf changed: expected €127, got ${product.sellingPrice}`);
      ok = false;
    }
    if (product.discountPrice != null) {
      console.error(`  discount changed: expected none, got ${product.discountPrice}`);
      ok = false;
    }
  }

  if (details.orderId !== ORDER_ID) {
    console.error(`expected order ${ORDER_ID}, got ${details.orderId}`);
    ok = false;
  }
  if (details.orderId === SATURDAY_ORDER) {
    console.error('reused Saturday order');
    ok = false;
  }
  if (details.priceEur != null && Math.abs(Number(details.priceEur) - 79) > 0.01) {
    console.error(`expected paid €79, got ${details.priceEur}`);
    ok = false;
  }
  if (details.stockBefore != null && Number(details.stockBefore) !== 27) {
    console.error(`expected stock before 27, got ${details.stockBefore}`);
    ok = false;
  }
  if (details.stockAfter != null && Number(details.stockAfter) !== 26) {
    console.error(`expected stock after 26, got ${details.stockAfter}`);
    ok = false;
  }

  if (!ok) {
    process.exitCode = 1;
    return;
  }

  console.log('ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
