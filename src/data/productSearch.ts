/**
 * Normalize product/search text for matching:
 * - strip diacritics (Rodríguez → Rodriguez)
 * - lowercase
 * - collapse non-alphanumeric to spaces
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

type SearchableProduct = {
  name: string;
  brand?: string;
  sku?: string;
};

/**
 * Match when every query token appears in the product haystack
 * (substring), so "miguel rodri" finds "MIGUEL RODRÍGUEZ ONE20".
 * Uses name/brand/sku only — not long details/description copy —
 * so collaboration mentions do not create false hits.
 */
export function productMatchesSearchQuery(product: SearchableProduct, query: string): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return true;
  }

  const haystack = normalizeSearchText(
    [product.name, product.brand, product.sku]
      .filter(Boolean)
      .join(' '),
  );

  return tokens.every((token) => haystack.includes(token));
}
