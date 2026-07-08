import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import type { CategorySlug } from './data/catalog';
import AdminPage from './pages/AdminPage';
import { getStoreSnapshot, saveStoreSnapshot, type StoreSnapshot } from './data/store';
import { isAdminAuthenticated } from './data/adminAuth';
import BrandLogo from './components/BrandLogo';
import CartDrawer from './components/CartDrawer';
import WorkInProgressBanner from './components/WorkInProgressBanner';

type CartLine = {
  sku: string;
  quantity: number;
};

const cartStorageKey = 'racketpoint-cart-v1';

function loadCartLines(): CartLine[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawValue = window.localStorage.getItem(cartStorageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as CartLine[];
    return parsed.filter((line) => line.sku && line.quantity > 0);
  } catch {
    return [];
  }
}

function normalizeSnapshot(snapshot: StoreSnapshot): StoreSnapshot {
  return {
    categories: snapshot.categories,
    brands: snapshot.brands,
    products: snapshot.products,
    orders: snapshot.orders,
  };
}

function CategoryRoute({
  snapshot,
  onAddToCart,
}: {
  snapshot: StoreSnapshot;
  onAddToCart: (sku: string) => void;
}) {
  const { slug } = useParams();
  const categoryBySlug = new Map(snapshot.categories.map((category) => [category.slug, category] as const));

  if (!slug || !categoryBySlug.has(slug as CategorySlug)) {
    return <Navigate replace to="/" />;
  }

  const category = categoryBySlug.get(slug as CategorySlug)!;
  const relatedBrands = snapshot.brands.filter((brand) => brand.categorySlugs.includes(category.slug));
  const productsForCategory = snapshot.products.filter((product) => product.categorySlug === category.slug);

  return (
    <CategoryPage
      category={category}
      products={productsForCategory}
      brands={relatedBrands}
      onAddToCart={onAddToCart}
    />
  );
}

function App() {
  const [store, setStore] = useState<StoreSnapshot>(() => getStoreSnapshot());
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => isAdminAuthenticated());
  const [cartLines, setCartLines] = useState<CartLine[]>(() => loadCartLines());
  const location = useLocation();

  useEffect(() => {
    setStore(getStoreSnapshot());
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cartLines));
    }
  }, [cartLines]);

  useEffect(() => {
    const existingSkus = new Set(store.products.map((product) => product.sku));
    setCartLines((prevLines) => prevLines.filter((line) => existingSkus.has(line.sku)));
  }, [store.products]);

  function handleSnapshotChange(nextSnapshot: StoreSnapshot) {
    const normalizedSnapshot = normalizeSnapshot(nextSnapshot);
    setStore(normalizedSnapshot);
    saveStoreSnapshot(normalizedSnapshot);
  }

  function handleAdminAuthChange(nextValue: boolean) {
    setIsAdminAuthed(nextValue);
  }

  function handleAddToCart(sku: string) {
    setCartLines((prevLines) => {
      const existingLine = prevLines.find((line) => line.sku === sku);

      if (!existingLine) {
        return [...prevLines, { sku, quantity: 1 }];
      }

      return prevLines.map((line) => (line.sku === sku ? { ...line, quantity: line.quantity + 1 } : line));
    });
  }

  function handleIncrementCartLine(sku: string) {
    setCartLines((prevLines) => prevLines.map((line) => (line.sku === sku ? { ...line, quantity: line.quantity + 1 } : line)));
  }

  function handleDecrementCartLine(sku: string) {
    setCartLines((prevLines) => prevLines
      .map((line) => (line.sku === sku ? { ...line, quantity: line.quantity - 1 } : line))
      .filter((line) => line.quantity > 0));
  }

  function handleRemoveCartLine(sku: string) {
    setCartLines((prevLines) => prevLines.filter((line) => line.sku !== sku));
  }

  function handleClearCart() {
    setCartLines([]);
  }

  return (
    <>
      {location.pathname !== '/admin' ? <WorkInProgressBanner /> : null}

      <Routes>
        <Route
          path="/"
          element={
            <HomePage />
          }
        />
        <Route path="/category/:slug" element={<CategoryRoute snapshot={store} onAddToCart={handleAddToCart} />} />
        <Route
          path="/admin"
          element={
            <AdminPage
              snapshot={store}
              onSnapshotChange={handleSnapshotChange}
              isAuthenticated={isAdminAuthed}
              onAuthChange={handleAdminAuthChange}
            />
          }
        />
        <Route
          path="*"
          element={
            <div className="page-shell">
              <div className="hero">
                <BrandLogo compact subtitle="Навигация" />
                <h1>Страницата не е намерена.</h1>
                <p className="intro">Използвай началната страница, за да разгледаш категориите и продуктите.</p>
                <div className="hero-actions">
                  <Link className="button button-primary" to="/">
                    Начало
                  </Link>
                </div>
              </div>
            </div>
          }
        />
      </Routes>

      {location.pathname !== '/admin' ? (
        <CartDrawer
          products={store.products}
          lines={cartLines}
          onIncrement={handleIncrementCartLine}
          onDecrement={handleDecrementCartLine}
          onRemove={handleRemoveCartLine}
          onClear={handleClearCart}
        />
      ) : null}
    </>
  );
}

export default App;