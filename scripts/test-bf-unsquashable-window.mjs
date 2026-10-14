#!/usr/bin/env node
/**
 * Offline unit checks for BF window + money rounding (no D1).
 */
const START = Date.parse('2026-11-13T00:00:00+02:00');
const END = Date.parse('2026-11-16T23:59:59.999+02:00');

function windowAt(nowMs) {
  if (nowMs < START) return 'before';
  if (nowMs <= END) return 'live';
  return 'after';
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

const cases = [
  ['2026-10-14T12:00:00+02:00', 'before'],
  ['2026-11-12T23:59:59+02:00', 'before'],
  ['2026-11-13T00:00:00+02:00', 'live'],
  ['2026-11-16T23:59:59+02:00', 'live'],
  ['2026-11-17T00:00:00+02:00', 'after'],
];

let ok = true;
for (const [iso, expected] of cases) {
  const actual = windowAt(Date.parse(iso));
  if (actual !== expected) {
    console.error(`window ${iso}: expected ${expected}, got ${actual}`);
    ok = false;
  } else {
    console.log(`OK window ${iso} → ${actual}`);
  }
}

const money = [
  [115, 103.5],
  [105, 94.5],
  [95, 85.5],
  [75, 67.5],
  [69, 62.1],
  [59, 53.1],
  [80, 72],
  [99, 89.1],
];
for (const [sell, expected] of money) {
  const actual = roundMoney(sell * 0.9);
  if (Math.abs(actual - expected) > 0.001) {
    console.error(`money ${sell}: expected ${expected}, got ${actual}`);
    ok = false;
  } else {
    console.log(`OK money ${sell} → ${actual}`);
  }
}

if (!ok) process.exit(1);
console.log('OK — BF window + money checks passed.');
