#!/usr/bin/env node
/**
 * Post-deploy verification for the 2026-10-09 onsite sale migration.
 * Usage: node scripts/verify-onsite-oct9.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://www.racketpoint.bg').replace(/\/$/, '');

const EXPECTED_SKUS = {
  'POS-unsquashable-fast-tec-pro-shoe': { qty: 1, price: 95, cost: 66 },
  'POS-oland-jersey-double-yellow': { qty: 1, price: 30, cost: 13 },
};

async function main() {
  const statusRes = await fetch(`${base}/api/admin/onsite-sale-oct9`);
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
    console.log(
      `${sku}: stock=${product.stock} sell=${product.sellingPrice} disc=${product.discountPrice} cost=${product.costPrice}`,
    );
    if (Number(product.stock) !== 0) {
      console.error(`  expected stock 0 after sale (got ${product.stock})`);
      ok = false;
    }
    if (Math.abs(Number(product.sellingPrice) - expect.price) > 0.01) {
      console.error(`  expected sell €${expect.price}, got ${product.sellingPrice}`);
      ok = false;
    }
    if (product.costPrice != null && Math.abs(Number(product.costPrice) - expect.cost) > 0.01) {
      console.error(`  expected cost €${expect.cost}, got ${product.costPrice}`);
      ok = false;
    }
  }

  const details = status.details;
  if (details?.totalAmount != null && Math.abs(Number(details.totalAmount) - 125) > 0.01) {
    console.error(`expected total €125, got ${details.totalAmount}`);
    ok = false;
  }
  if (details?.profit != null && Math.abs(Number(details.profit) - 46) > 0.01) {
    console.error(`expected profit €46, got ${details.profit}`);
    ok = false;
  }

  if (!ok) {
    process.exitCode = 1;
    return;
  }

  console.log('OK — onsite sale reflected (stock 0 on sold SKUs, migration applied, €125 / profit €46).');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
