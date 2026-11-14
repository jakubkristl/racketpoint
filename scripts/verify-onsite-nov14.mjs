#!/usr/bin/env node
/**
 * Post-deploy check for the four onsite sales on 14 November 2026.
 * Usage: node scripts/verify-onsite-nov14.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://racketpoint.bg').replace(/\/$/, '');

const EXPECTED = [
  {
    sku: 'USQR24014',
    orderId: 'ord_onsite-2026-11-14-ytec-pro-120',
    priceEur: 79,
    sellingPrice: 127,
    discountPrice: null,
    stockAfter: 27,
  },
  {
    sku: '214152',
    orderId: 'ord_onsite-2026-11-14-head-radical-junior',
    priceEur: 39,
    sellingPrice: 49,
    discountPrice: null,
    stockAfter: 8,
  },
  {
    sku: 'POS-unsquashable-y-tec-pro-125',
    orderId: 'ord_onsite-2026-11-14-ytec-pro-125',
    priceEur: 75,
    sellingPrice: 132,
    discountPrice: 118.8,
    stockAfter: 0,
  },
  {
    sku: 'POS-unsquashable-fast-tec-pro-shoe',
    orderId: 'ord_onsite-2026-11-14-fast-tec-pro-shoe',
    priceEur: 95,
    sellingPrice: 95,
    discountPrice: null,
    stockAfter: 0,
  },
];

function close(a, b) {
  if (a == null && b == null) return true;
  return Math.abs(Number(a) - Number(b)) < 0.01;
}

async function main() {
  const statusRes = await fetch(`${base}/api/admin/onsite-sale-nov14`);
  const status = await statusRes.json();
  console.log('sale:', JSON.stringify(status, null, 2));

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  const byId = new Map(products.map((product) => [product.id, product]));
  const sales = new Map((status.details?.sales ?? []).map((sale) => [sale.sku, sale]));

  let ok = Boolean(status.applied);

  for (const expected of EXPECTED) {
    const product = byId.get(expected.sku);
    const sale = sales.get(expected.sku);
    if (!product) {
      console.error(`MISSING product ${expected.sku}`);
      ok = false;
      continue;
    }
    console.log(
      `${expected.sku}: stock=${product.stock} sell=${product.sellingPrice} discount=${product.discountPrice} order=${sale?.orderId ?? 'none'}`,
    );
    if (!sale || sale.missing) {
      console.error(`  sale was not recorded for ${expected.sku}`);
      ok = false;
    } else if (sale.orderId !== expected.orderId) {
      console.error(`  expected order ${expected.orderId}, got ${sale.orderId}`);
      ok = false;
    }
    if (sale && !close(sale.priceEur, expected.priceEur)) {
      console.error(`  expected paid €${expected.priceEur}, got ${sale.priceEur}`);
      ok = false;
    }
    if (!close(product.sellingPrice, expected.sellingPrice)) {
      console.error(`  shelf changed: expected €${expected.sellingPrice}, got ${product.sellingPrice}`);
      ok = false;
    }
    if (!close(product.discountPrice, expected.discountPrice)) {
      console.error(`  discount changed: expected ${expected.discountPrice}, got ${product.discountPrice}`);
      ok = false;
    }
    if (Number(product.stock) !== expected.stockAfter) {
      console.error(`  expected stock ${expected.stockAfter}, got ${product.stock}`);
      ok = false;
    }
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
