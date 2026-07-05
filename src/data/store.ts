import {
  brands as defaultBrands,
  categories as defaultCategories,
  products as defaultProducts,
  type Brand,
  type Category,
  type Product,
  type CategorySlug,
} from './catalog';

export type OrderInput = {
  fullName: string;
  email: string;
  items: Array<{
    sku: string;
    quantity: number;
  }>;
  notes?: string;
};

export type OrderRecord = OrderInput & {
  reference: string;
  createdAt: string;
};

export type StoreSnapshot = {
  categories: Category[];
  brands: Brand[];
  products: Product[];
  orders: OrderRecord[];
};

export type CmsCollection = 'categories' | 'brands' | 'products';

const storageKey = 'racketpoint-cms-state-v4';
const orderStorageKey = 'racketpoint-order-inbox-v4';
const legacyStorageKey = 'racketshop-cms-state-v3';
const legacyOrderStorageKey = 'racketshop-order-inbox-v3';

type CmsState = Pick<StoreSnapshot, 'categories' | 'brands' | 'products'>;

const defaultSnapshot: CmsState = {
  categories: defaultCategories,
  brands: defaultBrands,
  products: defaultProducts,
};

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
  return readJson<CmsState>(storageKey) ?? readJson<CmsState>(legacyStorageKey) ?? defaultSnapshot;
}

function loadOrders(): OrderRecord[] {
  return readJson<OrderRecord[]>(orderStorageKey) ?? readJson<OrderRecord[]>(legacyOrderStorageKey) ?? [];
}

export function getStoreSnapshot(): StoreSnapshot {
  const snapshot = loadSnapshot();

  return {
    ...snapshot,
    orders: loadOrders(),
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
}

export function exportStoreSnapshot(): string {
  return JSON.stringify(getStoreSnapshot(), null, 2);
}

export function importStoreSnapshot(snapshot: CmsState) {
  saveStoreSnapshot(snapshot);
}

export function submitOrderRequest(request: OrderInput): Promise<{ reference: string }> {
  const reference = `RS-${Date.now().toString(36).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const inboxEntry: OrderRecord = {
    ...request,
    reference,
    createdAt,
  };
  const currentOrders = loadOrders();

  if (import.meta.env.DEV) {
    console.info('Order request queued for backend/CMS integration', { reference, request });
  }

  writeJson(orderStorageKey, [inboxEntry, ...currentOrders]);

  return Promise.resolve({ reference });
}

