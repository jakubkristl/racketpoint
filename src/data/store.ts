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
};

export type CmsCollection = 'categories' | 'brands' | 'products';

const storageKey = 'racketpoint-cms-state-v5';
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

function normalizeLookupValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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
  return products.map(normalizeProductImage);
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

function hydrateProductImages(products: Product[], references: Product[]) {
  const enriched = enrichProductsWithReferenceImages(products, references);
  return normalizeProductList(enriched);
}

function normalizeCmsState(snapshot: CmsState): CmsState {
  return {
    categories: snapshot.categories,
    brands: snapshot.brands,
    products: normalizeProductList(snapshot.products),
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
  const raw = readJson<CmsState>(storageKey) ?? readJson<CmsState>(legacyStorageKey) ?? defaultSnapshot;
  return normalizeCmsState(raw);
}

function loadOrders(): OrderRecord[] {
  const parsed = readJson<OrderRecord[]>(orderStorageKey) ?? readJson<OrderRecord[]>(legacyOrderStorageKey) ?? [];
  return parsed.map((order) => ({
    ...order,
    status: order.status ?? 'Pending',
  }));
}

function mapSubCategoryToType(value: string | undefined): Product['type'] {
  const normalized = (value ?? '').trim().toLowerCase();

  if (normalized.includes('ball') || normalized.includes('shuttle')) {
    return 'Balls';
  }

  if (normalized.includes('apparel') || normalized.includes('wear')) {
    return 'Wear';
  }

  if (normalized.includes('shoe')) {
    return 'Shoe';
  }

  if (normalized.includes('bag')) {
    return 'Bag';
  }

  if (normalized.includes('string')) {
    return 'String';
  }

  if (normalized.includes('grip') || normalized.includes('overgrip')) {
    return 'Grip';
  }

  if (normalized.includes('accessor')) {
    return 'Accessory';
  }

  return 'Racket';
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

function mapApiProductToCatalogProduct(item: any): Product {
  const priceEur = Number(item.sellingPrice ?? item.selling_price ?? 0);
  const discountRaw = item.discountPrice ?? item.discount_price;
  const discountPrice = discountRaw == null ? null : Number(discountRaw);
  const effectivePrice = discountPrice != null ? discountPrice : priceEur;
  const imageArray = Array.isArray(item.imageArray)
    ? item.imageArray
    : Array.isArray(item.images)
      ? item.images
      : [];
  const images = imageArray.filter((value: unknown): value is string => typeof value === 'string');
  const bestImageUrl = pickBestImageUrlFromCandidates(images);

  return {
    sku: String(item.id ?? item.sku ?? ''),
    name: String(item.title ?? 'Unnamed product'),
    categorySlug: String(item.sport ?? 'squash') as CategorySlug,
    type: mapSubCategoryToType(item.subCategory),
    brand: String(item.brand ?? 'Racketpoint'),
    priceEur: Number.isFinite(effectivePrice) ? effectivePrice : 0,
    salePriceEur: discountPrice != null && Number.isFinite(discountPrice) ? discountPrice : undefined,
    originalPriceEur: discountPrice != null && Number.isFinite(priceEur) ? priceEur : undefined,
    price: `EUR ${Number.isFinite(effectivePrice) ? effectivePrice.toFixed(2) : '0.00'}`,
    costEur: Number(item.costPrice ?? item.cost_price ?? 0),
    stock: Number(item.stock ?? 0),
    details: String(item.description ?? ''),
    badges: [],
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
  const response = await fetch('/api/products');
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

export async function fetchProducts() {
  const [mapped, referenceCatalog] = await Promise.all([
    fetchProductsFromApi().catch(() => [] as Product[]),
    fetchImportedSquashpointProducts().catch(() => [] as Product[]),
  ]);

  if (mapped.length === 0) {
    const seeded = await requestCatalogSeed().catch(() => false);

    if (seeded) {
      const retry = await fetchProductsFromApi().catch(() => [] as Product[]);
      if (retry.length > 0) {
        const normalized = hydrateProductImages(retry, referenceCatalog);
        productCache = normalized;
        return normalized;
      }
    }

    const imported = referenceCatalog;
    if (imported.length > 0) {
      const normalized = hydrateProductImages(imported, imported);
      productCache = normalized;
      return normalized;
    }

    const localStarterCatalog = hydrateProductImages(loadSnapshot().products, referenceCatalog);
    productCache = localStarterCatalog;
    return localStarterCatalog;
  }

  const normalized = hydrateProductImages(mapped, referenceCatalog);
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
    categories: cms.categories,
    brands: cms.brands,
    products,
    orders,
  } satisfies StoreSnapshot;
}

export function getStoreSnapshot(): StoreSnapshot {
  const snapshot = loadSnapshot();

  return {
    categories: snapshot.categories,
    brands: snapshot.brands,
    products: normalizeProductList(productCache ?? snapshot.products),
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
      discountPrice: null,
      stock: product.stock ?? 0,
      imageArray: [product.imageUrl],
      attributes: {
        color: product.color,
        headShape: product.headShape,
      },
      sizes: [],
      weightGrams: product.weightGrams ?? null,
      balance: product.balance ?? null,
      rating: 4.5,
    }),
  });

  await parseResponse<any>(response);
  return loadStoreSnapshot();
}

export async function updateProductApi(productSku: string, nextProduct: Product) {
  const response = await fetch(`/api/products?id=${encodeURIComponent(productSku)}`, {
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
      sellingPrice: nextProduct.priceEur ?? 0,
      stock: nextProduct.stock ?? 0,
      imageArray: [nextProduct.imageUrl],
      weightGrams: nextProduct.weightGrams ?? null,
      balance: nextProduct.balance ?? null,
      rating: 4.5,
    }),
  });

  await parseResponse<any>(response);
  return loadStoreSnapshot();
}

export async function deleteProductApi(productSku: string) {
  const response = await fetch(`/api/products?id=${encodeURIComponent(productSku)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  await parseResponse<{ ok: boolean }>(response);
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

