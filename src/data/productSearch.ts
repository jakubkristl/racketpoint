import type { Product } from './catalog';

/** Lowercase and strip diacritics so "rodri" matches "RODRÍGUEZ". */
export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokenizeSearchQuery(query: string) {
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    return [];
  }

  return normalized.split(/\s+/).filter(Boolean);
}

export function buildProductSearchHaystack(product: Pick<Product, 'name' | 'details' | 'brand' | 'badges' | 'sku' | 'nameBg' | 'detailsBg' | 'description' | 'descriptionBg'>) {
  return normalizeSearchText([
    product.name,
    product.nameBg,
    product.details,
    product.detailsBg,
    product.description,
    product.descriptionBg,
    product.brand,
    product.sku,
    ...(product.badges ?? []),
  ].filter(Boolean).join(' '));
}

/** Every query token must appear in the product haystack (order-independent). */
export function productMatchesQuery(product: Product, query: string) {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return true;
  }

  const haystack = buildProductSearchHaystack(product);
  return tokens.every((token) => haystack.includes(token));
}
