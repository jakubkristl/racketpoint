import type { Product } from './catalog';

const SOURCE_LINE_PATTERN = /(?:^|\s)(source|supplier|vendor)\s*:\s*https?:\/\/\S+/gi;
const URL_PATTERN = /https?:\/\/\S+/gi;
const HIDDEN_ATTRIBUTE_KEY_PATTERN = /(source|supplier|vendor|article\s*code|articlecode|cost|margin|wholesale|internal|sourcesku|publicsku|dbid)/i;

const ATTRIBUTE_LABELS: Record<string, string> = {
  productType: 'Тип продукт',
  producttype: 'Тип продукт',
  headShape: 'Форма на главата',
  weightGrams: 'Тегло',
  weight: 'Тегло',
  balance: 'Баланс',
  color: 'Цвят',
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  Racket: 'Ракета',
  Balls: 'Топки',
  Wear: 'Облекло',
  Bag: 'Чанта',
  Accessory: 'Аксесоар',
  String: 'Корда',
  Grip: 'Грип',
  Shoe: 'Обувки',
};

const BALANCE_LABELS: Record<string, string> = {
  'Head-heavy': 'Тежка глава',
  Balanced: 'Балансирана',
  'Head-light': 'Лека глава',
};

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

export function formatAttributeLabel(key: string) {
  const normalized = key.trim();
  if (ATTRIBUTE_LABELS[normalized]) {
    return ATTRIBUTE_LABELS[normalized];
  }

  const spaced = normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!spaced) {
    return key;
  }

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatAttributeValue(key: string, value: string) {
  if (/product\s*type/i.test(key) || key === 'productType' || key === 'producttype') {
    return PRODUCT_TYPE_LABELS[value] ?? value;
  }

  if (key === 'balance') {
    return BALANCE_LABELS[value] ?? value;
  }

  return value;
}

function extractWeightGrams(text: string) {
  const match = text.match(/\b(\d{2,3})\s*(?:g|гр|grams?)\b/i);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  return value >= 70 && value <= 400 ? value : undefined;
}

export function getPublicAttributes(attributes: Record<string, string> | undefined) {
  if (!attributes) {
    return [] as Array<{ key: string; value: string }>;
  }

  return Object.entries(attributes)
    .filter(([key]) => !HIDDEN_ATTRIBUTE_KEY_PATTERN.test(key))
    .map(([key, value]) => {
      const label = formatAttributeLabel(key);
      return {
        key: label,
        value: formatAttributeValue(key, sanitizeCatalogText(String(value ?? ''))),
      };
    })
    .filter((entry) => entry.value.length > 0);
}

export function getProductCardFacts(product: Product) {
  const description = sanitizeCatalogText(getPublicShortDetails(product) || getPublicDescription(product));
  const facts: string[] = [];
  const typeLabel = PRODUCT_TYPE_LABELS[product.type] ?? product.type;
  facts.push(typeLabel);

  const weight = typeof product.weightGrams === 'number'
    ? product.weightGrams
    : extractWeightGrams(`${product.name} ${product.details} ${product.detailsBg ?? ''} ${product.description ?? ''} ${product.descriptionBg ?? ''}`);

  if (weight) {
    facts.push(`${weight} г`);
  }

  if (product.balance) {
    facts.push(BALANCE_LABELS[product.balance] ?? product.balance);
  } else {
    const blob = `${product.details} ${product.detailsBg ?? ''} ${product.description ?? ''} ${product.descriptionBg ?? ''}`.toLowerCase();
    if (/\bhead[- ]heavy\b|тежка глава/.test(blob)) {
      facts.push('Тежка глава');
    } else if (/\bhead[- ]light\b|лека глава/.test(blob)) {
      facts.push('Лека глава');
    } else if (/\bbalanced\b|балансиран/.test(blob)) {
      facts.push('Балансирана');
    }
  }

  if (product.color) {
    facts.push(product.color);
  }

  const shortDescription = description.length > 120 ? `${description.slice(0, 117).trim()}...` : description;

  return {
    description: shortDescription,
    facts,
  };
}
