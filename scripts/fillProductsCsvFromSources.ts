import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

import { products as localProducts } from '../src/data/catalog';

type CsvRow = {
  sku: string;
  name: string;
  categorySlug: string;
  type: string;
  brand: string;
  priceEur: string;
  costEur: string;
  stock: string;
  details: string;
  badges: string;
  sizes: string;
  weightGrams: string;
  balance: string;
  color: string;
  headShape: string;
  imageFile: string;
  imageUrl: string;
  originalPriceEur: string;
  salePriceEur: string;
  active: string;
};

const rootDir = process.cwd();
const outCsvPath = path.resolve(rootDir, 'bulk/products/products-template.csv');
const squashpointPath = path.resolve(rootDir, 'public/imports/squashpoint-products.json');

const supplierXlsxPaths = [
  'C:/Users/Jakub Kristl/Desktop/Double Yellow.xlsx',
  'C:/Users/Jakub Kristl/Desktop/Sport and Beyond/Price offers/Karakal.xlsx',
  'C:/Users/Jakub Kristl/Desktop/Sport and Beyond/Price offers/Tecnifibre 2026.xlsx',
  'C:/Users/Jakub Kristl/Desktop/Sport and Beyond/Price offers/VICTOR-06.12.2025.xlsx',
];

const csvHeaders = [
  'sku',
  'name',
  'categorySlug',
  'type',
  'brand',
  'priceEur',
  'costEur',
  'stock',
  'details',
  'badges',
  'sizes',
  'weightGrams',
  'balance',
  'color',
  'headShape',
  'imageFile',
  'imageUrl',
  'originalPriceEur',
  'salePriceEur',
  'active',
] as const;

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMoney(value: unknown): number | undefined {
  const text = cleanText(value);
  if (!text) {
    return undefined;
  }

  const normalized = text
    .replace(/[^0-9,.-]/g, '')
    .replace(/\.(?=.*\.)/g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : undefined;
}

function formatMoney(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }
  return value.toFixed(2);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categoryFromText(text: string): string {
  const s = text.toLowerCase();
  if (/table\s*tennis|ping\s*pong/.test(s)) {
    return 'table-tennis';
  }
  if (/badminton|shuttle/.test(s)) {
    return 'badminton';
  }
  if (/padel/.test(s)) {
    return 'padel';
  }
  if (/tennis/.test(s)) {
    return 'tennis';
  }
  return 'squash';
}

function typeFromText(text: string): string {
  const s = text.toLowerCase();
  if (/shoe|trainer|footwear/.test(s)) {
    return 'Shoe';
  }
  if (/bag|backpack|holdall|duffel/.test(s)) {
    return 'Bag';
  }
  if (/grip|overgrip|replacement grip/.test(s)) {
    return 'Grip';
  }
  if (/string|set\s*\d+\.?\d*\s*m/.test(s)) {
    return 'String';
  }
  if (/ball|shuttlecock|shuttle/.test(s)) {
    return 'Balls';
  }
  if (/short|shirt|dress|hoodie|jacket|skirt|sock|wear|apparel/.test(s)) {
    return 'Wear';
  }
  if (/racket|racquet|frame/.test(s)) {
    return 'Racket';
  }
  return 'Accessory';
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowToCsv(row: CsvRow): string {
  return csvHeaders
    .map((key) => csvEscape(row[key] ?? ''))
    .join(',');
}

function makeEmptyRow(): CsvRow {
  return {
    sku: '',
    name: '',
    categorySlug: 'squash',
    type: 'Accessory',
    brand: '',
    priceEur: '',
    costEur: '',
    stock: '12',
    details: '',
    badges: '',
    sizes: '',
    weightGrams: '',
    balance: '',
    color: '',
    headShape: '',
    imageFile: '',
    imageUrl: '',
    originalPriceEur: '',
    salePriceEur: '',
    active: 'true',
  };
}

function normalizeSku(raw: string, fallbackSeed: string): string {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_.-]/g, '');

  if (cleaned) {
    return cleaned.toUpperCase();
  }

  return `AUTO-${fallbackSeed.toUpperCase()}`;
}

function addOrMergeRow(target: Map<string, CsvRow>, incoming: CsvRow) {
  const existing = target.get(incoming.sku);
  if (!existing) {
    target.set(incoming.sku, incoming);
    return;
  }

  const merged: CsvRow = { ...existing };

  for (const key of csvHeaders) {
    const nextValue = incoming[key] ?? '';
    if (!merged[key] && nextValue) {
      merged[key] = nextValue;
    }
  }

  if (existing.badges && incoming.badges) {
    const tags = new Set([
      ...existing.badges.split('|').map((x) => x.trim()).filter(Boolean),
      ...incoming.badges.split('|').map((x) => x.trim()).filter(Boolean),
    ]);
    merged.badges = [...tags].join('|');
  }

  target.set(incoming.sku, merged);
}

function fromLocalCatalog(): CsvRow[] {
  return localProducts.map((product, index) => {
    const row = makeEmptyRow();
    const priceFromText = parseMoney(product.price);
    const price = product.priceEur ?? priceFromText ?? product.salePriceEur ?? product.originalPriceEur ?? 0;

    row.sku = normalizeSku(product.sku ?? '', `local-${index + 1}`);
    row.name = cleanText(product.name);
    row.categorySlug = cleanText(product.categorySlug || 'squash');
    row.type = cleanText(product.type || 'Accessory');
    row.brand = cleanText(product.brand);
    row.priceEur = formatMoney(price);
    row.costEur = formatMoney(product.costEur);
    row.stock = String(product.stock ?? 12);
    row.details = cleanText(product.details ?? product.description ?? '');
    row.badges = (product.badges ?? []).join('|');
    row.weightGrams = product.weightGrams ? String(product.weightGrams) : '';
    row.balance = cleanText(product.balance ?? '');
    row.color = cleanText(product.color ?? '');
    row.headShape = cleanText(product.headShape ?? '');
    row.imageUrl = cleanText(product.imageUrl ?? '');
    row.originalPriceEur = formatMoney(product.originalPriceEur);
    row.salePriceEur = formatMoney(product.salePriceEur);
    row.active = 'true';

    if (product.attributes?.sizes) {
      row.sizes = cleanText(product.attributes.sizes);
    }

    return row;
  });
}

function pickBestImage(images: unknown): string {
  if (!Array.isArray(images)) {
    return '';
  }

  const candidates = images
    .map((item) => cleanText(item))
    .filter((url) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url))
    .filter((url) => !/favicon|apple-touch-icon|logo-upload-footer|assets\//i.test(url));

  const highestRes = candidates.find((url) => /660x900|1200x1200|image\.jpg|image\.png|image\.webp/i.test(url));
  return highestRes || candidates[0] || '';
}

function fromSquashpointJson(): CsvRow[] {
  if (!fs.existsSync(squashpointPath)) {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(squashpointPath, 'utf8')) as Array<Record<string, unknown>>;

  return parsed.map((item, index) => {
    const row = makeEmptyRow();
    const title = cleanText(item.title ?? item.name ?? '');
    const articleCode = cleanText((item.attributes as Record<string, unknown> | undefined)?.articleCode ?? item.id ?? '');
    const sourceUrl = cleanText((item.attributes as Record<string, unknown> | undefined)?.sourceUrl ?? '');
    const sellingPrice = parseMoney(item.selling_price) ?? 0;
    const discountPrice = parseMoney(item.discount_price);

    row.sku = normalizeSku(articleCode, `sp-${index + 1}`);
    row.name = title;
    row.categorySlug = categoryFromText(`${item.sport ?? ''} ${item.sub_category ?? ''} ${title}`);
    row.type = typeFromText(`${item.sub_category ?? ''} ${title}`);
    row.brand = cleanText(item.brand ?? 'Squashpoint');
    row.priceEur = formatMoney(sellingPrice);
    row.costEur = formatMoney(parseMoney(item.cost_price));
    row.stock = String(Number.isFinite(Number(item.stock)) ? Number(item.stock) : 12);
    row.details = cleanText(item.description ?? '');
    row.badges = 'SQUASHPOINT';
    row.weightGrams = cleanText(item.weight_grams ?? (item.attributes as Record<string, unknown> | undefined)?.weightGrams ?? '');
    row.balance = cleanText(item.balance ?? (item.attributes as Record<string, unknown> | undefined)?.balance ?? '');
    row.imageUrl = pickBestImage(item.images);
    row.originalPriceEur = discountPrice != null ? formatMoney(sellingPrice) : '';
    row.salePriceEur = discountPrice != null ? formatMoney(discountPrice) : '';
    row.active = 'true';

    if (sourceUrl) {
      row.details = row.details ? `${row.details} Source: ${sourceUrl}` : `Source: ${sourceUrl}`;
    }

    return row;
  });
}

function normalizeHeader(value: unknown): string {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function scoreHeaderRow(row: unknown[]): number {
  const merged = row.map((cell) => normalizeHeader(cell)).join(' ');
  const keywords = [
    'sku', 'item', 'article', 'code', 'model',
    'name', 'description', 'product',
    'brand', 'price', 'uvp', 'rrp', 'eur',
  ];
  return keywords.reduce((acc, keyword) => (merged.includes(keyword) ? acc + 1 : acc), 0);
}

function findHeaderIndex(rows: unknown[][]): number {
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < Math.min(rows.length, 25); i += 1) {
    const score = scoreHeaderRow(rows[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function findValueByKeys(record: Record<string, unknown>, keys: string[]): string {
  for (const [rawKey, value] of Object.entries(record)) {
    const key = normalizeHeader(rawKey);
    if (keys.some((k) => key.includes(k))) {
      const text = cleanText(value);
      if (text) {
        return text;
      }
    }
  }
  return '';
}

function inferBrandFromFilename(filePath: string): string {
  const name = path.basename(filePath).replace(/\.xlsx$/i, '');
  const head = name.split(/[-_ ]/)[0] || name;
  return cleanText(head);
}

function fromSupplierWorkbook(filePath: string): CsvRow[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(filePath, { cellDates: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Skipping workbook ${filePath}: ${message}`);
    return [];
  }

  const supplierBrand = inferBrandFromFilename(filePath);
  const rows: CsvRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    if (matrix.length === 0) {
      continue;
    }

    const headerIndex = findHeaderIndex(matrix);
    const header = matrix[headerIndex].map((h, idx) => {
      const normalized = normalizeHeader(h);
      return normalized || `col${idx + 1}`;
    });

    for (let rowIndex = headerIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
      const rawCells = matrix[rowIndex];
      const nonEmpty = rawCells.filter((cell) => cleanText(cell));
      if (nonEmpty.length < 2) {
        continue;
      }

      const record: Record<string, unknown> = {};
      for (let i = 0; i < header.length; i += 1) {
        record[header[i]] = rawCells[i] ?? '';
      }

      const name = findValueByKeys(record, ['name', 'description', 'product', 'item']);
      const skuRaw = findValueByKeys(record, ['sku', 'article', 'code', 'model', 'itemno', 'itemnr', 'artno']);
      const priceRaw = findValueByKeys(record, ['uvp', 'rrp', 'price', 'eur', 'retail', 'recommended']);
      const costRaw = findValueByKeys(record, ['lp', 'net', 'wholesale', 'cost']);
      const stockRaw = findValueByKeys(record, ['stock', 'qty', 'quantity']);
      const sizeRaw = findValueByKeys(record, ['size']);
      const colorRaw = findValueByKeys(record, ['color', 'colour']);
      const imageRaw = findValueByKeys(record, ['image', 'url', 'photo']);
      const explicitBrand = findValueByKeys(record, ['brand', 'manufacturer']);

      if (!name || name.length < 2) {
        continue;
      }

      const mergedText = `${sheetName} ${name} ${explicitBrand} ${supplierBrand}`;
      const row = makeEmptyRow();
      row.sku = normalizeSku(skuRaw, `${slugify(supplierBrand)}-${slugify(sheetName)}-${rowIndex}`);
      row.name = name;
      row.categorySlug = categoryFromText(mergedText);
      row.type = typeFromText(mergedText);
      row.brand = explicitBrand || supplierBrand;

      const price = parseMoney(priceRaw);
      const cost = parseMoney(costRaw);
      row.priceEur = formatMoney(price);
      row.costEur = formatMoney(cost);
      row.stock = stockRaw && Number.isFinite(Number(stockRaw)) ? String(Number(stockRaw)) : '12';
      row.details = Object.entries(record)
        .filter(([k, v]) => {
          const value = cleanText(v);
          return value && !['sku', 'article', 'code', 'name', 'description', 'product', 'item', 'price', 'uvp', 'rrp', 'eur', 'lp', 'net'].some((needle) => k.includes(needle));
        })
        .slice(0, 8)
        .map(([k, v]) => `${k}:${cleanText(v)}`)
        .join('; ');

      row.badges = 'SUPPLIER';
      row.sizes = sizeRaw;
      row.color = colorRaw;
      row.imageUrl = imageRaw;
      row.active = 'true';
      rows.push(row);
    }
  }

  return rows;
}

function buildCsv(rows: CsvRow[]): string {
  const lines = [csvHeaders.join(',')];
  for (const row of rows) {
    lines.push(rowToCsv(row));
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  const bySku = new Map<string, CsvRow>();

  const local = fromLocalCatalog();
  for (const row of local) {
    addOrMergeRow(bySku, row);
  }

  const squashpoint = fromSquashpointJson();
  for (const row of squashpoint) {
    addOrMergeRow(bySku, row);
  }

  let supplierRowsCount = 0;
  for (const filePath of supplierXlsxPaths) {
    const supplierRows = fromSupplierWorkbook(filePath);
    supplierRowsCount += supplierRows.length;
    for (const row of supplierRows) {
      addOrMergeRow(bySku, row);
    }
  }

  const rows = [...bySku.values()].filter((row) => row.name && row.priceEur);
  rows.sort((a, b) => a.categorySlug.localeCompare(b.categorySlug) || a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));

  const csv = buildCsv(rows);
  fs.writeFileSync(outCsvPath, csv, 'utf8');

  console.log(`CSV updated: ${outCsvPath}`);
  console.log(`Rows from local catalog: ${local.length}`);
  console.log(`Rows from Squashpoint JSON: ${squashpoint.length}`);
  console.log(`Rows from supplier XLSX files (before dedupe): ${supplierRowsCount}`);
  console.log(`Final rows after dedupe/filter: ${rows.length}`);
}

main();
