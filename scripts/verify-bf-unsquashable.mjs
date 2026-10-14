#!/usr/bin/env node
/**
 * Verify Black Friday 10% Unsquashable racket promo (date-gated ops migration).
 * Usage: node scripts/verify-bf-unsquashable.mjs [baseUrl]
 *
 * Before Fri 13 Nov Sofia: expects window=before and no discount_price on the 13 SKUs.
 * During 13–16 Nov: expects discount_price = round(selling × 0.9, 2).
 * After Mon 16 23:59 Sofia: expects discount_price cleared (null).
 */
const base = (process.argv[2] || 'https://www.racketpoint.bg').replace(/\/$/, '');

const SKUS = [
  'POS-unsquashable-miguel-rodriguez-one20',
  'POS-unsquashable-miguel-rodriguez-autograph',
  'POS-unsquashable-nick-wall-125-limited-edition',
  'POS-unsquashable-hero-pro-125-brazil',
  'POS-unsquashable-y-tec-125',
  'POS-unsquashable-y-tec-pro-125',
  'POS-unsquashable-y-tec-pro-110',
  'POS-unsquashable-tour-tec-pro-125',
  'POS-unsquashable-james-willstrop-signature',
  'POS-unsquashable-ultra-lite-120',
  'POS-unsquashable-ultra-lite-135',
  'POS-unsquashable-syn-tec-125',
  'POS-unsquashable-sam-gerrits-autograph',
];

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

async function main() {
  const statusRes = await fetch(`${base}/api/admin/bf-unsquashable`);
  const status = await statusRes.json();
  console.log('migration:', JSON.stringify(status, null, 2));

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  const byId = new Map(products.map((p) => [p.id, p]));

  let ok = true;
  const window = status.window;
  console.log(`window=${window} startsAt=${status.startsAt} endsAt=${status.endsAt}`);

  if (SKUS.length !== 13) {
    console.error(`expected 13 SKUs in allowlist, got ${SKUS.length}`);
    ok = false;
  }

  for (const sku of SKUS) {
    const product = byId.get(sku);
    if (!product) {
      console.error(`MISSING ${sku}`);
      ok = false;
      continue;
    }

    const sell = Number(product.sellingPrice);
    const expectedDisc = roundMoney(sell * 0.9);
    const disc = product.discountPrice == null ? null : Number(product.discountPrice);

    console.log(
      `${sku}: sell=${sell} disc=${disc} expectedDisc=${expectedDisc} cost=${product.costPrice}`,
    );

    if (window === 'live') {
      if (disc == null || Math.abs(disc - expectedDisc) > 0.01) {
        console.error(`  expected discount €${expectedDisc} while live, got ${disc}`);
        ok = false;
      }
      if (!status.apply?.applied) {
        console.error('  expected apply migration while live');
        ok = false;
      }
    } else if (window === 'before') {
      if (disc != null && Number(disc) > 0) {
        console.error(`  expected no discount before window, got ${disc}`);
        ok = false;
      }
    } else if (window === 'after') {
      if (disc != null && Number(disc) > 0) {
        console.error(`  expected discount cleared after window, got ${disc}`);
        ok = false;
      }
      if (!status.clear?.applied) {
        console.error('  expected clear migration after window');
        ok = false;
      }
    }
  }

  if (!ok) {
    process.exitCode = 1;
    return;
  }

  console.log(`OK — BF Unsquashable status matches window=${window} for ${SKUS.length} racket SKUs.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
