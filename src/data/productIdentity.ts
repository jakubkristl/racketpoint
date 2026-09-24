import type { Product } from './catalog';

/** Normalize brand/name for identity matching (accents, punctuation). */
export function normalizeLookupValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizeSkuToken(value: string) {
  return value.toLowerCase().replace(/^prd_/, '').replace(/[^a-z0-9]/g, '');
}

/**
 * Identity keys used by Admin↔shop overlay and catalog dedupe.
 * Includes SKU aliases (POS-/article/source) and brand+name.
 */
export function collectProductIdentityKeys(product: Product) {
  const keys = new Set<string>();
  const sku = normalizeSkuToken(product.sku);
  if (sku) {
    keys.add(`id:${sku}`);
    if (sku.startsWith('pos') && sku.length > 3) {
      keys.add(`id:${sku.slice(3)}`);
    }
  }

  for (const attrKey of ['sourceSku', 'articleCode', 'articlecode', 'publicSku', 'internalDbId'] as const) {
    const raw = product.attributes?.[attrKey];
    if (typeof raw === 'string' && raw.trim()) {
      keys.add(`id:${normalizeSkuToken(raw)}`);
    }
  }

  const brand = normalizeLookupValue(product.brand);
  const name = normalizeLookupValue(product.name);
  if (brand && name) {
    keys.add(`name:${brand}|${name}`);
  }

  return [...keys];
}

/** Prefer Admin-overlaid / richer commercial records when collapsing twins. */
export function scoreCanonicalProduct(product: Product) {
  let score = 0;

  if (product.attributes?.internalDbId?.trim()) {
    score += 200;
  }

  if (typeof product.costEur === 'number' && product.costEur > 0) {
    score += 100;
  }

  if (typeof product.salePriceEur === 'number' && product.salePriceEur > 0) {
    score += 40;
  }

  if (typeof product.originalPriceEur === 'number' && product.originalPriceEur > 0) {
    score += 20;
  }

  if (typeof product.stock === 'number' && product.stock > 0) {
    score += 15;
  }

  if (product.imageUrl && !/placeholder|via\.placeholder|placehold\.co|data:image\/svg/i.test(product.imageUrl)) {
    score += 25;
  }

  score += Math.min((product.details ?? '').length, 80);

  // Prefer public article-style SKUs over seeded usq-/POS-/prd_ aliases when tied.
  const sku = product.sku.toLowerCase();
  if (/^[a-z0-9]+$/i.test(product.sku) && !sku.startsWith('pos-') && !sku.startsWith('usq-') && !sku.startsWith('prd_')) {
    score += 10;
  }

  return score;
}

export function preferCanonicalProduct(a: Product, b: Product) {
  const scoreA = scoreCanonicalProduct(a);
  const scoreB = scoreCanonicalProduct(b);
  if (scoreB > scoreA) {
    return b;
  }
  if (scoreA > scoreB) {
    return a;
  }
  // Stable tie-break: keep the first (usually import/public row).
  return a;
}

export function buildIdentityKeySet(products: Product[]) {
  const keys = new Set<string>();
  for (const product of products) {
    for (const key of collectProductIdentityKeys(product)) {
      keys.add(key);
    }
  }
  return keys;
}

export function productMatchesIdentityKeys(product: Product, keys: Set<string>) {
  return collectProductIdentityKeys(product).some((key) => keys.has(key));
}

/**
 * Collapse twin cards that share identity keys.
 * Prefer Admin-overlaid / richer rows; keep first on ties (import order).
 */
export function dedupeProductsByIdentity(products: Product[]) {
  const kept: Product[] = [];
  const claimedKeys = new Map<string, number>();

  for (const product of products) {
    const keys = collectProductIdentityKeys(product);
    let existingIndex = -1;

    for (const key of keys) {
      const index = claimedKeys.get(key);
      if (index != null) {
        existingIndex = index;
        break;
      }
    }

    if (existingIndex < 0) {
      const index = kept.length;
      kept.push(product);
      for (const key of keys) {
        claimedKeys.set(key, index);
      }
      continue;
    }

    const winner = preferCanonicalProduct(kept[existingIndex], product);
    kept[existingIndex] = winner;
    for (const key of collectProductIdentityKeys(winner)) {
      claimedKeys.set(key, existingIndex);
    }
  }

  return kept;
}

export function filterProductsBySuppressedKeys(products: Product[], suppressedKeys: Set<string>) {
  if (suppressedKeys.size === 0) {
    return products;
  }

  return products.filter((product) => !productMatchesIdentityKeys(product, suppressedKeys));
}
