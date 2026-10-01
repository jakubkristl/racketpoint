#!/usr/bin/env node
/**
 * Post-deploy verification for the 2026-10-01 onsite sale migration.
 * Usage: node scripts/verify-onsite-oct1.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://www.racketpoint.bg').replace(/\/$/, '');

const EXPECTED_SKUS = {
  'POS-unsquashable-miguel-rodriguez-autograph': { qty: 1, price: 115 },
  'POS-unsquashable-miguel-rodriguez-one20': { qty: 1, price: 115 },
  'POS-tecnifibre-team-tech-tee-m': { qty: 2, price: 36 },
};

async function main() {
  const statusRes = await fetch(`${base}/api/admin/onsite-sale-oct1`);
  const status = await statusRes.json();
  console.log('migration:', JSON.stringify(status, null, 2));

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  const byId = new Map(products.map((p) => [p.id, p]));

  let ok = Boolean(status.applied);
  for (const [sku, expect] of Object.entries(EXPECTED_SKUS)) {
    const product = byId.get(sku);
    if (!product) {
      console.error(`MISSING product ${sku}`);
      ok = false;
      continue;
    }
    console.log(`${sku}: stock=${product.stock} sell=${product.sellingPrice} disc=${product.discountPrice}`);
    if (Number(product.stock) !== 0) {
      console.error(`  expected stock 0 after sale (got ${product.stock})`);
      ok = false;
    }
  }

  const details = status.details;
  if (details?.totalAmount != null && Math.abs(Number(details.totalAmount) - 302) > 0.01) {
    console.error(`expected total €302, got ${details.totalAmount}`);
    ok = false;
  }

  if (!ok) {
    process.exitCode = 1;
    return;
  }

  console.log('OK — onsite sale reflected (stock 0 on sold SKUs, migration applied).');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
