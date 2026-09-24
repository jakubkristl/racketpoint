import {
  brands as defaultBrands,
  categories as defaultCategories,
  products as defaultProducts,
  type Brand,
  type Category,
  type Product,
  type CategorySlug,
} from './catalog';
import { getAuthHeaders, getSessionUser } from './accountStore';
import {
  buildIdentityKeySet,
  collectProductIdentityKeys,
  dedupeProductsByIdentity,
  filterProductsBySuppressedKeys,
  normalizeLookupValue,
  normalizeSkuToken,
  productMatchesIdentityKeys,
  scoreCanonicalProduct,
} from './productIdentity';

export type OrderInput = {
  fullName: string;
  email: string;
  items: Array<{
    sku: string;
    quantity: number;
    priceEur?: number;
  }>;
  billingAddress?: {
    city: string;
    address: string;
    phone: string;
  };
  paymentMethod?: 'card' | 'cash_on_delivery';
  notes?: string;
  payment?: {
    provider?: 'borica';
    status?: 'pending' | 'approved' | 'failed' | 'cash_on_delivery';
    gatewayOrder?: string;
    rrn?: string;
    intRef?: string;
    amountEur?: number;
    currency?: string;
    rc?: string;
    action?: string;
    signatureValid?: boolean;
    approvedAt?: string;
  };
  idempotencyKey?: string;
};

export type OrderRecord = OrderInput & {
  reference: string;
  createdAt: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded';
};

export type StoreSnapshot = {
  categories: Category[];
  brands: Brand[];
  products: Product[];
  orders: OrderRecord[];
};

export type CatalogSyncPayload = {
  categories?: Category[];
  brands?: Brand[];
  products: Product[];
};

export type CatalogSyncResult = {
  ok: boolean;
  inserted: number;
  updated: number;
  processed: number;
  totalProducts: number;
  skippedSuppressed?: number;
};

export type CmsCollection = 'categories' | 'brands' | 'products';

const storageKey = 'racketpoint-cms-state-v7';
const previousStorageKey = 'racketpoint-cms-state-v6';
const orderStorageKey = 'racketpoint-order-inbox-v4';
const legacyStorageKey = 'racketshop-cms-state-v3';
const legacyOrderStorageKey = 'racketshop-order-inbox-v3';

type CmsState = Pick<StoreSnapshot, 'categories' | 'brands' | 'products'>;

const categoryFallbackImages: Record<string, { default: string; byType: Partial<Record<Product['type'], string>> }> = {
  squash: {
    default: 'https://images.pexels.com/photos/7648269/pexels-photo-7648269.jpeg?auto=compress&cs=tinysrgb&w=1600',
    byType: {
      Racket: 'https://images.pexels.com/photos/14629511/pexels-photo-14629511.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Grip: 'https://images.pexels.com/photos/7648079/pexels-photo-7648079.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Bag: 'https://images.pexels.com/photos/7648297/pexels-photo-7648297.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Wear: 'https://images.pexels.com/photos/7648075/pexels-photo-7648075.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Shoe: 'https://images.pexels.com/photos/7648280/pexels-photo-7648280.jpeg?auto=compress&cs=tinysrgb&w=1600',
      String: 'https://images.pexels.com/photos/7648084/pexels-photo-7648084.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Balls: 'https://images.pexels.com/photos/7648078/pexels-photo-7648078.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Accessory: 'https://images.pexels.com/photos/7648080/pexels-photo-7648080.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
  },
  tennis: {
    default: 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=1600',
    byType: {
      Racket: 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Grip: 'https://images.pexels.com/photos/5739121/pexels-photo-5739121.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Bag: 'https://images.pexels.com/photos/8223947/pexels-photo-8223947.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Wear: 'https://images.pexels.com/photos/8224422/pexels-photo-8224422.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Shoe: 'https://images.pexels.com/photos/8224433/pexels-photo-8224433.jpeg?auto=compress&cs=tinysrgb&w=1600',
      String: 'https://images.pexels.com/photos/5741292/pexels-photo-5741292.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Balls: 'https://images.pexels.com/photos/5739115/pexels-photo-5739115.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Accessory: 'https://images.pexels.com/photos/12645014/pexels-photo-12645014.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
  },
  badminton: {
    default: 'https://images.pexels.com/photos/2202685/pexels-photo-2202685.jpeg?auto=compress&cs=tinysrgb&w=1600',
    byType: {
      Racket: 'https://images.pexels.com/photos/2202685/pexels-photo-2202685.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Grip: 'https://images.pexels.com/photos/6878017/pexels-photo-6878017.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Bag: 'https://images.pexels.com/photos/8007173/pexels-photo-8007173.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Wear: 'https://images.pexels.com/photos/10544231/pexels-photo-10544231.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Shoe: 'https://images.pexels.com/photos/8007094/pexels-photo-8007094.jpeg?auto=compress&cs=tinysrgb&w=1600',
      String: 'https://images.pexels.com/photos/8007419/pexels-photo-8007419.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Balls: 'https://images.pexels.com/photos/8007075/pexels-photo-8007075.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Accessory: 'https://images.pexels.com/photos/8007408/pexels-photo-8007408.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
  },
  padel: {
    default: 'https://images.pexels.com/photos/35248332/pexels-photo-35248332.jpeg?auto=compress&cs=tinysrgb&w=1600',
    byType: {
      Racket: 'https://images.pexels.com/photos/35248374/pexels-photo-35248374.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Grip: 'https://images.pexels.com/photos/4536850/pexels-photo-4536850.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Bag: 'https://images.pexels.com/photos/32897038/pexels-photo-32897038.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Wear: 'https://images.pexels.com/photos/35248481/pexels-photo-35248481.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Shoe: 'https://images.pexels.com/photos/35248470/pexels-photo-35248470.jpeg?auto=compress&cs=tinysrgb&w=1600',
      String: 'https://images.pexels.com/photos/35248389/pexels-photo-35248389.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Balls: 'https://images.pexels.com/photos/35646550/pexels-photo-35646550.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Accessory: 'https://images.pexels.com/photos/35248259/pexels-photo-35248259.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
  },
  'table-tennis': {
    default: 'https://images.pexels.com/photos/709134/pexels-photo-709134.jpeg?auto=compress&cs=tinysrgb&w=1600',
    byType: {
      Racket: 'https://images.pexels.com/photos/709134/pexels-photo-709134.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Grip: 'https://images.pexels.com/photos/187329/pexels-photo-187329.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Bag: 'https://images.pexels.com/photos/38446271/pexels-photo-38446271.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Wear: 'https://images.pexels.com/photos/4114727/pexels-photo-4114727.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Shoe: 'https://images.pexels.com/photos/31273673/pexels-photo-31273673.jpeg?auto=compress&cs=tinysrgb&w=1600',
      String: 'https://images.pexels.com/photos/16686174/pexels-photo-16686174.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Balls: 'https://images.pexels.com/photos/4080060/pexels-photo-4080060.jpeg?auto=compress&cs=tinysrgb&w=1600',
      Accessory: 'https://images.pexels.com/photos/6631422/pexels-photo-6631422.jpeg?auto=compress&cs=tinysrgb&w=1600',
    },
  },
};

function hasUsableProductImage(imageUrl: string | undefined) {
  if (!imageUrl || !imageUrl.trim()) {
    return false;
  }

  const normalized = imageUrl.trim().toLowerCase();
  if (normalized.startsWith('data:image/svg+xml')) {
    return false;
  }

  return !normalized.includes('via.placeholder.com')
    && !normalized.includes('placehold.co')
    && !normalized.includes('placeholder.com');
}

function isFallbackProductImage(imageUrl: string | undefined) {
  if (!hasUsableProductImage(imageUrl)) {
    return true;
  }

  const normalized = (imageUrl ?? '').trim().toLowerCase();
  return normalized.includes('images.pexels.com');
}

function pickBestImageUrlFromCandidates(images: string[]) {
  for (const rawUrl of images) {
    const imageUrl = rawUrl.trim();
    if (!imageUrl) {
      continue;
    }

    const normalized = imageUrl.toLowerCase();
    if (!normalized.startsWith('http')) {
      continue;
    }

    if (normalized.includes('favicon')
      || normalized.includes('apple-touch-icon')
      || normalized.includes('/themes/')
      || normalized.includes('/assets/')
      || normalized.includes('banner-grid')
      || normalized.includes('logo-upload')
      || normalized.includes('/logo.')) {
      continue;
    }

    if (normalized.includes('/90x90x1/')
      || normalized.includes('/300x250x2/')
      || normalized.includes('/480x460x1/')) {
      continue;
    }

    return imageUrl;
  }

  return images.find((imageUrl) => hasUsableProductImage(imageUrl));
}

function tokenizeLookupValue(value: string) {
  const stopWords = new Set(['squash', 'tennis', 'table', 'badminton', 'padel', 'racket', 'racquet', 'pack', 'the']);
  return normalizeLookupValue(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function findReferenceImage(product: Product, references: Product[]) {
  const brandNorm = normalizeLookupValue(product.brand);
  const productNameNorm = normalizeLookupValue(product.name);
  const productTokens = tokenizeLookupValue(product.name);

  const candidates = references
    .filter((ref) => hasUsableProductImage(ref.imageUrl) && normalizeLookupValue(ref.brand) === brandNorm);

  if (candidates.length === 0) {
    return null;
  }

  let best: { imageUrl: string; score: number } | null = null;

  for (const candidate of candidates) {
    const candidateNameNorm = normalizeLookupValue(candidate.name);
    const candidateTokens = tokenizeLookupValue(candidate.name);

    let score = 0;
    if (candidateNameNorm === productNameNorm) {
      score += 100;
    }

    if (candidateNameNorm.includes(productNameNorm) || productNameNorm.includes(candidateNameNorm)) {
      score += 60;
    }

    const overlap = productTokens.filter((token) => candidateTokens.includes(token)).length;
    score += overlap * 12;

    if (score > 0 && (!best || score > best.score)) {
      best = { imageUrl: candidate.imageUrl, score };
    }
  }

  return best && best.score >= 24 ? best.imageUrl : null;
}

function getFallbackImageForProduct(product: Product) {
  const bucket = categoryFallbackImages[product.categorySlug] ?? categoryFallbackImages.squash;
  return bucket.byType[product.type] ?? bucket.default;
}

function normalizeProductImage(product: Product): Product {
  if (hasUsableProductImage(product.imageUrl)) {
    return product;
  }

  return {
    ...product,
    imageUrl: getFallbackImageForProduct(product),
  };
}

function normalizeProductList(products: Product[]) {
  return retagCatalogProducts(products.map(normalizeProductImage));
}

function enrichProductsWithReferenceImages(products: Product[], references: Product[]) {
  if (references.length === 0) {
    return products;
  }

  return products.map((product) => {
    if (!isFallbackProductImage(product.imageUrl)) {
      return product;
    }

    const referenceImage = findReferenceImage(product, references);
    if (!referenceImage) {
      return product;
    }

    return {
      ...product,
      imageUrl: referenceImage,
    };
  });
}

function resolveCatalogSourceProduct(product: Product) {
  const skuNorm = normalizeSkuToken(product.sku);
  const sourceSku = product.attributes?.sourceSku;
  const sourceNorm = sourceSku ? normalizeSkuToken(sourceSku) : '';

  const match = defaultProducts.find((item) => {
    const itemNorm = normalizeSkuToken(item.sku);
    return itemNorm === skuNorm || (sourceNorm.length > 0 && itemNorm === sourceNorm);
  });

  if (match && hasUsableProductImage(match.imageUrl) && !isFallbackProductImage(match.imageUrl)) {
    return match;
  }

  return null;
}

function hydrateProductImages(products: Product[], references: Product[]) {
  const withCatalogImages = products.map((product) => {
    if (!isFallbackProductImage(product.imageUrl)) {
      return product;
    }

    const catalogSource = resolveCatalogSourceProduct(product);
    if (catalogSource) {
      return {
        ...product,
        name: catalogSource.name,
        details: catalogSource.details,
        imageUrl: catalogSource.imageUrl,
        supplierSource: catalogSource.supplierSource ?? product.supplierSource,
      };
    }

    return product;
  });

  const enriched = enrichProductsWithReferenceImages(withCatalogImages, references);
  return normalizeProductList(enriched);
}

function normalizeCmsState(snapshot: CmsState): CmsState {
  const normalizedCategories = snapshot.categories.map((category) => {
    const defaults = defaultCategories.find((item) => item.slug === category.slug);

    return {
      ...category,
      ...defaults,
      heroCopy: '',
      name: defaults?.name ?? category.name,
      description: defaults?.description ?? category.description,
    };
  });

  return {
    categories: normalizedCategories,
    brands: snapshot.brands,
    products: hydrateProductImages(snapshot.products, []),
  };
}

const defaultSnapshot: CmsState = {
  categories: defaultCategories,
  brands: defaultBrands,
  products: defaultProducts,
};

let productCache: Product[] | null = null;
let orderCache: OrderRecord[] = [];

function hasWindow() {
  return typeof window !== 'undefined';
}

function readJson<T>(key: string): T | null {
  if (!hasWindow()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function loadSnapshot(): CmsState {
  const raw = readJson<CmsState>(storageKey)
    ?? readJson<CmsState>(previousStorageKey)
    ?? readJson<CmsState>(legacyStorageKey)
    ?? defaultSnapshot;
  const normalized = normalizeCmsState(raw);

  if (hasWindow()) {
    writeJson(storageKey, normalized);
  }

  return normalized;
}

function loadOrders(): OrderRecord[] {
  const parsed = readJson<OrderRecord[]>(orderStorageKey) ?? readJson<OrderRecord[]>(legacyOrderStorageKey) ?? [];
  return parsed.map((order) => ({
    ...order,
    status: order.status ?? 'Pending',
  }));
}

function mapSportToSlug(value: unknown): CategorySlug {
  const normalized = String(value ?? 'squash').trim().toLowerCase();

  if (normalized.includes('badminton')) {
    return 'badminton';
  }

  if (normalized.includes('padel')) {
    return 'padel';
  }

  if (normalized.includes('table')) {
    return 'table-tennis';
  }

  if (normalized.includes('tennis')) {
    return 'tennis';
  }

  return 'squash';
}

function decodeProductText(value: unknown) {
  return String(value ?? '')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function typeFromTitle(text: string): Product['type'] | null {
  const value = decodeProductText(text).toLowerCase();

  if (/\b(shoe|shoes|trainer|trainers|footwear|obuv|обувки|gel-rocket|gel-court|gel-tactic|gel rocket|powerbreak|upcourt|blade ff|viper sl|viper pro|recoil strike|recoil ultra|asics)\b/.test(value)) {
    return 'Shoe';
  }

  if (/\b(bag|backpack|holdall|duffel|rucksack|taska|чанта|combi)\b/.test(value) || /\b\d{1,2}r\b/.test(value)) {
    return 'Bag';
  }

  if (/\b(overgrip|replacement grip|grip|грип)\b/.test(value)) {
    return 'Grip';
  }

  if (/\b(string reel|string set|strings?|vyplet|кордаж|корди|reel\s*\d+|set\s*\d+(?:[.,]\d+)?\s*m)\b/.test(value) && !/\b(racket|racquet|ракета)\b/.test(value)) {
    return 'String';
  }

  if (/\b(shuttlecock|shuttle|kosik|пера)\b/.test(value)) {
    return 'Balls';
  }

  if (/\b(squash ball|tennis ball|padel ball|loptick|lopty|balls?|топка|топчета|double yellow|single yellow)\b/.test(value) && !/\b(racket|racquet|ракета)\b/.test(value)) {
    return 'Balls';
  }

  if (/\b(polo|tee\b|t-shirt|tshirt|shirt|shorts?|hoodie|jacket|skirt|socks?|sweater|fleece|jumper|bandana|apparel|облекло|insole|headband|hairband)\b/.test(value)) {
    return 'Wear';
  }

  if (/\b(dampener|crashtape|bottle|wristband|hat|cap|tape|goggles|glasses|sunglasses|eyewear|towel|bumper|grommet|stencil|sweatband|visor|eye protection)\b/.test(value) && !/\b(racket|racquet|ракета)\b/.test(value)) {
    return 'Accessory';
  }

  if (/\b(racket|racquet|frame|хилк|ракета)\b/.test(value)) {
    return 'Racket';
  }

  return null;
}

function resolveProductType(item: {
  title?: unknown;
  name?: unknown;
  subCategory?: unknown;
  sub_category?: unknown;
  type?: unknown;
  attributes?: unknown;
}): Product['type'] {
  const title = decodeProductText(item.title ?? item.name);
  const fromTitle = typeFromTitle(title);

  // Importer buckets are untrusted (rackets were filed as Bags/Footwear from page copy).
  // Classify from the product name; unknown racket-sport models default to Racket.
  if (fromTitle) {
    return fromTitle;
  }

  return 'Racket';
}

export function findProductBySku(products: Product[], sku: string) {
  const exact = products.find((product) => product.sku === sku);
  if (exact) {
    return exact;
  }

  const needle = normalizeSkuToken(sku);
  if (!needle) {
    return undefined;
  }

  return products.find((product) => {
    const tokens = [
      product.sku,
      product.attributes?.sourceSku,
      product.attributes?.articleCode,
      product.attributes?.publicSku,
      product.attributes?.internalDbId,
    ];
    return tokens.some((token) => token && normalizeSkuToken(token) === needle);
  });
}

/** DB id for Admin create/update/delete (import/public SKU may differ after overlay). */
export function resolveProductApiId(product: Pick<Product, 'sku' | 'attributes'>, fallbackSku?: string) {
  const fromAttributes = product.attributes?.internalDbId?.trim();
  if (fromAttributes) {
    return fromAttributes;
  }

  return fallbackSku?.trim() || product.sku;
}

/**
 * Reject list/promo below cost. Returns a Bulgarian ops message, or null when valid.
 * Cost <= 0 means no floor (cost not set yet).
 */
export function validateProductPricesAgainstCost(
  product: Pick<Product, 'priceEur' | 'salePriceEur' | 'costEur' | 'price'>,
) {
  const cost = typeof product.costEur === 'number' && Number.isFinite(product.costEur)
    ? product.costEur
    : 0;

  if (cost <= 0) {
    return null;
  }

  const listPrice = typeof product.priceEur === 'number' && Number.isFinite(product.priceEur)
    ? product.priceEur
    : Number(String(product.price ?? '').replace(/[^\d,.-]/g, '').replace(',', '.'));

  if (Number.isFinite(listPrice) && listPrice < cost) {
    return `Цената (${listPrice.toFixed(2)} EUR) не може да е по-ниска от себестойността (${cost.toFixed(2)} EUR).`;
  }

  if (
    typeof product.salePriceEur === 'number'
    && Number.isFinite(product.salePriceEur)
    && product.salePriceEur > 0
    && product.salePriceEur < cost
  ) {
    return `Промо цената (${product.salePriceEur.toFixed(2)} EUR) не може да е по-ниска от себестойността (${cost.toFixed(2)} EUR).`;
  }

  return null;
}

/** Apply Admin/API sell, promo, cost, and stock onto a public/import product row. */
function applyApiCommercialOverlay(base: Product, api: Product): Product {
  return {
    ...base,
    priceEur: api.priceEur,
    salePriceEur: api.salePriceEur,
    originalPriceEur: api.originalPriceEur,
    price: api.price,
    costEur: api.costEur,
    stock: api.stock,
    badges: api.badges.length > 0 ? api.badges : base.badges,
    attributes: {
      ...base.attributes,
      ...api.attributes,
      internalDbId: api.sku,
      publicSku: base.sku,
    },
  };
}

function markApiSkusSharingIdentity(
  apiProducts: Product[],
  identityKeys: Set<string>,
  usedApiSkus: Set<string>,
) {
  for (const apiProduct of apiProducts) {
    if (usedApiSkus.has(apiProduct.sku)) {
      continue;
    }

    if (productMatchesIdentityKeys(apiProduct, identityKeys)) {
      usedApiSkus.add(apiProduct.sku);
    }
  }
}

/**
 * Import/JSON catalog keeps public URLs (numeric/article SKUs).
 * Admin/API rows often use different ids (e.g. POS-…, prd_…). Overlay commercial fields by identity
 * and dedupe so the shop shows Admin prices on the public PDP for every matched product.
 */
export function mergeApiProductsOverReference(apiProducts: Product[], referenceCatalog: Product[]) {
  if (referenceCatalog.length === 0) {
    return dedupeProductsByIdentity(apiProducts);
  }

  if (apiProducts.length === 0) {
    return [...referenceCatalog];
  }

  const apiByIdentity = new Map<string, Product>();
  for (const apiProduct of apiProducts) {
    for (const key of collectProductIdentityKeys(apiProduct)) {
      const existing = apiByIdentity.get(key);
      if (!existing || scoreCanonicalProduct(apiProduct) > scoreCanonicalProduct(existing)) {
        apiByIdentity.set(key, apiProduct);
      }
    }
  }

  const usedApiSkus = new Set<string>();
  const combined: Product[] = [];

  for (const reference of referenceCatalog) {
    let matched: Product | undefined;
    for (const key of collectProductIdentityKeys(reference)) {
      matched = apiByIdentity.get(key);
      if (matched) {
        break;
      }
    }

    if (matched) {
      const identityKeys = new Set([
        ...collectProductIdentityKeys(reference),
        ...collectProductIdentityKeys(matched),
      ]);
      markApiSkusSharingIdentity(apiProducts, identityKeys, usedApiSkus);
      usedApiSkus.add(matched.sku);
      combined.push(applyApiCommercialOverlay(reference, matched));
    } else {
      combined.push(reference);
    }
  }

  const combinedKeys = buildIdentityKeySet(combined);
  for (const apiProduct of apiProducts) {
    if (usedApiSkus.has(apiProduct.sku)) {
      continue;
    }

    if (productMatchesIdentityKeys(apiProduct, combinedKeys)) {
      usedApiSkus.add(apiProduct.sku);
      continue;
    }

    combined.push(apiProduct);
    for (const key of collectProductIdentityKeys(apiProduct)) {
      combinedKeys.add(key);
    }
  }

  return combined;
}

function mapTypeToSubCategory(type: Product['type']) {
  if (type === 'Balls') {
    return 'Balls';
  }

  if (type === 'Wear') {
    return 'Apparel';
  }

  if (type === 'Shoe') {
    return 'Footwear';
  }

  if (type === 'Bag') {
    return 'Bags';
  }

  if (type === 'String') {
    return 'Strings';
  }

  if (type === 'Grip') {
    return 'Grips';
  }

  if (type === 'Accessory') {
    return 'Accessories';
  }

  return 'Rackets';
}

/** List/sell unit price for cart + checkout (promo wins when set). */
export function getProductUnitPriceEur(product: Pick<Product, 'priceEur' | 'salePriceEur' | 'price'>) {
  if (typeof product.salePriceEur === 'number' && Number.isFinite(product.salePriceEur)) {
    return product.salePriceEur;
  }

  if (typeof product.priceEur === 'number' && Number.isFinite(product.priceEur)) {
    return product.priceEur;
  }

  const fromLabel = Number(String(product.price ?? '').replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(fromLabel) ? fromLabel : 0;
}

function mapApiProductToCatalogProduct(item: any): Product {
  // Keep list (selling) and promo (discount) separate so Admin edits stay correct.
  const listPrice = Number(item.sellingPrice ?? item.selling_price ?? 0);
  const discountRaw = item.discountPrice ?? item.discount_price;
  const discountPrice = discountRaw == null || discountRaw === '' ? null : Number(discountRaw);
  const hasPromo =
    discountPrice != null
    && Number.isFinite(discountPrice)
    && Number.isFinite(listPrice)
    && discountPrice > 0
    && discountPrice < listPrice;
  const displayPrice = hasPromo ? discountPrice! : listPrice;
  const imageArray = Array.isArray(item.imageArray)
    ? item.imageArray
    : Array.isArray(item.images)
      ? item.images
      : [];
  const images = imageArray.filter((value: unknown): value is string => typeof value === 'string');
  const bestImageUrl = pickBestImageUrlFromCandidates(images);

  return {
    sku: String(item.sku ?? item.id ?? ''),
    name: decodeProductText(item.title ?? item.name) || 'Unnamed product',
    categorySlug: mapSportToSlug(item.sport ?? item.categorySlug),
    type: resolveProductType(item),
    brand: String(item.brand ?? 'Racketpoint'),
    priceEur: Number.isFinite(listPrice) ? listPrice : 0,
    salePriceEur: hasPromo ? discountPrice! : undefined,
    originalPriceEur: hasPromo ? listPrice : undefined,
    price: `EUR ${Number.isFinite(displayPrice) ? displayPrice.toFixed(2) : '0.00'}`,
    costEur: Number(item.costPrice ?? item.cost_price ?? 0),
    stock: Number(item.stock ?? 0),
    details: String(item.description ?? ''),
    badges: hasPromo ? ['SALE'] : [],
    imageUrl: bestImageUrl || 'https://via.placeholder.com/1200x800?text=Racketpoint',
    weightGrams: item.weightGrams == null ? undefined : Number(item.weightGrams),
    balance: typeof item.balance === 'string' ? item.balance as Product['balance'] : undefined,
    attributes: item.attributes && typeof item.attributes === 'object'
      ? Object.fromEntries(
          Object.entries(item.attributes).filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'),
        )
      : undefined,
  };
}

function mapOrderToRecord(order: any): OrderRecord {
  const paymentStatus = String(order.paymentStatus ?? 'pending').toLowerCase();
  const paymentProvider = typeof order.paymentProvider === 'string' ? order.paymentProvider : undefined;

  const statusRaw = String(order.status ?? 'Pending');
  const allowedStatus = ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

  return {
    reference: String(order.id ?? ''),
    createdAt: String(order.createdAt ?? new Date().toISOString()),
    status: (allowedStatus.includes(statusRaw) ? statusRaw : 'Pending') as OrderRecord['status'],
    fullName: String(order.fullName ?? ''),
    email: String(order.email ?? ''),
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
        sku: String(item.sku ?? ''),
        quantity: Number(item.quantity ?? 1),
        priceEur: item.priceEur == null ? undefined : Number(item.priceEur),
      }))
      : [],
    billingAddress: order.address ?? undefined,
    paymentMethod: order.paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'card',
    notes: typeof order.notes === 'string' ? order.notes : undefined,
    payment: {
      provider: paymentProvider === 'borica' ? 'borica' : undefined,
      status: paymentStatus === 'approved'
        ? 'approved'
        : paymentStatus === 'failed'
          ? 'failed'
          : paymentStatus === 'cash_on_delivery'
            ? 'cash_on_delivery'
            : 'pending',
      gatewayOrder: typeof order.paymentReference === 'string' ? order.paymentReference : undefined,
      amountEur: typeof order.totalAmount === 'number' ? Number(order.totalAmount) : undefined,
      currency: 'EUR',
    },
  };
}

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

async function requestCatalogSeed() {
  const response = await fetch('/api/system/seed-catalog', {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    return false;
  }

  return true;
}

async function fetchProductsFromApi() {
  // Send auth when present so Admin receives costPrice (omitted on anonymous GET).
  const response = await fetch('/api/products', {
    headers: getAuthHeaders(),
  });
  const payload = await parseResponse<any[]>(response);
  return payload.map(mapApiProductToCatalogProduct);
}

async function fetchImportedSquashpointProducts() {
  const response = await fetch('/imports/squashpoint-products.json');

  if (!response.ok) {
    return [] as Product[];
  }

  const payload = await response.json().catch(() => [] as any[]);
  return Array.isArray(payload) ? payload.map(mapApiProductToCatalogProduct) : [];
}

function retagCatalogProducts(products: Product[]) {
  return products.map((product) => ({
    ...product,
    name: decodeProductText(product.name) || product.name,
    categorySlug: mapSportToSlug(product.categorySlug),
    type: resolveProductType({
      title: product.name,
      name: product.name,
    }),
  }));
}

function mergeWithDefaultCatalog(base: Product[], references: Product[]) {
  const existingSkus = new Set(base.map((product) => product.sku));
  const existingIdentityKeys = buildIdentityKeySet(base);
  const extras = defaultProducts.filter((product) => {
    if (existingSkus.has(product.sku)) {
      return false;
    }

    // Skip seed/POS twins of import or Admin rows (same brand+name or alias SKU).
    if (productMatchesIdentityKeys(product, existingIdentityKeys)) {
      return false;
    }

    return true;
  });
  const receptionPosExtras = extras.filter((product) => product.attributes?.source === 'reception-pos');
  const otherExtras = extras.filter((product) => product.attributes?.source !== 'reception-pos');

  return retagCatalogProducts(hydrateProductImages([...receptionPosExtras, ...base, ...otherExtras], references));
}

const hiddenProductKeysStorage = 'racketpoint-hidden-product-keys-v1';

function loadLocalSuppressedIdentityKeys() {
  const raw = readJson<string[]>(hiddenProductKeysStorage);
  return new Set(Array.isArray(raw) ? raw.filter((value) => typeof value === 'string') : []);
}

function saveLocalSuppressedIdentityKeys(keys: Set<string>) {
  writeJson(hiddenProductKeysStorage, [...keys]);
}

export function suppressProductLocally(product: Product) {
  const keys = loadLocalSuppressedIdentityKeys();
  for (const key of collectProductIdentityKeys(product)) {
    keys.add(key);
  }
  saveLocalSuppressedIdentityKeys(keys);
  return keys;
}

async function fetchSuppressedIdentityKeys() {
  const local = loadLocalSuppressedIdentityKeys();

  try {
    const response = await fetch('/api/products/suppressions', {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      return local;
    }

    const payload = await response.json().catch(() => null) as { keys?: string[] } | string[] | null;
    const remoteKeys = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.keys)
        ? payload.keys
        : [];

    for (const key of remoteKeys) {
      if (typeof key === 'string' && key.trim()) {
        local.add(key.trim());
      }
    }

    saveLocalSuppressedIdentityKeys(local);
  } catch {
    // Offline / older deploy: local suppressions still apply.
  }

  return local;
}

function finalizeCatalogProducts(products: Product[], suppressedKeys: Set<string>) {
  return filterProductsBySuppressedKeys(products, suppressedKeys);
}

export async function fetchProducts() {
  const [mapped, referenceCatalog, suppressedKeys] = await Promise.all([
    fetchProductsFromApi().catch(() => [] as Product[]),
    fetchImportedSquashpointProducts().catch(() => [] as Product[]),
    fetchSuppressedIdentityKeys().catch(() => loadLocalSuppressedIdentityKeys()),
  ]);

  if (referenceCatalog.length > 0) {
    // Prefer Admin/API commercial fields even when public SKU ≠ DB id (import article vs Admin id).
    const combined = mergeApiProductsOverReference(mapped, referenceCatalog);
    const normalized = finalizeCatalogProducts(
      mergeWithDefaultCatalog(combined, referenceCatalog),
      suppressedKeys,
    );
    productCache = normalized;
    return normalized;
  }

  if (mapped.length === 0) {
    const seeded = await requestCatalogSeed().catch(() => false);

    if (seeded) {
      const retry = await fetchProductsFromApi().catch(() => [] as Product[]);
      if (retry.length > 0) {
        const normalized = finalizeCatalogProducts(
          mergeWithDefaultCatalog(retry, referenceCatalog),
          suppressedKeys,
        );
        productCache = normalized;
        return normalized;
      }
    }

    const localStarterCatalog = loadSnapshot().products;
    if (localStarterCatalog.length > 0) {
      const normalized = finalizeCatalogProducts(
        mergeWithDefaultCatalog(localStarterCatalog, referenceCatalog),
        suppressedKeys,
      );
      productCache = normalized;
      return normalized;
    }

    const imported = referenceCatalog;
    if (imported.length > 0) {
      const normalized = finalizeCatalogProducts(
        mergeWithDefaultCatalog(imported, imported),
        suppressedKeys,
      );
      productCache = normalized;
      return normalized;
    }

    return [];
  }

  const normalized = finalizeCatalogProducts(
    mergeWithDefaultCatalog(mapped, referenceCatalog),
    suppressedKeys,
  );
  productCache = normalized;
  return normalized;
}

export async function fetchOrders(options?: { includeAll?: boolean }) {
  const query = options?.includeAll ? '?all=1' : '';
  const response = await fetch(`/api/orders${query}`, {
    headers: getAuthHeaders(),
  });
  const payload = await parseResponse<any[]>(response);
  orderCache = payload.map(mapOrderToRecord);
  return orderCache;
}

export async function loadStoreSnapshot() {
  const cms = loadSnapshot();

  const [products, orders] = await Promise.all([
    fetchProducts().catch(() => productCache ?? cms.products),
    getSessionUser()
      ? fetchOrders({ includeAll: getSessionUser()?.role === 'ADMIN' }).catch(() => orderCache)
      : Promise.resolve(orderCache),
  ]);

  return {
    categories: defaultCategories,
    brands: cms.brands,
    products,
    orders,
  } satisfies StoreSnapshot;
}

export function getStoreSnapshot(): StoreSnapshot {
  const snapshot = loadSnapshot();

  return {
    categories: defaultCategories,
    brands: snapshot.brands,
    products: productCache ?? hydrateProductImages(snapshot.products, []),
    orders: orderCache.length > 0 ? orderCache : loadOrders(),
  };
}

export function saveStoreSnapshot(snapshot: CmsState) {
  writeJson(storageKey, snapshot);
}

export function updateCmsCollection<T extends CmsCollection>(collection: T, items: StoreSnapshot[T]) {
  const currentSnapshot = loadSnapshot();
  const nextSnapshot = {
    ...currentSnapshot,
    [collection]: items,
  } as CmsState;

  saveStoreSnapshot(nextSnapshot);
  return {
    ...nextSnapshot,
    orders: loadOrders(),
  } satisfies StoreSnapshot;
}

export function createCategory(category: Category) {
  return updateCmsCollection('categories', [...loadSnapshot().categories, category]);
}

export function updateCategory(categorySlug: string, nextCategory: Category) {
  return updateCmsCollection(
    'categories',
    loadSnapshot().categories.map((category) => (category.slug === categorySlug ? nextCategory : category)),
  );
}

export function deleteCategory(categorySlug: string) {
  const snapshot = loadSnapshot();
  const nextCategories = snapshot.categories.filter((category) => category.slug !== categorySlug);
  const nextProducts = snapshot.products.filter((product) => product.categorySlug !== (categorySlug as CategorySlug));
  const nextBrands = snapshot.brands.map((brand) => ({
    ...brand,
    categorySlugs: brand.categorySlugs.filter((slug) => slug !== (categorySlug as CategorySlug)),
  })).filter((brand) => brand.categorySlugs.length > 0);

  saveStoreSnapshot({ categories: nextCategories, brands: nextBrands, products: nextProducts });
  return {
    categories: nextCategories,
    brands: nextBrands,
    products: nextProducts,
    orders: loadOrders(),
  } satisfies StoreSnapshot;
}

export function createProduct(product: Product) {
  return updateCmsCollection('products', [...loadSnapshot().products, product]);
}

export function updateProduct(productSku: string, nextProduct: Product) {
  return updateCmsCollection(
    'products',
    loadSnapshot().products.map((product) => (product.sku === productSku ? nextProduct : product)),
  );
}

export function deleteProduct(productSku: string) {
  return updateCmsCollection(
    'products',
    loadSnapshot().products.filter((product) => product.sku !== productSku),
  );
}

export function createBrand(brand: Brand) {
  return updateCmsCollection('brands', [...loadSnapshot().brands, brand]);
}

export function updateBrand(brandName: string, nextBrand: Brand) {
  return updateCmsCollection(
    'brands',
    loadSnapshot().brands.map((brand) => (brand.name === brandName ? nextBrand : brand)),
  );
}

export function deleteBrand(brandName: string) {
  return updateCmsCollection(
    'brands',
    loadSnapshot().brands.filter((brand) => brand.name !== brandName),
  );
}

export function resetStoreSnapshot() {
  saveStoreSnapshot(defaultSnapshot);
  writeJson(orderStorageKey, []);
  productCache = null;
  orderCache = [];
}

export function exportStoreSnapshot(): string {
  return JSON.stringify(getStoreSnapshot(), null, 2);
}

export function importStoreSnapshot(snapshot: CmsState) {
  saveStoreSnapshot(snapshot);
}

export async function submitOrderRequest(request: OrderInput): Promise<{ reference: string }> {
  const idempotencyKey = request.idempotencyKey
    || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const response = await fetch('/api/orders/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      fullName: request.fullName,
      email: request.email,
      items: request.items.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        priceEur: item.priceEur ?? 0,
      })),
      billingAddress: request.billingAddress,
      paymentMethod: request.paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'card',
      paymentProvider: request.payment?.provider ?? (request.paymentMethod === 'card' ? 'borica' : 'manual'),
      idempotencyKey,
      payment: request.payment
        ? {
          gatewayOrder: request.payment.gatewayOrder,
          rrn: request.payment.rrn,
          intRef: request.payment.intRef,
          amountEur: request.payment.amountEur,
          currency: request.payment.currency,
        }
        : undefined,
      notes: [
        request.notes ?? '',
        request.payment?.gatewayOrder ? `Gateway order: ${request.payment.gatewayOrder}` : '',
        request.payment?.rrn ? `RRN: ${request.payment.rrn}` : '',
        request.payment?.intRef ? `INT_REF: ${request.payment.intRef}` : '',
      ].filter(Boolean).join('\n'),
    }),
  });

  const payload = await parseResponse<{ id: string }>(response);
  await fetchOrders({ includeAll: getSessionUser()?.role === 'ADMIN' }).catch(() => undefined);
  return { reference: payload.id };
}

export async function updateOrderStatus(reference: string, status: OrderRecord['status']) {
  const response = await fetch('/api/orders/status', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ orderId: reference, status }),
  });

  await parseResponse<{ ok: boolean }>(response);
  return loadStoreSnapshot();
}

export async function createProductApi(product: Product) {
  const priceError = validateProductPricesAgainstCost(product);
  if (priceError) {
    throw new Error(priceError);
  }

  const response = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      title: product.name,
      description: product.details,
      brand: product.brand,
      sport: product.categorySlug,
      subCategory: mapTypeToSubCategory(product.type),
      costPrice: product.costEur ?? 0,
      sellingPrice: product.priceEur ?? 0,
      discountPrice: product.salePriceEur ?? null,
      stock: product.stock ?? 0,
      imageArray: [product.imageUrl],
      attributes: buildProductAttributesPayload(product),
      sizes: [],
      weightGrams: product.weightGrams ?? null,
      balance: product.balance ?? null,
      rating: 4.5,
    }),
  });

  await parseResponse<any>(response);
  productCache = null;
  return loadStoreSnapshot();
}

function buildProductAttributesPayload(product: Product) {
  const attributes: Record<string, string> = {};

  if (product.attributes) {
    for (const [key, value] of Object.entries(product.attributes)) {
      if (typeof value === 'string' && value.trim() && key !== 'tags') {
        attributes[key] = value;
      }
    }
  }

  if (product.color) {
    attributes.color = product.color;
  }

  if (product.headShape) {
    attributes.headShape = product.headShape;
  }

  if (product.badges.length > 0) {
    attributes.tags = product.badges.join(',');
  }

  return attributes;
}

export async function updateProductApi(productSku: string, nextProduct: Product) {
  const priceError = validateProductPricesAgainstCost(nextProduct);
  if (priceError) {
    throw new Error(priceError);
  }

  const apiId = resolveProductApiId(nextProduct, productSku);
  const response = await fetch(`/api/products?id=${encodeURIComponent(apiId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      title: nextProduct.name,
      description: nextProduct.details,
      brand: nextProduct.brand,
      sport: nextProduct.categorySlug,
      subCategory: mapTypeToSubCategory(nextProduct.type),
      costPrice: nextProduct.costEur ?? 0,
      // priceEur is always the list/selling price; salePriceEur is the optional promo.
      sellingPrice: nextProduct.priceEur ?? 0,
      discountPrice: nextProduct.salePriceEur ?? null,
      stock: nextProduct.stock ?? 0,
      imageArray: [nextProduct.imageUrl],
      attributes: buildProductAttributesPayload(nextProduct),
      weightGrams: nextProduct.weightGrams ?? null,
      balance: nextProduct.balance ?? null,
      rating: 4.5,
    }),
  });

  await parseResponse<any>(response);
  productCache = null;
  return loadStoreSnapshot();
}

export async function deleteProductApi(productSku: string) {
  const product = (productCache ?? loadSnapshot().products).find((item) => item.sku === productSku)
    ?? (productCache ?? loadSnapshot().products).find((item) => (
      item.attributes?.publicSku === productSku
      || item.attributes?.internalDbId === productSku
      || item.attributes?.sourceSku === productSku
    ));

  if (product) {
    suppressProductLocally(product);
  } else {
    suppressProductLocally({
      sku: productSku,
      name: productSku,
      brand: '',
      categorySlug: 'squash',
      type: 'Racket',
      details: '',
      badges: [],
      imageUrl: '',
    });
  }

  const apiId = product ? resolveProductApiId(product, productSku) : productSku;
  const identityKeys = product
    ? collectProductIdentityKeys(product)
    : [`id:${normalizeSkuToken(productSku)}`];

  const response = await fetch(`/api/products?id=${encodeURIComponent(apiId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ identityKeys }),
  });

  // Product may only exist in import/defaults (no DB row). Still treat as deleted after suppress.
  if (!response.ok && response.status !== 404) {
    await parseResponse<{ ok: boolean }>(response);
  }

  try {
    await fetch('/api/products/suppressions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ keys: identityKeys }),
    });
  } catch {
    // Local suppressions already recorded.
  }

  productCache = null;
  return loadStoreSnapshot();
}

export async function seedStarterCatalog() {
  const seeded = await requestCatalogSeed();
  if (!seeded) {
    throw new Error('Catalog seed failed.');
  }

  return loadStoreSnapshot();
}

export async function syncCatalogProductsApi(payload: CatalogSyncPayload) {
  const response = await fetch('/api/system/catalog-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ products: payload.products }),
  });

  return parseResponse<CatalogSyncResult>(response);
}

