import type { Product } from './catalog';

const SOURCE_LINE_PATTERN = /(?:^|\s)(source|supplier|vendor)\s*:\s*https?:\/\/\S+/gi;
const URL_PATTERN = /https?:\/\/\S+/gi;
const HIDDEN_ATTRIBUTE_KEY_PATTERN = /(source|supplier|vendor|article\s*code|articlecode|cost|margin|wholesale|internal)/i;

function cleanText(text: string) {
  return text
    .replace(SOURCE_LINE_PATTERN, ' ')
    .replace(URL_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeCatalogText(value: string | undefined) {
  if (!value) {
    return '';
  }

  return cleanText(String(value));
}

export function getPublicDescription(product: Product) {
  const preferred = product.descriptionBg ?? product.description ?? product.details;
  return sanitizeCatalogText(preferred);
}

export function getPublicShortDetails(product: Product) {
  return sanitizeCatalogText(product.detailsBg ?? product.details);
}

export function getPublicAttributes(attributes: Record<string, string> | undefined) {
  if (!attributes) {
    return [] as Array<{ key: string; value: string }>;
  }

  return Object.entries(attributes)
    .filter(([key]) => !HIDDEN_ATTRIBUTE_KEY_PATTERN.test(key))
    .map(([key, value]) => ({
      key,
      value: sanitizeCatalogText(String(value ?? '')),
    }))
    .filter((entry) => entry.value.length > 0);
}
