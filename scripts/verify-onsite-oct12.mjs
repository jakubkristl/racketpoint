#!/usr/bin/env node
/**
 * Post-deploy verification for the 2026-10-12 onsite Dunlop Junior Eyewear sale.
 * Usage: node scripts/verify-onsite-oct12.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://www.racketpoint.bg').replace(/\/$/, '');

const SKU = 'POS-dunlop-junior-protective-eyewear';
const EXPECT = { stock: 1, price: 29, cost: 18.15, total: 29, profit: 10.85 };

async function main() {
  const statusRes = await fetch(`${base}/api/admin/onsite-sale-oct12`);
  const status = await statusRes.json();
  console.log('migration:', JSON.stringify(status, null, 2));

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  const product = products.find((p) => p.id === SKU);

  let ok = Boolean(status.applied);
  if (!product) {
    console.error(`MISSING product ${SKU}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `${SKU}: stock=${product.stock} sell=${product.sellingPrice} disc=${product.discountPrice} cost=${product.costPrice}`,
  );

  if (Number(product.stock) !== EXPECT.stock) {
    console.error(`  expected stock ${EXPECT.stock} after sale (got ${product.stock})`);
    ok = false;
  }
  if (Math.abs(Number(product.sellingPrice) - EXPECT.price) > 0.01) {
    console.error(`  expected sell €${EXPECT.price}, got ${product.sellingPrice}`);
    ok = false;
  }
  if (product.costPrice != null && Math.abs(Number(product.costPrice) - EXPECT.cost) > 0.01) {
    console.error(`  expected cost €${EXPECT.cost}, got ${product.costPrice}`);
    ok = false;
  }

  const details = status.details;
  if (details?.totalAmount != null && Math.abs(Number(details.totalAmount) - EXPECT.total) > 0.01) {
    console.error(`expected total €${EXPECT.total}, got ${details.totalAmount}`);
    ok = false;
  }
  if (details?.profit != null && Math.abs(Number(details.profit) - EXPECT.profit) > 0.01) {
    console.error(`expected profit €${EXPECT.profit}, got ${details.profit}`);
    ok = false;
  }
  if (details?.stockAfter?.[SKU] != null && Number(details.stockAfter[SKU]) !== EXPECT.stock) {
    console.error(`expected stockAfter ${EXPECT.stock}, got ${details.stockAfter[SKU]}`);
    ok = false;
  }

  if (!ok) {
    process.exitCode = 1;
    return;
  }

  console.log(
    `OK — onsite sale reflected (stock ${EXPECT.stock}, sell €${EXPECT.price}, migration applied, €${EXPECT.total} / profit €${EXPECT.profit}).`,
  );
  if (details?.orderId) {
    console.log(`orderId: ${details.orderId}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
