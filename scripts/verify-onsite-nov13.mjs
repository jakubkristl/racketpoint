#!/usr/bin/env node
/**
 * Post-deploy check for invoice 247673 and the 13 Nov 2026 Head Radical Junior sale.
 * Usage: node scripts/verify-onsite-nov13.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://racketpoint.bg').replace(/\/$/, '');

const JUNIOR = '214152';
const YTEC = 'USQR24014';
const GRIP = 'USQG21001W6';
const ORDER_ID = 'ord_onsite-2026-11-13-head-radical-junior';

async function main() {
  const statusRes = await fetch(`${base}/api/admin/onsite-sale-nov13`);
  const status = await statusRes.json();
  console.log('sale:', JSON.stringify(status, null, 2));

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  const byId = new Map(products.map((product) => [product.id, product]));

  let ok = Boolean(status.applied);
  const junior = byId.get(JUNIOR);
  const ytec = byId.get(YTEC);
  const grip = byId.get(GRIP);

  if (!junior) {
    console.error(`MISSING product ${JUNIOR}`);
    ok = false;
  } else {
    console.log(`${JUNIOR}: stock=${junior.stock} sell=${junior.sellingPrice} cost=${junior.costPrice}`);
    if (Number(junior.stock) !== 9) {
      console.error(`  expected junior stock 9, got ${junior.stock}`);
      ok = false;
    }
    if (Math.abs(Number(junior.sellingPrice) - 49) > 0.01) {
      console.error(`  expected junior shelf €49, got ${junior.sellingPrice}`);
      ok = false;
    }
    if (Math.abs(Number(junior.costPrice) - 20) > 0.01) {
      console.error(`  expected junior cost €20, got ${junior.costPrice}`);
      ok = false;
    }
  }

  if (!ytec) {
    console.error(`MISSING product ${YTEC}`);
    ok = false;
  } else if (Math.abs(Number(ytec.sellingPrice) - 127) > 0.01) {
    console.error(`Y-TEC PRO 120 selling price changed: ${ytec.sellingPrice}`);
    ok = false;
  }

  if (!grip) {
    console.error(`MISSING product ${GRIP}`);
    ok = false;
  } else if (Math.abs(Number(grip.sellingPrice) - 29.95) > 0.01) {
    console.error(`Grip selling price changed: ${grip.sellingPrice}`);
    ok = false;
  }

  const details = status.details;
  if (details?.orderId && details.orderId !== ORDER_ID) {
    console.error(`expected order ${ORDER_ID}, got ${details.orderId}`);
    ok = false;
  }
  if (details?.totalAmount != null && Math.abs(Number(details.totalAmount) - 39) > 0.01) {
    console.error(`expected sale total €39, got ${details.totalAmount}`);
    ok = false;
  }
  if (details?.stockAfter != null && Number(details.stockAfter) !== 9) {
    console.error(`expected stockAfter 9, got ${details.stockAfter}`);
    ok = false;
  }

  if (!ok) {
    process.exitCode = 1;
    return;
  }

  console.log(`OK — ${ORDER_ID} qty 1 at €39, junior stock 9, shelf €49.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
