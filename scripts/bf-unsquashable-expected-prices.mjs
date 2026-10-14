#!/usr/bin/env node
/**
 * Print expected Black Friday 10% prices from club-pos-d1.json (no D1 required).
 * discount = round(selling_price × 0.9, 2)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'public/imports/club-pos-d1.json'), 'utf8'));

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

const byId = new Map(catalog.map((row) => [row.id, row]));
let ok = true;

console.log('| SKU | Title | selling | discount (10%) | cost | margin@sale |');
console.log('|-----|-------|---------|----------------|------|-------------|');

for (const sku of SKUS) {
  const row = byId.get(sku);
  if (!row) {
    console.error(`MISSING ${sku}`);
    ok = false;
    continue;
  }
  if (row.sub_category !== 'Rackets') {
    console.error(`${sku} sub_category=${row.sub_category} (expected Rackets)`);
    ok = false;
  }
  const sell = Number(row.selling_price);
  const disc = roundMoney(sell * 0.9);
  const cost = Number(row.cost_price);
  const margin = roundMoney(disc - cost);
  console.log(
    `| \`${sku}\` | ${row.title} | €${sell.toFixed(2)} | €${disc.toFixed(2)} | €${cost.toFixed(2)} | €${margin.toFixed(2)} |`,
  );
}

if (SKUS.length !== 13) {
  ok = false;
}

if (!ok) {
  process.exitCode = 1;
  process.exit(1);
}

console.log(`\nOK — ${SKUS.length} Unsquashable racket SKUs priced for BF 10%.`);
