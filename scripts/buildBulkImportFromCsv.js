import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function getArg(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return fallback;
}

const csvPath = path.resolve(rootDir, getArg('--csv', 'bulk/products/products-template.csv'));
const basePath = path.resolve(rootDir, getArg('--base', 'bulk/products/base-snapshot.json'));
const outPath = path.resolve(rootDir, getArg('--out', 'bulk/products/bulk-import.json'));

const allowedTypes = new Set(['Racket', 'Balls', 'Wear', 'Bag', 'Accessory', 'String', 'Grip', 'Shoe']);
const allowedBalances = new Set(['Head-heavy', 'Balanced', 'Head-light']);
const allowedHeadShapes = new Set(['Teardrop', 'Round', 'Hybrid']);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }

      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }

    if (ch === '\r') {
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ''))
    .map((r) => {
      const obj = {};
      for (let index = 0; index < headers.length; index += 1) {
        obj[headers[index]] = (r[index] ?? '').trim();
      }
      return obj;
    });
}

function toNumber(value) {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInt(value) {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitTags(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split('|')
    .map((v) => v.trim())
    .filter(Boolean);
}

function asBool(value, defaultValue = true) {
  if (value == null || value === '') {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
}

function loadBaseSnapshot() {
  if (!fs.existsSync(basePath)) {
    throw new Error(`Missing base snapshot: ${basePath}. Export JSON from /admin and save it as this file.`);
  }

  const content = fs.readFileSync(basePath, 'utf8');
  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.brands) || !Array.isArray(parsed.products)) {
    throw new Error('Base snapshot is invalid. It must include categories, brands, and products arrays.');
  }

  return parsed;
}

function validateRow(row, rowIndex) {
  const id = row.sku || `row-${rowIndex + 2}`;

  if (!row.sku) {
    throw new Error(`CSV validation failed at ${id}: sku is required.`);
  }
  if (!row.name) {
    throw new Error(`CSV validation failed at ${id}: name is required.`);
  }
  if (!row.categorySlug) {
    throw new Error(`CSV validation failed at ${id}: categorySlug is required.`);
  }
  if (!allowedTypes.has(row.type)) {
    throw new Error(`CSV validation failed at ${id}: type must be one of ${[...allowedTypes].join(', ')}.`);
  }
  if (!row.brand) {
    throw new Error(`CSV validation failed at ${id}: brand is required.`);
  }

  const priceEur = toNumber(row.priceEur);
  if (priceEur == null) {
    throw new Error(`CSV validation failed at ${id}: priceEur must be numeric.`);
  }

  if (row.balance && !allowedBalances.has(row.balance)) {
    throw new Error(`CSV validation failed at ${id}: balance must be one of ${[...allowedBalances].join(', ')}.`);
  }

  if (row.headShape && !allowedHeadShapes.has(row.headShape)) {
    throw new Error(`CSV validation failed at ${id}: headShape must be one of ${[...allowedHeadShapes].join(', ')}.`);
  }
}

function buildImageUrl(row) {
  if (row.imageUrl) {
    return row.imageUrl;
  }
  if (row.imageFile) {
    return `/imports/product-images/${row.imageFile}`;
  }
  return 'https://via.placeholder.com/1200x800?text=Racketpoint';
}

function buildProduct(row) {
  const priceEur = toNumber(row.priceEur) ?? 0;
  const costEur = toNumber(row.costEur);
  const stock = toInt(row.stock);
  const weightGrams = toInt(row.weightGrams);
  const originalPriceEur = toNumber(row.originalPriceEur);
  const salePriceEur = toNumber(row.salePriceEur);

  const badges = splitTags(row.badges);
  const sizes = splitTags(row.sizes);
  const details = row.details || '';
  const detailsWithSizes = sizes.length > 0 ? `${details} Sizes: ${sizes.join(' ')}`.trim() : details;

  return {
    sku: row.sku,
    name: row.name,
    categorySlug: row.categorySlug,
    type: row.type,
    brand: row.brand,
    price: `EUR ${priceEur.toFixed(2)}`,
    priceEur,
    originalPriceEur,
    salePriceEur,
    costEur,
    stock,
    details: detailsWithSizes,
    badges,
    imageUrl: buildImageUrl(row),
    color: row.color || undefined,
    headShape: row.headShape || undefined,
    balance: row.balance || undefined,
    weightGrams,
    attributes: sizes.length > 0 ? { sizes: sizes.join('|') } : undefined,
  };
}

function ensureBrands(baseSnapshot, products) {
  const brandMap = new Map(baseSnapshot.brands.map((b) => [b.name.toLowerCase(), b]));

  for (const product of products) {
    const key = product.brand.toLowerCase();
    const existing = brandMap.get(key);
    if (existing) {
      if (!existing.categorySlugs.includes(product.categorySlug)) {
        existing.categorySlugs.push(product.categorySlug);
      }
      continue;
    }

    const created = {
      name: product.brand,
      categorySlugs: [product.categorySlug],
      note: 'Auto-created from bulk CSV import.',
    };

    baseSnapshot.brands.push(created);
    brandMap.set(key, created);
  }
}

function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const baseSnapshot = loadBaseSnapshot();
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csvContent);

  if (rows.length === 0) {
    throw new Error('CSV has no data rows.');
  }

  for (let index = 0; index < rows.length; index += 1) {
    validateRow(rows[index], index);
  }

  const activeRows = rows.filter((row) => asBool(row.active, true));
  const products = activeRows.map(buildProduct);

  ensureBrands(baseSnapshot, products);

  const nextSnapshot = {
    categories: baseSnapshot.categories,
    brands: baseSnapshot.brands,
    products,
    orders: Array.isArray(baseSnapshot.orders) ? baseSnapshot.orders : [],
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(nextSnapshot, null, 2), 'utf8');

  console.log(`Bulk import JSON generated: ${outPath}`);
  console.log(`Products included: ${products.length}`);
  console.log('Next step: paste this JSON into /admin -> Import JSON.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
