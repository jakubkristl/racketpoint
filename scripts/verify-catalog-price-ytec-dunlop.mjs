#!/usr/bin/env node
/**
 * Post-deploy verification for Y-TEC PRO 120/125 + Dunlop Sonic Core Ultimate 132 list prices.
 * Usage: node scripts/verify-catalog-price-ytec-dunlop.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://www.racketpoint.bg').replace(/\/$/, '');

const EXPECT = [
  { sku: 'USQR24014', title: 'UNSQUASHABLE Y-TEC PRO 120', selling: 127 },
  { sku: 'POS-unsquashable-y-tec-pro-125', title: 'Unsquashable Y-TEC PRO 125', selling: 132 },
  { sku: 'POS-dunlop-sonic-core-ultimate-132', title: 'Dunlop Sonic Core Ultimate 132', selling: 147 },
];

async function main() {
  const statusRes = await fetch(`${base}/api/admin/catalog-price-ytec-dunlop`);
  const status = await statusRes.json();
  console.log('migration:', JSON.stringify(status, null, 2));

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  if (!Array.isArray(products)) {
    console.error('Unexpected /api/products payload');
    process.exitCode = 1;
    return;
  }

  let ok = Boolean(status.applied);
  for (const expect of EXPECT) {
    const product = products.find((row) => row.id === expect.sku);
    if (!product) {
      console.error(`MISSING product ${expect.sku}`);
      ok = false;
      continue;
    }

    const sell = Number(product.sellingPrice);
    const disc = product.discountPrice;
    console.log(
      `${expect.sku}: sell=${sell} disc=${disc} (expect sell €${expect.selling}, disc null)`,
    );

    if (Math.abs(sell - expect.selling) > 0.01) {
      console.error(`  expected sell €${expect.selling}, got ${sell}`);
      ok = false;
    }
    if (disc != null && Number(disc) > 0) {
      console.error(`  expected discount_price null, got ${disc}`);
      ok = false;
    }
  }

  if (!ok) {
    process.exitCode = 1;
    return;
  }

  console.log('OK — catalog prices locked (Y-TEC PRO 120 €127, Y-TEC PRO 125 €132, Sonic Core Ultimate 132 €147).');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
