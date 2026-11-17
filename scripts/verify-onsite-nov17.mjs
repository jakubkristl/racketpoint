#!/usr/bin/env node
/**
 * Post-deploy check for the 17 November 2026 onsite sales.
 * Usage: node scripts/verify-onsite-nov17.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://racketpoint.bg').replace(/\/$/, '');

async function main() {
  const statusRes = await fetch(`${base}/api/admin/onsite-sale-nov17`);
  const status = await statusRes.json();
  console.log('sale:', JSON.stringify(status, null, 2));

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  const wristband = products.find((item) => item.id === '285050');
  const sales = status.details?.sales ?? [];
  const shoes = sales.find((sale) => sale.orderId === 'ord_onsite-2026-11-17-victor-a170-a');
  const band = sales.find((sale) => sale.orderId === 'ord_onsite-2026-11-17-head-wristband');
  const victorListing = products.find((item) => /victor/i.test(item.title || '') && /a170|shoe|обув/i.test(item.title || ''));

  let ok = Boolean(status.applied);

  if (!shoes) {
    console.error('MISSING Victor shoe sale');
    ok = false;
  } else {
    console.log(`shoes: order=${shoes.orderId} paid=${shoes.priceEur} qty=${shoes.quantity} missing=${shoes.missing} stock ${shoes.stockBefore} -> ${shoes.stockAfter}`);
    if (Math.abs(Number(shoes.priceEur) - 102.25) > 0.001 || Number(shoes.quantity) !== 2) {
      console.error('  expected 2 × €102.25');
      ok = false;
    }
    if (victorListing) {
      console.error(`  a Victor listing exists now (${victorListing.id}); this check expected none`);
      ok = false;
    }
    if (!shoes.missing || shoes.stockBefore != null) {
      console.error('  expected the shoe listing to be missing, with no stock change');
      ok = false;
    }
  }

  if (!wristband) {
    console.error('MISSING wristband 285050');
    ok = false;
  } else {
    console.log(`285050: stock=${wristband.stock} sell=${wristband.sellingPrice}`);
    if (Number(wristband.stock) !== 9) {
      console.error(`  expected stock 9, got ${wristband.stock}`);
      ok = false;
    }
    if (Math.abs(Number(wristband.sellingPrice) - 10) > 0.01) {
      console.error(`  shelf changed: expected €10, got ${wristband.sellingPrice}`);
      ok = false;
    }
  }

  if (!band) {
    console.error('MISSING wristband sale');
    ok = false;
  } else if (Number(band.stockBefore) !== 10 || Number(band.stockAfter) !== 9) {
    console.error(`  expected wristband stock 10 -> 9, got ${band.stockBefore} -> ${band.stockAfter}`);
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
