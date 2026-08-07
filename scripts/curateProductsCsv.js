import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const csvPath = path.resolve(rootDir, 'bulk/products/products-template.csv');
const squashpointPath = path.resolve(rootDir, 'public/imports/squashpoint-products.json');

const placeholderImagePatterns = [
  /\/480x460x1\/image\.(jpg|png|webp)/i,
  /favicon\.png/i,
  /apple-touch-icon\.png/i,
  /assets\/logo/i,
  /logo-upload-footer/i,
];

const marginByType = {
  Racket: 0.32,
  Shoe: 0.32,
  Bag: 0.3,
  Wear: 0.3,
  String: 0.3,
  Grip: 0.28,
  Balls: 0.28,
  Accessory: 0.3,
};

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
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((h) => String(h).trim());
  const records = rows.slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ''))
    .map((r) => {
      const rec = {};
      for (let index = 0; index < headers.length; index += 1) {
        rec[headers[index]] = String(r[index] ?? '').trim();
      }
      return rec;
    });

  return { headers, records };
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function stringifyCsv(headers, records) {
  const lines = [headers.join(',')];
  for (const record of records) {
    lines.push(headers.map((h) => csvEscape(record[h] ?? '')).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function parseNumber(value) {
  if (value == null || value === '') {
    return undefined;
  }
  const normalized = String(value)
    .replace(/[^0-9,.-]/g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatPrice(value) {
  return Number(value).toFixed(2);
}

function normalizeType(value) {
  const source = String(value || '').trim();
  const map = {
    racket: 'Racket',
    balls: 'Balls',
    wear: 'Wear',
    bag: 'Bag',
    accessory: 'Accessory',
    string: 'String',
    grip: 'Grip',
    shoe: 'Shoe',
  };
  return map[source.toLowerCase()] ?? source;
}

function normalizeCategory(value) {
  const source = String(value || '').trim().toLowerCase();
  if (source === 'table tennis') {
    return 'table-tennis';
  }
  if (source.includes('table') && source.includes('tennis')) {
    return 'table-tennis';
  }
  return source.replace(/\s+/g, '-');
}

function isPlaceholderImage(url) {
  return placeholderImagePatterns.some((pattern) => pattern.test(url));
}

function isUsableImage(url) {
  if (!url) {
    return false;
  }
  const clean = String(url).trim();
  if (!clean) {
    return false;
  }
  if (clean.startsWith('data:image/')) {
    return true;
  }
  if (!/^https?:\/\//i.test(clean) && !clean.startsWith('/')) {
    return false;
  }
  if (isPlaceholderImage(clean)) {
    return false;
  }
  return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(clean) || clean.includes('/files/');
}

function normalizeSku(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_.-]/g, '')
    .toUpperCase();
}

function extractSourceUrl(details) {
  const match = String(details || '').match(/https?:\/\/[^\s,;]+/i);
  return match ? match[0] : '';
}

function chooseBestSquashpointImage(images) {
  if (!Array.isArray(images)) {
    return '';
  }

  const urls = images
    .map((image) => String(image || '').trim())
    .filter(Boolean)
    .filter((url) => !isPlaceholderImage(url));

  const priority = urls.find((url) => /\/660x900x1\//i.test(url))
    || urls.find((url) => /\/image\.(jpg|jpeg|png|webp)(\?|$)/i.test(url))
    || urls.find((url) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url));

  return priority || '';
}

function buildSquashpointMaps() {
  if (!fs.existsSync(squashpointPath)) {
    return {
      byArticleCode: new Map(),
      bySourceUrl: new Map(),
      byName: new Map(),
    };
  }

  const parsed = JSON.parse(fs.readFileSync(squashpointPath, 'utf8'));
  const byArticleCode = new Map();
  const bySourceUrl = new Map();
  const byName = new Map();

  for (const item of parsed) {
    const image = chooseBestSquashpointImage(item.images);
    if (!image) {
      continue;
    }

    const articleCode = normalizeSku(item?.attributes?.articleCode || item.id || '');
    const sourceUrl = String(item?.attributes?.sourceUrl || '').trim();
    const title = String(item.title || '').trim().toLowerCase();

    if (articleCode) {
      byArticleCode.set(articleCode, image);
    }
    if (sourceUrl) {
      bySourceUrl.set(sourceUrl.toLowerCase(), image);
    }
    if (title) {
      byName.set(title, image);
    }
  }

  return { byArticleCode, bySourceUrl, byName };
}

async function fetchImageFromSourcePage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; RacketpointImageCurator/1.0)',
      },
    });
    if (!response.ok) {
      return '';
    }

    const html = await response.text();

    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (og?.[1] && isUsableImage(og[1])) {
      return og[1];
    }

    const matches = [...html.matchAll(/https:\/\/cdn\.webshopapp\.com\/shops\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi)]
      .map((m) => m[0])
      .filter((candidate) => !isPlaceholderImage(candidate));

    return matches[0] || '';
  } catch {
    return '';
  }
}

function roundRetailPrice(price) {
  if (price < 15) {
    return Number(price.toFixed(2));
  }
  const floored = Math.floor(price);
  const adjusted = floored + 0.95;
  return Number(adjusted.toFixed(2));
}

function extractSourceRetailPrice(details) {
  const text = String(details || '');
  const patterns = [
    /rppinter\s*:\s*([0-9]+(?:[.,][0-9]+)?)/i,
    /rrp\s*:\s*([0-9]+(?:[.,][0-9]+)?)/i,
    /uvp\s*:\s*([0-9]+(?:[.,][0-9]+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) {
      continue;
    }
    const parsed = parseNumber(match[1]);
    if (parsed != null && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function computeTargetPrice(record) {
  const price = parseNumber(record.priceEur);
  const cost = parseNumber(record.costEur);
  const sourceRetail = extractSourceRetailPrice(record.details);
  const salePrice = parseNumber(record.salePriceEur);
  const originalPrice = parseNumber(record.originalPriceEur);

  // Missing cost is acceptable: keep product and anchor price to source/competition level.
  if (cost == null || cost <= 0) {
    const competitionAnchor = sourceRetail ?? salePrice ?? originalPrice ?? price;
    if (competitionAnchor == null || competitionAnchor <= 0) {
      return { remove: true, reason: 'invalid-price' };
    }
    return { remove: false, price: roundRetailPrice(competitionAnchor), mode: 'source-anchor' };
  }

  if (price == null || price <= 0) {
    const fallback = sourceRetail ?? salePrice ?? originalPrice;
    if (fallback == null || fallback <= 0) {
      return { remove: true, reason: 'invalid-price' };
    }
    return { remove: false, price: roundRetailPrice(fallback), mode: 'source-anchor' };
  }

  const productType = normalizeType(record.type);
  const targetMargin = marginByType[productType] ?? 0.3;
  const minPrice = cost / (1 - targetMargin);
  const competitorCeiling = price * 1.15;

  if (minPrice > competitorCeiling) {
    return { remove: true, reason: 'margin-vs-competition-conflict' };
  }

  const nextPrice = Math.max(price, minPrice);
  return { remove: false, price: roundRetailPrice(nextPrice), mode: 'margin-based' };
}

async function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const { headers, records } = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  if (records.length === 0) {
    throw new Error('CSV has no product rows.');
  }

  const squashpointMaps = buildSquashpointMaps();
  let enrichedFromSquashpoint = 0;
  let enrichedFromLiveFetch = 0;

  const needsLiveFetch = [];

  for (const record of records) {
    record.sku = normalizeSku(record.sku);
    record.type = normalizeType(record.type);
    record.categorySlug = normalizeCategory(record.categorySlug);
    record.active = String(record.active || 'TRUE').toLowerCase() === 'false' ? 'false' : 'true';

    if (isUsableImage(record.imageUrl)) {
      continue;
    }

    const sku = normalizeSku(record.sku);
    const sourceUrl = extractSourceUrl(record.details).toLowerCase();
    const nameKey = String(record.name || '').trim().toLowerCase();

    const mappedImage = squashpointMaps.byArticleCode.get(sku)
      || squashpointMaps.bySourceUrl.get(sourceUrl)
      || squashpointMaps.byName.get(nameKey)
      || '';

    if (mappedImage) {
      record.imageUrl = mappedImage;
      enrichedFromSquashpoint += 1;
      continue;
    }

    if (sourceUrl) {
      needsLiveFetch.push(record);
    }
  }

  for (const record of needsLiveFetch) {
    if (isUsableImage(record.imageUrl)) {
      continue;
    }
    const sourceUrl = extractSourceUrl(record.details);
    if (!sourceUrl) {
      continue;
    }
    const fetchedImage = await fetchImageFromSourcePage(sourceUrl);
    if (fetchedImage) {
      record.imageUrl = fetchedImage;
      enrichedFromLiveFetch += 1;
    }
  }

  let removedNoImage = 0;
  let removedPrice = 0;
  let removedMarginConflict = 0;
  let repriced = 0;
  let sourceAnchored = 0;

  const curated = [];

  for (const record of records) {
    const hasImage = isUsableImage(record.imageUrl) || isUsableImage(record.imageFile);
    if (!hasImage) {
      removedNoImage += 1;
      continue;
    }

    const priceDecision = computeTargetPrice(record);
    if (priceDecision.remove) {
      if (priceDecision.reason === 'invalid-price') {
        removedPrice += 1;
      } else {
        removedMarginConflict += 1;
      }
      continue;
    }

    const currentPrice = parseNumber(record.priceEur);
    if (currentPrice != null && Math.abs(currentPrice - priceDecision.price) > 0.009) {
      repriced += 1;
    }
    if (priceDecision.mode === 'source-anchor') {
      sourceAnchored += 1;
    }

    record.priceEur = formatPrice(priceDecision.price);

    const currentCost = parseNumber(record.costEur);
    if (currentCost != null && currentCost > 0) {
      record.costEur = formatPrice(currentCost);
    }

    curated.push(record);
  }

  curated.sort((a, b) => {
    const byCategory = String(a.categorySlug).localeCompare(String(b.categorySlug));
    if (byCategory !== 0) {
      return byCategory;
    }
    const byBrand = String(a.brand).localeCompare(String(b.brand));
    if (byBrand !== 0) {
      return byBrand;
    }
    return String(a.name).localeCompare(String(b.name));
  });

  fs.writeFileSync(csvPath, stringifyCsv(headers, curated), 'utf8');

  console.log(`CSV curated: ${csvPath}`);
  console.log(`Input rows: ${records.length}`);
  console.log(`Output rows: ${curated.length}`);
  console.log(`Images enriched from local Squashpoint data: ${enrichedFromSquashpoint}`);
  console.log(`Images enriched by live source fetch: ${enrichedFromLiveFetch}`);
  console.log(`Rows removed (no image): ${removedNoImage}`);
  console.log(`Rows removed (invalid price): ${removedPrice}`);
  console.log(`Rows removed (margin vs competition conflict): ${removedMarginConflict}`);
  console.log(`Rows repriced: ${repriced}`);
  console.log(`Rows priced by source anchor (no cost or no valid base price): ${sourceAnchored}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
