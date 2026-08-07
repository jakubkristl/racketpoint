import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sql } from '@vercel/postgres';

const SITE = 'https://www.squashpoint.com';
const CONCURRENCY = 5;

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeWhitespace(value) {
  return decodeHtmlEntities(value)
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

function stripHtml(html) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>(\s*)/gi, '\n')
      .replace(/<\/(p|div|li|section|article|table|tr|h[1-6]|ul|ol|dl|dd|dt|header|footer)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  );
}

function extractFirst(html, pattern) {
  const match = html.match(pattern);
  return match?.[1] ? normalizeWhitespace(match[1]) : '';
}

function parsePrice(value) {
  const numeric = Number.parseFloat(value.replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : 0;
}

function titleCase(value) {
  return value
    .split(/[-\s_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function inferBrand(slug, title) {
  const knownBrands = new Set([
    'Head',
    'Dunlop',
    'Tecnifibre',
    'Unsquashable',
    'Asics',
    'Harrow',
    'Karakal',
    'Babolat',
    'Bullpadel',
    'Nox',
    'Siux',
    'Adidas',
    'Wilson',
    'Prince',
    'Oliver',
    'Toalson',
    'Donnay',
    'Victor',
    'Yonex',
    'Grays',
    'Oxdog',
    'RS',
    'Dunlop',
    'Salming',
  ]);

  const firstSlugSegment = slug.split('-')[0] ?? '';
  const candidateFromSlug = titleCase(firstSlugSegment);
  if (knownBrands.has(candidateFromSlug)) {
    return candidateFromSlug;
  }

  const firstTitleWord = title.split(/\s+/)[0] ?? '';
  const candidateFromTitle = titleCase(firstTitleWord);
  if (knownBrands.has(candidateFromTitle)) {
    return candidateFromTitle;
  }

  return candidateFromTitle || candidateFromSlug || 'Squashpoint';
}

function inferSubCategory(slug, title, text) {
  const haystack = `${slug} ${title} ${text}`.toLowerCase();

  if (/(shoe|upcourt|gel-rocket|blade ff|court|asics)/i.test(haystack)) {
    return 'Footwear';
  }

  if (/(bag|combi|monstercombi|backpack|case|tournament bag|cover)/i.test(haystack)) {
    return 'Bags';
  }

  if (/(ball|shuttle)/i.test(haystack)) {
    return 'Balls';
  }

  if (/(grip|overgrip|wristband)/i.test(haystack)) {
    return 'Grips';
  }

  if (/(string|stringing)/i.test(haystack)) {
    return 'Strings';
  }

  if (/(shirt|short|shorts|skirt|dress|hoodie|jacket|sweat|clothing|apparel|wear)/i.test(haystack)) {
    return 'Apparel';
  }

  if (/(accessor|eye protection|cap|sock|towel|brace)/i.test(haystack)) {
    return 'Accessories';
  }

  return 'Rackets';
}

function inferWeightGrams(text) {
  const patterns = [
    /(?:Frame\s+weight|Weight)\s*([0-9]{2,3}(?:[.,][0-9])?)\s*g(?:rams?)?/i,
    /([0-9]{2,3}(?:[.,][0-9])?)\s*g\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const numeric = Number.parseFloat(match[1].replace(',', '.'));
      if (Number.isFinite(numeric)) {
        return Math.round(numeric);
      }
    }
  }

  return undefined;
}

function inferBalance(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes('head heavy')) {
    return 'Head-heavy';
  }
  if (normalized.includes('head light')) {
    return 'Head-light';
  }
  if (normalized.includes('balanced')) {
    return 'Balanced';
  }
  return undefined;
}

function getProductLinks(collectionHtml) {
  const links = new Set();
  const regex = /https:\/\/www\.squashpoint\.com\/[^"'<>\s]+?\.html/gi;

  for (const match of collectionHtml.matchAll(regex)) {
    const url = match[0];
    if (url.includes('/collection/') || url.includes('/service/') || url.includes('/account/') || url.includes('/cart/') || url.includes('/compare/')) {
      continue;
    }
    links.add(url);
  }

  return [...links];
}

function getMaxPageNumber(collectionHtml) {
  const pageNumbers = [...collectionHtml.matchAll(/\/collection\/page(\d+)\.html/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));

  return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; RacketpointImporter/1.0)',
      accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return await response.text();
}

async function collectProductUrls() {
  const firstPageHtml = await fetchHtml(`${SITE}/collection/`);
  const maxPage = getMaxPageNumber(firstPageHtml);
  const productUrls = new Set(getProductLinks(firstPageHtml));

  for (let page = 2; page <= maxPage; page += 1) {
    const pageHtml = await fetchHtml(`${SITE}/collection/page${page}.html`);
    for (const url of getProductLinks(pageHtml)) {
      productUrls.add(url);
    }
  }

  return [...productUrls];
}

function parseProductPage(url, html) {
  const rawText = stripHtml(html);
  const slug = new URL(url).pathname.replace(/\/+$/, '').split('/').pop() ?? '';
  const title = extractFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || extractFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || titleCase(slug.replace(/\.html$/i, ''));
  const sku = extractFirst(rawText, /Article code:\s*([A-Za-z0-9_-]+)/i) || `sp_${slug.replace(/[^a-z0-9]+/gi, '_')}`;
  const priceMatch = rawText.match(/€\s*([0-9]+(?:[.,][0-9]+)?)(?:\s+€\s*([0-9]+(?:[.,][0-9]+)?))?\s*Incl\. VAT/i);
  const firstPrice = priceMatch?.[1] ? parsePrice(priceMatch[1]) : 0;
  const secondPrice = priceMatch?.[2] ? parsePrice(priceMatch[2]) : null;
  const sellingPrice = secondPrice ?? firstPrice;
  const discountPrice = secondPrice ? firstPrice : null;
  const availabilityText = extractFirst(rawText, /In stock[^\n]*/i);
  const isOutOfStock = /out of stock/i.test(rawText);
  const descriptionSection = extractFirst(rawText, /Product description\s+([\s\S]*?)\s+Specifications/i) || extractFirst(rawText, /Product description\s+([\s\S]*?)\s+You might also like/i);
  const specsSection = extractFirst(rawText, /Specifications\s+([\s\S]*?)(?:You might also like|Recently viewed|My basket|Compare products|Squashpoint Newsletter|Additional Links|$)/i);
  const allImages = [...html.matchAll(/https:\/\/cdn\.webshopapp\.com\/shops\/[^"'<>\s]+?\.(?:jpe?g|png|webp)/gi)].map((match) => match[0]);
  const imageUrls = [...new Set(allImages)];
  const detailText = [descriptionSection, specsSection].filter(Boolean).join('\n\n');
  const weightGrams = inferWeightGrams(detailText || rawText);
  const balance = inferBalance(detailText || rawText);
  const brand = inferBrand(slug, title);
  const subCategory = inferSubCategory(slug, title, detailText || rawText);

  return {
    id: sku,
    title,
    slug,
    description: detailText || title,
    brand,
    sport: 'squash',
    sub_category: subCategory,
    cost_price: Number((sellingPrice * 0.56).toFixed(2)),
    selling_price: Number(sellingPrice.toFixed(2)),
    discount_price: discountPrice == null ? null : Number(discountPrice.toFixed(2)),
    stock: isOutOfStock ? 0 : 12,
    images: imageUrls.length > 0 ? imageUrls : [`${SITE}/images/placeholder/${encodeURIComponent(slug)}`],
    attributes: {
      source: 'squashpoint.com',
      sourceUrl: url,
      articleCode: sku,
      availability: availabilityText || (isOutOfStock ? 'Out of stock' : 'In stock'),
      ...(weightGrams ? { weightGrams: String(weightGrams) } : {}),
      ...(balance ? { balance } : {}),
      ...(specsSection ? { specifications: specsSection } : {}),
    },
    sizes: [],
    weight_grams: weightGrams ?? null,
    balance: balance ?? null,
    rating: 4.5,
  };
}

async function upsertProduct(product) {
  await sql`
    INSERT INTO products (
      id, title, slug, description, brand, sport, sub_category,
      cost_price, selling_price, discount_price, stock, images, attributes, sizes,
      weight_grams, balance, rating
    ) VALUES (
      ${product.id},
      ${product.title},
      ${product.slug},
      ${product.description},
      ${product.brand},
      ${product.sport},
      ${product.sub_category},
      ${product.cost_price},
      ${product.selling_price},
      ${product.discount_price},
      ${product.stock},
      ${JSON.stringify(product.images)}::jsonb,
      ${JSON.stringify(product.attributes)}::jsonb,
      ${JSON.stringify(product.sizes)}::jsonb,
      ${product.weight_grams},
      ${product.balance},
      ${product.rating}
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      brand = EXCLUDED.brand,
      sport = EXCLUDED.sport,
      sub_category = EXCLUDED.sub_category,
      cost_price = EXCLUDED.cost_price,
      selling_price = EXCLUDED.selling_price,
      discount_price = EXCLUDED.discount_price,
      stock = EXCLUDED.stock,
      images = EXCLUDED.images,
      attributes = EXCLUDED.attributes,
      sizes = EXCLUDED.sizes,
      weight_grams = EXCLUDED.weight_grams,
      balance = EXCLUDED.balance,
      rating = EXCLUDED.rating
  `;
}

async function main() {
  console.log('Collecting product URLs from Squashpoint collection pages...');
  const productUrls = await collectProductUrls();
  console.log(`Found ${productUrls.length} product URLs.`);

  const parsedProducts = [];
  let processed = 0;

  async function worker(url) {
    const html = await fetchHtml(url);
    const product = parseProductPage(url, html);
    parsedProducts.push(product);
    processed += 1;
    if (processed % 25 === 0 || processed === productUrls.length) {
      console.log(`Parsed ${processed}/${productUrls.length}`);
    }
  }

  const queue = [...productUrls];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const nextUrl = queue.shift();
      if (!nextUrl) {
        return;
      }
      await worker(nextUrl);
    }
  });

  await Promise.all(workers);

  const publicDir = resolve('public', 'imports');
  await mkdir(publicDir, { recursive: true });
  const outputPath = resolve(publicDir, 'squashpoint-products.json');
  await writeFile(outputPath, JSON.stringify(parsedProducts, null, 2), 'utf8');
  console.log(`Wrote public import file to ${outputPath}`);

  if (process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL) {
    console.log('Writing products to the database...');
    let saved = 0;
    for (const product of parsedProducts) {
      await upsertProduct(product);
      saved += 1;
      if (saved % 25 === 0 || saved === parsedProducts.length) {
        console.log(`Saved ${saved}/${parsedProducts.length}`);
      }
    }

    const countResult = await sql`SELECT COUNT(*)::int AS count FROM products`;
    console.log(`Done. Database now has ${countResult.rows[0]?.count ?? 0} products.`);
    return;
  }

  console.log('No database connection string was present, so the import was exported for local fallback only.');
}

main().catch((error) => {
  console.error('Squashpoint import failed:', error);
  process.exitCode = 1;
});
