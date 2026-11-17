#!/usr/bin/env node
/**
 * Post-deploy check for the Victor A170 A listing.
 * Usage: node scripts/verify-victor-a170.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://racketpoint.bg').replace(/\/$/, '');

async function main() {
  const statusRes = await fetch(`${base}/api/admin/victor-a170-a`);
  const status = await statusRes.json();
  console.log('listing:', JSON.stringify(status, null, 2));

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  const shoe = products.find((item) => item.id === 'victor-a170-a');
  const details = status.details ?? {};
  let ok = Boolean(status.applied) && Boolean(shoe);

  if (!shoe) {
    console.error('MISSING product victor-a170-a');
    ok = false;
  } else {
    const sizes = Array.isArray(shoe.sizes) ? shoe.sizes.map(String) : [];
    console.log(`${shoe.id}: stock=${shoe.stock} sell=${shoe.sellingPrice} cost=${shoe.costPrice} sizes=${sizes.join(',')}`);
    if (Number(shoe.stock) !== 2) {
      console.error(`  expected stock 2, got ${shoe.stock}`);
      ok = false;
    }
    if (Math.abs(Number(shoe.sellingPrice) - 102.25) > 0.001) {
      console.error(`  expected shelf €102.25, got ${shoe.sellingPrice}`);
      ok = false;
    }
    if (Math.abs(Number(shoe.costPrice) - 58.8) > 0.001) {
      console.error(`  expected cost €58.80, got ${shoe.costPrice}`);
      ok = false;
    }
    if (!sizes.includes('38') || !sizes.includes('42')) {
      console.error(`  expected sizes 38 and 42, got ${sizes.join(',')}`);
      ok = false;
    }
  }

  if (details.saleOrdersBefore != null && details.saleOrdersAfter != null
    && Number(details.saleOrdersBefore) !== Number(details.saleOrdersAfter)) {
    console.error('the Tuesday sale was recorded again');
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
