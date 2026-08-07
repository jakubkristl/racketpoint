import { useEffect, useMemo, useState } from 'react';
import {
  createProductApi,
  deleteProductApi,
  exportStoreSnapshot,
  fetchOrders,
  importStoreSnapshot,
  loadStoreSnapshot,
  resetStoreSnapshot,
  saveStoreSnapshot,
  seedStarterCatalog,
  syncCatalogProductsApi,
  type OrderRecord,
  type StoreSnapshot,
  updateOrderStatus,
  updateProductApi,
  createBrand,
  createCategory,
  deleteBrand,
  deleteCategory,
} from '../data/store';
import { createProductArtwork } from '../data/catalog';
import type { Brand, Category, Product, CategorySlug, ProductType } from '../data/catalog';
import { getAdminPasswordHint, signInAdmin, signOutAdmin } from '../data/adminAuth';
import type { ChangeEvent, FormEvent } from 'react';
import BrandLogo from '../components/BrandLogo';
import { unsquashableProducts } from '../data/productsUnsquashable';
import { getAuthHeaders, getSessionUser } from '../data/accountStore';

type AdminPageProps = {
  snapshot: StoreSnapshot;
  onSnapshotChange: (snapshot: StoreSnapshot) => void;
  isAuthenticated: boolean;
  onAuthChange: (nextValue: boolean) => void;
};

type AdminStats = {
  users: number;
  products: number;
  orders: number;
  revenueEur: number;
  orderStatuses: Array<{ status: string; count: number }>;
};

type StockMovementRecord = {
  id: string;
  sku: string;
  deltaQuantity: number;
  reason: string;
  orderId?: string;
  actor?: string;
  createdAt: string;
  productTitle?: string;
};

const productTypes: ProductType[] = ['Racket', 'Balls', 'Wear', 'Bag', 'Accessory', 'String', 'Grip', 'Shoe'];
const quickAddProductTypes: ProductType[] = ['Racket', 'Shoe', 'Grip', 'Wear', 'Bag', 'Balls', 'Accessory', 'String'];
const mainSportOptions = [
  { slug: 'squash', label: 'Squash' },
  { slug: 'tennis', label: 'Tennis' },
  { slug: 'table-tennis', label: 'Table Tennis' },
  { slug: 'badminton', label: 'Badminton' },
  { slug: 'padel', label: 'Padel' },
] as const;
const newCategoryTemplate: Category = {
  slug: 'rackets',
  name: 'Нова секция',
  description: 'Добави описание на секцията.',
  heroTitle: 'Заглавие на секцията',
  heroCopy: 'Текст за hero секцията.',
  accent: 'Нова секция',
  focus: ['Ракети', 'Обувки'],
};
const newProductTemplate: Product = {
  sku: 'SKU-NEW',
  name: 'Нов продукт',
  categorySlug: 'squash',
  type: 'Racket',
  brand: 'Нова марка',
  price: '€0.00',
  priceEur: 0,
  costEur: 0,
  stock: 0,
  details: 'Добави детайли за продукта.',
  badges: ['Нов'],
  imageUrl: createProductArtwork('Нов продукт', 'Продуктова карта', '#6ea8fe'),
};
const newBrandTemplate: Brand = {
  name: 'Нова марка',
  categorySlugs: ['squash'],
  note: 'Добави бележки за марката.',
};

function parsePriceValue(price?: string) {
  if (!price) {
    return 0;
  }

  const normalized = price.replace(/[^\d,.-]/g, '').replace(',', '.');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatEur(value: number) {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

function getPaymentStatusLabel(order: OrderRecord) {
  if (order.payment?.status === 'approved') {
    return 'BORICA approved';
  }

  if (order.payment?.status === 'cash_on_delivery') {
    return 'Cash on delivery';
  }

  if (order.payment?.status === 'failed') {
    return 'Payment failed';
  }

  return order.paymentMethod === 'card' ? 'Card order' : 'Order request';
}

function toTitleCaseFromSlug(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ensureCategoryShape(category: Partial<Category>): Category {
  const slug = String(category.slug ?? '').trim().toLowerCase();
  const safeSlug = slug || `category-${Date.now().toString(36)}`;
  const safeName = String(category.name ?? '').trim() || toTitleCaseFromSlug(safeSlug);

  return {
    slug: safeSlug,
    name: safeName,
    description: String(category.description ?? '').trim() || `Категория ${safeName}.`,
    heroTitle: String(category.heroTitle ?? '').trim() || safeName,
    heroCopy: String(category.heroCopy ?? '').trim() || `Колекция ${safeName} в Racketpoint.`,
    accent: String(category.accent ?? '').trim() || safeName,
    focus: Array.isArray(category.focus) && category.focus.length > 0
      ? category.focus.map((item) => String(item).trim()).filter(Boolean)
      : ['Продукти'],
  };
}

function mergeCategories(current: Category[], incoming: Category[] | undefined, products: Product[]) {
  const categoryMap = new Map<string, Category>();

  for (const category of current) {
    categoryMap.set(category.slug, ensureCategoryShape(category));
  }

  for (const category of incoming ?? []) {
    const normalized = ensureCategoryShape(category);
    categoryMap.set(normalized.slug, normalized);
  }

  for (const product of products) {
    const slug = String(product.categorySlug ?? '').trim().toLowerCase();
    if (!slug || categoryMap.has(slug)) {
      continue;
    }

    categoryMap.set(slug, ensureCategoryShape({ slug }));
  }

  return [...categoryMap.values()];
}

function mergeBrands(current: Brand[], incoming: Brand[] | undefined, products: Product[]) {
  const brandMap = new Map<string, Brand>();

  for (const brand of current) {
    const key = brand.name.toLowerCase();
    brandMap.set(key, {
      name: brand.name,
      categorySlugs: [...new Set(brand.categorySlugs.map((slug) => String(slug).trim()).filter(Boolean))],
      note: brand.note,
    });
  }

  for (const brand of incoming ?? []) {
    const name = String(brand.name ?? '').trim();
    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    const existing = brandMap.get(key);
    const nextCategorySlugs = [...new Set((brand.categorySlugs ?? []).map((slug) => String(slug).trim()).filter(Boolean))];

    if (!existing) {
      brandMap.set(key, {
        name,
        categorySlugs: nextCategorySlugs,
        note: String(brand.note ?? '').trim() || 'Добавена чрез JSON catalog import.',
      });
      continue;
    }

    const mergedSlugs = [...new Set([...existing.categorySlugs, ...nextCategorySlugs])];
    brandMap.set(key, {
      ...existing,
      categorySlugs: mergedSlugs,
      note: existing.note || String(brand.note ?? '').trim() || 'Добавена чрез JSON catalog import.',
    });
  }

  for (const product of products) {
    const name = String(product.brand ?? '').trim();
    const categorySlug = String(product.categorySlug ?? '').trim();
    if (!name || !categorySlug) {
      continue;
    }

    const key = name.toLowerCase();
    const existing = brandMap.get(key);
    if (!existing) {
      brandMap.set(key, {
        name,
        categorySlugs: [categorySlug],
        note: 'Auto-created from uploaded catalog.',
      });
      continue;
    }

    if (!existing.categorySlugs.includes(categorySlug)) {
      existing.categorySlugs.push(categorySlug);
    }
  }

  return [...brandMap.values()];
}

function AdminPage({ snapshot, onSnapshotChange, isAuthenticated, onAuthChange }: AdminPageProps) {
  const [password, setPassword] = useState('');
  const [selectedProductSku, setSelectedProductSku] = useState(snapshot.products[0]?.sku ?? '');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(snapshot.categories[0]?.slug ?? '');
  const [selectedBrandName, setSelectedBrandName] = useState(snapshot.brands[0]?.name ?? '');
  const [selectedOrderReference, setSelectedOrderReference] = useState(snapshot.orders[0]?.reference ?? '');
  const [newCategory, setNewCategory] = useState<Category>(newCategoryTemplate);
  const [newProduct, setNewProduct] = useState<Product>(newProductTemplate);
  const [newBrand, setNewBrand] = useState<Brand>(newBrandTemplate);
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickBrand, setQuickBrand] = useState('Karakal');
  const [quickPriceEur, setQuickPriceEur] = useState('79.00');
  const [quickCostEur, setQuickCostEur] = useState('44.00');
  const [quickSportSlug, setQuickSportSlug] = useState<CategorySlug>('squash');
  const [quickProductType, setQuickProductType] = useState<ProductType>('Racket');
  const [quickBadges, setQuickBadges] = useState<string[]>(['NEW']);
  const [quickColor, setQuickColor] = useState('');
  const [quickHeadShape, setQuickHeadShape] = useState<'Teardrop' | 'Round' | 'Hybrid'>('Teardrop');
  const [quickBalance, setQuickBalance] = useState<'Head-heavy' | 'Balanced' | 'Head-light'>('Balanced');
  const [quickWeightGrams, setQuickWeightGrams] = useState('125');
  const [quickStock, setQuickStock] = useState('10');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>([]);
  const [isCatalogSyncing, setIsCatalogSyncing] = useState(false);

  const productTypesWithShoe: ProductType[] = [...productTypes];

  const selectedProduct = snapshot.products.find((product) => product.sku === selectedProductSku) ?? snapshot.products[0];
  const selectedCategory = snapshot.categories.find((category) => category.slug === selectedCategorySlug) ?? snapshot.categories[0];
  const selectedBrand = snapshot.brands.find((brand) => brand.name === selectedBrandName) ?? snapshot.brands[0];
  const selectedOrder = snapshot.orders.find((order) => order.reference === selectedOrderReference) ?? snapshot.orders[0];

  const visibleOrders = useMemo(() => snapshot.orders.slice(0, 20), [snapshot.orders]);
  const salesStats = useMemo(() => {
    const productBySku = new Map(snapshot.products.map((product) => [product.sku, product] as const));
    const soldBySku = new Map<string, number>();
    const monthlyProfitByMonth = new Map<string, number>();
    let itemsSold = 0;
    let revenue = 0;
    let cost = 0;
    let soldWithoutCost = 0;

    for (const order of snapshot.orders) {
      const monthKey = order.createdAt.slice(0, 7);
      let monthProfit = monthlyProfitByMonth.get(monthKey) ?? 0;

      for (const line of order.items) {
        const quantity = line.quantity;
        const product = productBySku.get(line.sku);
        const unitPrice = line.priceEur ?? product?.priceEur ?? parsePriceValue(product?.price);
        const unitCost = product?.costEur;

        itemsSold += quantity;
        revenue += unitPrice * quantity;
        soldBySku.set(line.sku, (soldBySku.get(line.sku) ?? 0) + quantity);

        if (typeof unitCost === 'number') {
          cost += unitCost * quantity;
          monthProfit += (unitPrice - unitCost) * quantity;
        } else {
          soldWithoutCost += quantity;
          monthProfit += unitPrice * quantity;
        }
      }

      monthlyProfitByMonth.set(monthKey, monthProfit);
    }

    const bestsellers = [...soldBySku.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sku, quantity]) => ({
        sku,
        quantity,
        name: productBySku.get(sku)?.name ?? sku,
      }));

    const monthlyProfit = [...monthlyProfitByMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, profit]) => ({ month, profit }));

    return {
      itemsSold,
      revenue,
      cost,
      profit: revenue - cost,
      soldWithoutCost,
      bestsellers,
      monthlyProfit,
    };
  }, [snapshot.orders, snapshot.products]);
  const paymentStats = useMemo(() => {
    const approvedCardOrders = snapshot.orders.filter((order) => order.payment?.provider === 'borica' && order.payment?.status === 'approved');
    const cashOnDeliveryOrders = snapshot.orders.filter((order) => order.payment?.status === 'cash_on_delivery');
    const approvedVolume = approvedCardOrders.reduce((sum, order) => sum + (order.payment?.amountEur ?? 0), 0);

    return {
      approvedCardOrders: approvedCardOrders.length,
      cashOnDeliveryOrders: cashOnDeliveryOrders.length,
      approvedVolume,
    };
  }, [snapshot.orders]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    loadStoreSnapshot()
      .then((nextSnapshot) => onSnapshotChange(nextSnapshot))
      .catch(() => undefined);

    fetchOrders({ includeAll: getSessionUser()?.role === 'ADMIN' })
      .then((orders) => {
        onSnapshotChange({
          ...snapshot,
          orders,
        });
      })
      .catch(() => undefined);

    fetch('/api/admin/stats', { headers: getAuthHeaders() })
      .then((response) => response.json())
      .then((payload) => setAdminStats(payload as AdminStats))
      .catch(() => setAdminStats(null));

    fetch('/api/admin/stock-movements', { headers: getAuthHeaders() })
      .then((response) => response.json())
      .then((payload) => setStockMovements(Array.isArray(payload) ? payload as StockMovementRecord[] : []))
      .catch(() => setStockMovements([]));
  }, [isAuthenticated]);

  function persistAndSelect(nextSnapshot: StoreSnapshot, statusMessage: string) {
    onSnapshotChange(nextSnapshot);
    saveStoreSnapshot(nextSnapshot);
    setMessage(statusMessage);
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const authed = signInAdmin(password);
    onAuthChange(authed);
    setMessage(authed ? 'Админ достъпът е разрешен.' : 'Невалидна админ парола.');
    if (authed) {
      setPassword('');
    }
  }

  function handleLogout() {
    signOutAdmin();
    onAuthChange(false);
    setMessage('Админът е отписан.');
  }

  function updateProductField(field: keyof Product, value: string) {
    if (!selectedProduct) {
      return;
    }

    const updatedProducts = snapshot.products.map((product) =>
      product.sku === selectedProduct.sku
        ? {
            ...product,
            [field]: field === 'badges'
              ? value.split(',').map((item) => item.trim()).filter(Boolean)
              : field === 'priceEur' || field === 'costEur' || field === 'weightGrams'
                ? (Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : undefined)
                : field === 'stock'
                  ? (Number.isFinite(Number.parseInt(value, 10)) ? Number.parseInt(value, 10) : undefined)
                  : value || undefined,
          }
        : product,
    );

    persistAndSelect({ ...snapshot, products: updatedProducts }, 'Продуктът е записан.');
  }

  function updateCategoryField(field: keyof Category, value: string) {
    if (!selectedCategory) {
      return;
    }

    const updatedCategories = snapshot.categories.map((category) =>
      category.slug === selectedCategory.slug
        ? {
            ...category,
            [field]: field === 'focus' ? value.split(',').map((item) => item.trim()).filter(Boolean) : value,
          }
        : category,
    );

    persistAndSelect({ ...snapshot, categories: updatedCategories }, 'Секцията е записана.');
  }

  function updateBrandField(field: keyof Brand, value: string) {
    if (!selectedBrand) {
      return;
    }

    const updatedBrands = snapshot.brands.map((brand) =>
      brand.name === selectedBrand.name
        ? {
            ...brand,
            [field]: field === 'categorySlugs' ? value.split(',').map((item) => item.trim()).filter(Boolean) as CategorySlug[] : value,
          }
        : brand,
    );

    persistAndSelect({ ...snapshot, brands: updatedBrands }, 'Марката е записана.');
  }

  async function handleCreateProduct() {
    const draft = {
      ...newProduct,
      sku: `${newProduct.sku}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    };

    try {
      const nextSnapshot = await createProductApi(draft);
      onSnapshotChange(nextSnapshot);
      setMessage('Продуктът е създаден.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Неуспешно създаване на продукт.');
    }
  }

  function toggleQuickBadge(badge: string) {
    setQuickBadges((prevBadges) => prevBadges.includes(badge)
      ? prevBadges.filter((item) => item !== badge)
      : [...prevBadges, badge]);
  }

  async function handleQuickCreateProduct() {
    if (!quickName.trim()) {
      setMessage('Въведи име на продукта за quick add.');
      return;
    }

    const normalizedSku = `${quickSportSlug.slice(0, 2).toUpperCase()}-${quickProductType.slice(0, 2).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const numericPrice = Number.parseFloat(quickPriceEur);
    const safePrice = Number.isFinite(numericPrice) ? numericPrice : 0;
    const numericCost = Number.parseFloat(quickCostEur);
    const safeCost = Number.isFinite(numericCost) ? numericCost : 0;
    const numericWeight = Number.parseFloat(quickWeightGrams);
    const safeWeight = Number.isFinite(numericWeight) ? numericWeight : undefined;
    const numericStock = Number.parseInt(quickStock, 10);
    const safeStock = Number.isFinite(numericStock) ? numericStock : undefined;

    const draft: Product = {
      sku: normalizedSku,
      name: quickName.trim(),
      categorySlug: quickSportSlug,
      type: quickProductType,
      brand: quickBrand.trim() || 'Karakal',
      price: `€${safePrice.toFixed(2)}`,
      priceEur: safePrice,
      costEur: safeCost,
      color: quickColor.trim() || undefined,
      headShape: quickProductType === 'Racket' ? quickHeadShape : undefined,
      balance: quickProductType === 'Racket' ? quickBalance : undefined,
      weightGrams: quickProductType === 'Racket' ? safeWeight : undefined,
      stock: safeStock,
      details: `${quickProductType} for ${quickSportSlug} category.`,
      badges: quickBadges.length > 0 ? quickBadges : ['NEW'],
      imageUrl: createProductArtwork(quickBrand.trim() || 'Racketpoint', quickName.trim(), '#36cfc9'),
    };

    try {
      const nextSnapshot = await createProductApi(draft);
      onSnapshotChange(nextSnapshot);
      setMessage(`Добавен е продукт: ${quickName.trim()}.`);
      setQuickName('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Quick add не успя.');
    }
  }

  function handleImportUnsquashableCatalog() {
    const existingSkus = new Set(snapshot.products.map((product) => product.sku));
    const mapped = unsquashableProducts
      .filter((item) => !existingSkus.has(item.sku))
      .map((item) => ({
        sku: item.sku,
        name: item.name,
        nameBg: item.nameBg,
        categorySlug: 'squash' as CategorySlug,
        type: (item.type === 'Shoe' ? 'Shoe' : item.type) as ProductType,
        brand: 'Unsquashable',
        price: `€${item.priceEur.toFixed(2)}`,
        priceEur: item.priceEur,
        costEur: Number((item.priceEur * 0.55).toFixed(2)),
        details: item.details,
        detailsBg: item.detailsBg,
        description: item.description,
        descriptionBg: item.descriptionBg,
        badges: item.badges,
        imageUrl: item.imageUrl.includes('via.placeholder.com')
          ? createProductArtwork(item.name, 'Unsquashable', '#ff9f1c')
          : item.imageUrl,
        stock: item.stock,
      } satisfies Product));

    if (mapped.length === 0) {
      setMessage('Unsquashable каталогът вече е добавен.');
      return;
    }

    const nextSnapshot = {
      ...snapshot,
      products: [...snapshot.products, ...mapped],
    };

    persistAndSelect(nextSnapshot, `Импортирани са ${mapped.length} Unsquashable продукта от Squashpoint dataset.`);
  }

  function handleCreateCategory() {
    const nextSnapshot = createCategory({
      ...newCategory,
      slug: `${newCategory.slug}-${Date.now().toString(36).slice(-4).toLowerCase()}`,
    });
    persistAndSelect(nextSnapshot, 'Секцията е създадена.');
  }

  function handleCreateBrand() {
    const nextSnapshot = createBrand({
      ...newBrand,
      name: `${newBrand.name} ${Date.now().toString(36).slice(-3).toUpperCase()}`,
    });
    persistAndSelect(nextSnapshot, 'Марката е създадена.');
  }

  async function handleDeleteProduct() {
    if (!selectedProduct) {
      return;
    }

    try {
      const nextSnapshot = await deleteProductApi(selectedProduct.sku);
      onSnapshotChange(nextSnapshot);
      setMessage('Продуктът е изтрит.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Изтриването не успя.');
    }
  }

  function handleDeleteCategory() {
    if (!selectedCategory) {
      return;
    }

    const nextSnapshot = deleteCategory(selectedCategory.slug);
    persistAndSelect(nextSnapshot, 'Секцията е изтрита.');
  }

  function handleDeleteBrand() {
    if (!selectedBrand) {
      return;
    }

    const nextSnapshot = deleteBrand(selectedBrand.name);
    persistAndSelect(nextSnapshot, 'Марката е изтрита.');
  }

  async function handleUpdateSelectedOrderStatus(nextStatus: OrderRecord['status']) {
    if (!selectedOrder) {
      return;
    }

    try {
      const nextSnapshot = await updateOrderStatus(selectedOrder.reference, nextStatus);
      onSnapshotChange(nextSnapshot);
      setMessage(`Статусът е обновен: ${nextStatus}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Обновяването на статуса не успя.');
    }
  }

  async function handleSaveSelectedProduct() {
    if (!selectedProduct) {
      return;
    }

    try {
      const nextSnapshot = await updateProductApi(selectedProduct.sku, selectedProduct);
      onSnapshotChange(nextSnapshot);
      setMessage('Продуктът е обновен.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Записът не успя.');
    }
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(importText) as StoreSnapshot;

      if (!parsed.categories || !parsed.brands || !parsed.products) {
        throw new Error('Invalid export payload.');
      }

      const nextSnapshot: StoreSnapshot = {
        categories: parsed.categories,
        brands: parsed.brands,
        products: parsed.products,
        orders: parsed.orders ?? snapshot.orders,
      };

      importStoreSnapshot(nextSnapshot);
      onSnapshotChange(nextSnapshot);
      setMessage('Съдържанието е импортирано успешно.');
    } catch {
      setMessage('Импортът не успя. Постави JSON експорт от тази CMS.');
    }
  }

  async function handleCatalogFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    setIsCatalogSyncing(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<StoreSnapshot>;
      if (!Array.isArray(parsed.products) || parsed.products.length === 0) {
        throw new Error('Каталог файлът трябва да съдържа масив products.');
      }

      const syncResult = await syncCatalogProductsApi({ products: parsed.products });
      const mergedCategories = mergeCategories(snapshot.categories, parsed.categories, parsed.products);
      const mergedBrands = mergeBrands(snapshot.brands, parsed.brands, parsed.products);
      const refreshed = await loadStoreSnapshot();

      const nextSnapshot: StoreSnapshot = {
        categories: mergedCategories,
        brands: mergedBrands,
        products: refreshed.products,
        orders: refreshed.orders,
      };

      saveStoreSnapshot({
        categories: mergedCategories,
        brands: mergedBrands,
        products: refreshed.products,
      });

      onSnapshotChange(nextSnapshot);
      setMessage(`Каталогът е синхронизиран. Нови: ${syncResult.inserted}, обновени: ${syncResult.updated}, общо: ${syncResult.totalProducts}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Каталог синхронизацията не успя.');
    } finally {
      setIsCatalogSyncing(false);
    }
  }

  async function handleSeedStarterCatalog() {
    try {
      const nextSnapshot = await seedStarterCatalog();
      onSnapshotChange(nextSnapshot);
      setMessage(`Starter catalog seeded. Products in view: ${nextSnapshot.products.length}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Catalog seeding failed.');
    }
  }

  function handleReset() {
    resetStoreSnapshot();
    const nextSnapshot = {
      ...snapshot,
      ...JSON.parse(exportStoreSnapshot()),
    } as StoreSnapshot;
    onSnapshotChange(nextSnapshot);
    setMessage('Каталогът е върнат към началните данни.');
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell admin-shell">
        <header className="hero admin-hero">
          <BrandLogo compact subtitle="CMS" />
          <h1>Вход за админ</h1>
          <p className="intro">{getAdminPasswordHint()}</p>
          <form className="admin-login" onSubmit={handleLogin}>
            <label>
              Парола
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="button button-primary" type="submit">
              Вход
            </button>
          </form>
          {message ? <p className="form-status">{message}</p> : null}
        </header>
      </div>
    );
  }

  return (
    <div className="page-shell admin-shell">
      <header className="hero admin-hero">
        <div className="topbar">
          <div>
            <BrandLogo compact subtitle="CMS" />
            <h1>Racketpoint съдържание.</h1>
          </div>
          <a className="nav-cta" href="/">
            Обратно към магазина
          </a>
        </div>

        <div className="admin-actions">
          <button className="button button-primary" type="button" onClick={() => setImportText(exportStoreSnapshot())}>
            Експорт на JSON
          </button>
          <button className="button button-primary" type="button" onClick={handleSeedStarterCatalog}>
            Seed starter catalog
          </button>
          <button className="button button-secondary" type="button" onClick={handleReset}>
            Нулирай каталога
          </button>
          <button className="button button-secondary" type="button" onClick={handleLogout}>
            Изход
          </button>
        </div>

        {message ? <p className="form-status">{message}</p> : null}
      </header>

      <main className="admin-layout">
        <aside className="admin-sidebar">
          <section className="admin-list-card">
            <p className="eyebrow">Продукти</p>
            {snapshot.products.map((product) => (
              <button
                key={product.sku}
                className={product.sku === selectedProductSku ? 'admin-list-item active' : 'admin-list-item'}
                type="button"
                onClick={() => setSelectedProductSku(product.sku)}
              >
                <strong>{product.name}</strong>
                <span>{product.categorySlug}</span>
              </button>
            ))}
            <div className="admin-create-stack">
              <input value={newProduct.sku} onChange={(event) => setNewProduct({ ...newProduct, sku: event.target.value })} placeholder="Нов SKU" />
              <input value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} placeholder="Име на продукта" />
              <button className="button button-primary" type="button" onClick={handleCreateProduct}>
                Добави продукт
              </button>
            </div>
          </section>

          <section className="admin-list-card">
            <p className="eyebrow">Категории</p>
            {snapshot.categories.map((category) => (
              <button
                key={category.slug}
                className={category.slug === selectedCategorySlug ? 'admin-list-item active' : 'admin-list-item'}
                type="button"
                onClick={() => setSelectedCategorySlug(category.slug)}
              >
                <strong>{category.name}</strong>
                <span>{category.slug}</span>
              </button>
            ))}
            <div className="admin-create-stack">
              <input value={newCategory.slug} onChange={(event) => setNewCategory({ ...newCategory, slug: event.target.value as CategorySlug })} placeholder="slug на категория" />
              <input value={newCategory.name} onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })} placeholder="Име на категория" />
              <button className="button button-primary" type="button" onClick={handleCreateCategory}>
                Добави категория
              </button>
            </div>
          </section>

          <section className="admin-list-card">
            <p className="eyebrow">Марки</p>
            {snapshot.brands.map((brand) => (
              <button
                key={brand.name}
                className={brand.name === selectedBrandName ? 'admin-list-item active' : 'admin-list-item'}
                type="button"
                onClick={() => setSelectedBrandName(brand.name)}
              >
                <strong>{brand.name}</strong>
                <span>{brand.categorySlugs.join(', ')}</span>
              </button>
            ))}
            <div className="admin-create-stack">
              <input value={newBrand.name} onChange={(event) => setNewBrand({ ...newBrand, name: event.target.value })} placeholder="Име на марка" />
              <button className="button button-primary" type="button" onClick={handleCreateBrand}>
                Добави марка
              </button>
            </div>
          </section>

          <section className="admin-list-card">
            <p className="eyebrow">Поръчки</p>
            {visibleOrders.length > 0 ? (
              visibleOrders.map((order) => (
                <button
                  key={order.reference}
                  className={order.reference === selectedOrderReference ? 'admin-list-item active' : 'admin-list-item'}
                  type="button"
                  onClick={() => setSelectedOrderReference(order.reference)}
                >
                  <strong>{order.reference}</strong>
                  <span>{order.fullName} · {order.status} · {getPaymentStatusLabel(order)}</span>
                </button>
              ))
            ) : (
              <p className="admin-empty">Все още няма заявки.</p>
            )}
          </section>
        </aside>

        <section className="admin-editor">
          <article className="admin-panel">
            <p className="eyebrow">Редакция на продукт</p>
            {selectedProduct ? (
              <div className="admin-form-grid">
                <label>
                  Име
                  <input value={selectedProduct.name} onChange={(event) => updateProductField('name', event.target.value)} />
                </label>
                <label>
                  Категория
                  <select value={selectedProduct.categorySlug} onChange={(event) => updateProductField('categorySlug', event.target.value)}>
                    {snapshot.categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Тип
                  <select value={selectedProduct.type} onChange={(event) => updateProductField('type', event.target.value)}>
                      {productTypesWithShoe.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Марка
                  <input value={selectedProduct.brand} onChange={(event) => updateProductField('brand', event.target.value)} />
                </label>
                <label>
                  Цена
                  <input value={selectedProduct.price} onChange={(event) => updateProductField('price', event.target.value)} />
                </label>
                <label>
                  Цена (EUR число)
                  <input value={selectedProduct.priceEur?.toString() ?? ''} onChange={(event) => updateProductField('priceEur', event.target.value)} />
                </label>
                <label>
                  Себестойност (EUR)
                  <input value={selectedProduct.costEur?.toString() ?? ''} onChange={(event) => updateProductField('costEur', event.target.value)} />
                </label>
                <label>
                  Наличност (бр.)
                  <input value={selectedProduct.stock?.toString() ?? ''} onChange={(event) => updateProductField('stock', event.target.value)} />
                </label>
                <label>
                  Цвят (optional)
                  <input value={selectedProduct.color ?? ''} onChange={(event) => updateProductField('color', event.target.value)} />
                </label>
                {selectedProduct.type === 'Racket' ? (
                  <>
                    <label>
                      Head shape
                      <select value={selectedProduct.headShape ?? ''} onChange={(event) => updateProductField('headShape', event.target.value)}>
                        <option value="">--</option>
                        <option value="Teardrop">Teardrop</option>
                        <option value="Round">Round</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </label>
                    <label>
                      Balance
                      <select value={selectedProduct.balance ?? ''} onChange={(event) => updateProductField('balance', event.target.value)}>
                        <option value="">--</option>
                        <option value="Head-heavy">Head-heavy</option>
                        <option value="Balanced">Balanced</option>
                        <option value="Head-light">Head-light</option>
                      </select>
                    </label>
                    <label>
                      Weight (g)
                      <input value={selectedProduct.weightGrams?.toString() ?? ''} onChange={(event) => updateProductField('weightGrams', event.target.value)} />
                    </label>
                  </>
                ) : null}
                <label className="full-width">
                  Детайли
                  <textarea rows={4} value={selectedProduct.details} onChange={(event) => updateProductField('details', event.target.value)} />
                </label>
                <label className="full-width">
                  Етикети, разделени със запетая
                  <input value={selectedProduct.badges.join(', ')} onChange={(event) => updateProductField('badges', event.target.value)} />
                </label>
                <label className="full-width">
                  Image URL
                  <input value={selectedProduct.imageUrl} onChange={(event) => updateProductField('imageUrl', event.target.value)} />
                </label>
                <div className="full-width admin-inline-actions">
                  <button className="button button-primary" type="button" onClick={handleSaveSelectedProduct}>Запази</button>
                  <button className="button button-secondary" type="button" onClick={handleDeleteProduct}>Изтрий</button>
                </div>
              </div>
            ) : (
              <p className="admin-empty">Избери продукт.</p>
            )}
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Редакция на категория</p>
            {selectedCategory ? (
              <div className="admin-form-grid">
                <label>
                  Име
                  <input value={selectedCategory.name} onChange={(event) => updateCategoryField('name', event.target.value)} />
                </label>
                <label>
                  Slug
                  <input value={selectedCategory.slug} onChange={(event) => updateCategoryField('slug', event.target.value)} />
                </label>
                <label className="full-width">
                  Описание
                  <textarea rows={3} value={selectedCategory.description} onChange={(event) => updateCategoryField('description', event.target.value)} />
                </label>
                <label className="full-width">
                  Заглавие
                  <input value={selectedCategory.heroTitle} onChange={(event) => updateCategoryField('heroTitle', event.target.value)} />
                </label>
                <label className="full-width">
                  Текст на hero секцията
                  <textarea rows={4} value={selectedCategory.heroCopy} onChange={(event) => updateCategoryField('heroCopy', event.target.value)} />
                </label>
                <label>
                  Акцент
                  <input value={selectedCategory.accent} onChange={(event) => updateCategoryField('accent', event.target.value)} />
                </label>
                <label className="full-width">
                  Фокус елементи, разделени със запетая
                  <input value={selectedCategory.focus.join(', ')} onChange={(event) => updateCategoryField('focus', event.target.value)} />
                </label>
                <div className="full-width admin-inline-actions">
                  <button className="button button-primary" type="button" onClick={() => persistAndSelect(snapshot, 'Категорията е обновена.')}>Запази</button>
                  <button className="button button-secondary" type="button" onClick={handleDeleteCategory}>Изтрий</button>
                </div>
              </div>
            ) : (
              <p className="admin-empty">Избери категория.</p>
            )}
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Редакция на марка</p>
            {selectedBrand ? (
              <div className="admin-form-grid">
                <label>
                  Име
                  <input value={selectedBrand.name} onChange={(event) => updateBrandField('name', event.target.value)} />
                </label>
                <label className="full-width">
                  Бележки
                  <textarea rows={3} value={selectedBrand.note} onChange={(event) => updateBrandField('note', event.target.value)} />
                </label>
                <label className="full-width">
                  Slugs на категории, разделени със запетая
                  <input
                    value={selectedBrand.categorySlugs.join(', ')}
                    onChange={(event) => updateBrandField('categorySlugs', event.target.value)}
                  />
                </label>
                <div className="full-width admin-inline-actions">
                  <button className="button button-primary" type="button" onClick={() => persistAndSelect(snapshot, 'Марката е обновена.')}>Запази</button>
                  <button className="button button-secondary" type="button" onClick={handleDeleteBrand}>Изтрий</button>
                </div>
              </div>
            ) : (
              <p className="admin-empty">Избери марка.</p>
            )}
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Quick add (tick-box)</p>
            <div className="admin-form-grid">
              <label className="full-width">
                Product name
                <input value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Example: Karakal Team Court Shoe" />
              </label>

              <label>
                Brand
                <input value={quickBrand} onChange={(event) => setQuickBrand(event.target.value)} />
              </label>

              <label>
                Price EUR
                <input value={quickPriceEur} onChange={(event) => setQuickPriceEur(event.target.value)} />
              </label>
              <label>
                Cost EUR
                <input value={quickCostEur} onChange={(event) => setQuickCostEur(event.target.value)} />
              </label>
              <label>
                Stock amount
                <input value={quickStock} onChange={(event) => setQuickStock(event.target.value)} />
              </label>
              <label>
                Color (optional)
                <input value={quickColor} onChange={(event) => setQuickColor(event.target.value)} placeholder="black / blue / red" />
              </label>

              <div className="full-width admin-checkbox-group">
                <strong>Main sport (tick one)</strong>
                <div className="admin-checkbox-list">
                  {mainSportOptions.map((option) => (
                    <label key={option.slug} className="admin-checkbox-option">
                      <input
                        type="checkbox"
                        checked={quickSportSlug === option.slug}
                        onChange={() => setQuickSportSlug(option.slug as CategorySlug)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="full-width admin-checkbox-group">
                <strong>Product class (tick one)</strong>
                <div className="admin-checkbox-list">
                  {quickAddProductTypes.map((type) => (
                    <label key={type} className="admin-checkbox-option">
                      <input
                        type="checkbox"
                        checked={quickProductType === type}
                        onChange={() => setQuickProductType(type)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {quickProductType === 'Racket' ? (
                <div className="full-width admin-checkbox-group">
                  <strong>Racket specifications</strong>
                  <div className="admin-form-grid">
                    <label>
                      Head shape
                      <select value={quickHeadShape} onChange={(event) => setQuickHeadShape(event.target.value as 'Teardrop' | 'Round' | 'Hybrid')}>
                        <option value="Teardrop">Teardrop</option>
                        <option value="Round">Round</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </label>
                    <label>
                      Balance
                      <select value={quickBalance} onChange={(event) => setQuickBalance(event.target.value as 'Head-heavy' | 'Balanced' | 'Head-light')}>
                        <option value="Head-heavy">Head-heavy</option>
                        <option value="Balanced">Balanced</option>
                        <option value="Head-light">Head-light</option>
                      </select>
                    </label>
                    <label>
                      Weight (g)
                      <input value={quickWeightGrams} onChange={(event) => setQuickWeightGrams(event.target.value)} />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="full-width admin-checkbox-group">
                <strong>Badges</strong>
                <div className="admin-checkbox-list">
                  {['NEW', 'SALE', 'LIMITED', 'PRO', 'POPULAR'].map((badge) => (
                    <label key={badge} className="admin-checkbox-option">
                      <input
                        type="checkbox"
                        checked={quickBadges.includes(badge)}
                        onChange={() => toggleQuickBadge(badge)}
                      />
                      <span>{badge}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="full-width admin-inline-actions">
                <button className="button button-primary" type="button" onClick={handleQuickCreateProduct}>
                  Add product from tick-boxes
                </button>
                <button className="button button-secondary" type="button" onClick={handleImportUnsquashableCatalog}>
                  Import Unsquashable from Squashpoint
                </button>
              </div>
            </div>
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Статистика на продажбите</p>
            {adminStats ? (
              <div className="admin-stats-grid">
                <article className="admin-stat-card">
                  <h3>Users (API)</h3>
                  <strong>{adminStats.users}</strong>
                </article>
                <article className="admin-stat-card">
                  <h3>Products (API)</h3>
                  <strong>{adminStats.products}</strong>
                </article>
                <article className="admin-stat-card">
                  <h3>Orders (API)</h3>
                  <strong>{adminStats.orders}</strong>
                </article>
                <article className="admin-stat-card">
                  <h3>Revenue (API)</h3>
                  <strong>{formatEur(adminStats.revenueEur)}</strong>
                </article>
              </div>
            ) : null}

            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <h3>Items sold</h3>
                <strong>{salesStats.itemsSold}</strong>
              </article>
              <article className="admin-stat-card">
                <h3>Revenue</h3>
                <strong>{formatEur(salesStats.revenue)}</strong>
              </article>
              <article className="admin-stat-card">
                <h3>Cost</h3>
                <strong>{formatEur(salesStats.cost)}</strong>
              </article>
              <article className="admin-stat-card">
                <h3>Profit</h3>
                <strong>{formatEur(salesStats.profit)}</strong>
              </article>
            </div>

            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <h3>BORICA approved</h3>
                <strong>{paymentStats.approvedCardOrders}</strong>
              </article>
              <article className="admin-stat-card">
                <h3>BORICA volume</h3>
                <strong>{formatEur(paymentStats.approvedVolume)}</strong>
              </article>
              <article className="admin-stat-card">
                <h3>Cash on delivery</h3>
                <strong>{paymentStats.cashOnDeliveryOrders}</strong>
              </article>
            </div>

            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <h3>Bestsellers</h3>
                {salesStats.bestsellers.length > 0 ? (
                  <ul className="admin-stat-list">
                    {salesStats.bestsellers.map((item) => (
                      <li key={item.sku}>{item.name} ({item.quantity})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-empty">Няма достатъчно данни.</p>
                )}
              </article>
              <article className="admin-stat-card">
                <h3>Monthly profit</h3>
                {salesStats.monthlyProfit.length > 0 ? (
                  <ul className="admin-stat-list">
                    {salesStats.monthlyProfit.map((item) => (
                      <li key={item.month}>{item.month}: {formatEur(item.profit)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-empty">Няма месечни продажби.</p>
                )}
              </article>
            </div>

            {salesStats.soldWithoutCost > 0 ? (
              <p className="form-status">{salesStats.soldWithoutCost} продадени артикула са без въведена себестойност и изкривяват печалбата.</p>
            ) : null}
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Импорт и експорт</p>
            <label>
              Качи catalog JSON (offline файл)
              <input type="file" accept=".json,application/json" onChange={handleCatalogFileUpload} disabled={isCatalogSyncing} />
            </label>
            <p className="admin-empty">Поддържа products upsert и добавяне на нови категории/марки от файла.</p>
            <textarea
              className="admin-import"
              rows={10}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Постави JSON експорт тук, за да импортираш каталога."
            />
            <div className="admin-actions">
              <button className="button button-primary" type="button" onClick={handleImport}>
                Импортирай JSON
              </button>
              <button className="button button-secondary" type="button" onClick={() => setImportText(exportStoreSnapshot())}>
                Зареди JSON експорт
              </button>
            </div>
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Входящи заявки</p>
            {selectedOrder ? (
              <div className="admin-order-detail">
                <h3>{selectedOrder.reference}</h3>
                <p>{selectedOrder.fullName}</p>
                <p>{selectedOrder.email}</p>
                <p>{selectedOrder.createdAt}</p>
                <label>
                  Order status
                  <select value={selectedOrder.status} onChange={(event) => handleUpdateSelectedOrderStatus(event.target.value as OrderRecord['status'])}>
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </label>
                <p className="admin-payment-pill">{getPaymentStatusLabel(selectedOrder)}</p>
                <p>{selectedOrder.notes || 'Няма бележки.'}</p>
                <p>
                  Артикули:{' '}
                  {selectedOrder.items.map((item) => `${item.sku} x${item.quantity}`).join(', ')}
                </p>
                {selectedOrder.payment ? (
                  <div className="admin-payment-detail-grid">
                    <span>Provider: {selectedOrder.payment.provider ?? 'manual'}</span>
                    <span>Status: {selectedOrder.payment.status ?? 'n/a'}</span>
                    <span>Gateway order: {selectedOrder.payment.gatewayOrder ?? 'n/a'}</span>
                    <span>RRN: {selectedOrder.payment.rrn ?? 'n/a'}</span>
                    <span>INT_REF: {selectedOrder.payment.intRef ?? 'n/a'}</span>
                    <span>Amount: {typeof selectedOrder.payment.amountEur === 'number' ? formatEur(selectedOrder.payment.amountEur) : 'n/a'}</span>
                    <span>Currency: {selectedOrder.payment.currency ?? 'n/a'}</span>
                    <span>RC/ACTION: {selectedOrder.payment.rc ?? 'n/a'} / {selectedOrder.payment.action ?? 'n/a'}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="admin-empty">Няма избрана заявка.</p>
            )}
          </article>

          <article className="admin-panel">
            <p className="eyebrow">Stock movements</p>
            {stockMovements.length > 0 ? (
              <div className="admin-order-list">
                {stockMovements.slice(0, 30).map((movement) => (
                  <article className="admin-order-card" key={movement.id}>
                    <h3>{movement.productTitle || movement.sku}</h3>
                    <p>SKU: {movement.sku}</p>
                    <p>Delta: {movement.deltaQuantity > 0 ? `+${movement.deltaQuantity}` : movement.deltaQuantity}</p>
                    <p>Reason: {movement.reason}</p>
                    <p>Order: {movement.orderId || 'n/a'}</p>
                    <p>Actor: {movement.actor || 'system'}</p>
                    <p>{new Date(movement.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-empty">No stock movements yet.</p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;
