import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import type { CategorySlug } from './data/catalog';
import AdminPage from './pages/AdminPage';
import { getStoreSnapshot, loadStoreSnapshot, saveStoreSnapshot, submitOrderRequest, type StoreSnapshot } from './data/store';
import { isAdminAuthenticated } from './data/adminAuth';
import BrandLogo from './components/BrandLogo';
import CartDrawer from './components/CartDrawer';
import { getPendingBoricaOrder, removePendingBoricaOrder } from './data/paymentSession';
import PaymentResultPage from './pages/PaymentResultPage';
import AccountPage from './pages/AccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ContactPage from './pages/ContactPage';
import { getSessionUser } from './data/accountStore';
import StoreHeader from './components/StoreHeader';
import ProductDetailPage from './pages/ProductDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import CheckoutPage from './pages/CheckoutPage';

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

function ProductRoute({
  snapshot,
  onAddToCart,
}: {
  snapshot: StoreSnapshot;
  onAddToCart: (sku: string) => void;
}) {
  const { sku } = useParams();
  const product = snapshot.products.find((item) => item.sku === sku);

  if (!product) {
    return <Navigate replace to="/" />;
  }

  return <ProductDetailPage product={product} onAddToCart={onAddToCart} />;
}

function FavoritesRoute({
  snapshot,
  onAddToCart,
}: {
  snapshot: StoreSnapshot;
  onAddToCart: (sku: string) => void;
}) {
  return <FavoritesPage products={snapshot.products} onAddToCart={onAddToCart} />;
}

function hasAdminRole() {
  return getSessionUser()?.role === 'ADMIN';
}

function App() {
  const [store, setStore] = useState<StoreSnapshot>(() => getStoreSnapshot());
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => isAdminAuthenticated());
  const [cartLines, setCartLines] = useState<CartLine[]>(() => loadCartLines());
  const location = useLocation();
  const checkoutRetryToken = location.search.includes('checkout=retry') ? location.search : '';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAccountRoute = location.pathname.startsWith('/account');
  const isPaymentResultRoute = location.pathname.startsWith('/payments/borica/result');
  const isCheckoutRoute = location.pathname.startsWith('/checkout');
  const isNotFoundRoute = !['/', '/account', '/contact', '/forgot-password', '/reset-password', '/verify-email'].includes(location.pathname)
    && !location.pathname.startsWith('/category/')
    && !location.pathname.startsWith('/product/')
    && !location.pathname.startsWith('/favorites')
    && !location.pathname.startsWith('/checkout');
  const showGlobalHeader = !isAdminRoute && !isAccountRoute && !isPaymentResultRoute && !isNotFoundRoute;
  const activeSportSlug = location.pathname.startsWith('/category/')
    ? decodeURIComponent(location.pathname.replace('/category/', '').split('/')[0] || '')
    : undefined;

  useEffect(() => {
    let canceled = false;

    async function bootstrapStore() {
      const snapshot = await loadStoreSnapshot().catch(() => getStoreSnapshot());
      if (!canceled) {
        setStore(snapshot);
      }
    }

    bootstrapStore();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    function handleAuthChanged() {
      loadStoreSnapshot()
        .then((snapshot) => setStore(snapshot))
        .catch(() => undefined);
    }

    window.addEventListener('racketpoint:auth-changed', handleAuthChanged as EventListener);
    return () => window.removeEventListener('racketpoint:auth-changed', handleAuthChanged as EventListener);
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

  const handleBoricaApproved = useCallback(async (params: {
    order: string;
    rc?: string;
    action?: string;
    rrn?: string;
    intRef?: string;
    amount?: string;
    currency?: string;
  }) => {
    const pending = getPendingBoricaOrder(params.order);
    if (!pending) {
      return { status: 'missing_pending' as const };
    }

    const approvedAmount = Number(params.amount);
    if (Number.isFinite(approvedAmount) && Math.abs(approvedAmount - pending.amount) > 0.01) {
      return { status: 'amount_mismatch' as const };
    }

    if (params.currency && params.currency.toUpperCase() !== 'EUR') {
      return { status: 'amount_mismatch' as const };
    }

    removePendingBoricaOrder(params.order);

    const paymentNotes = [
      pending.request.notes ?? '',
      'Payment method: Online card payment (BORICA)',
      `BORICA ORDER: ${params.order}`,
      params.rrn ? `BORICA RRN: ${params.rrn}` : '',
      params.intRef ? `BORICA INT_REF: ${params.intRef}` : '',
      params.amount && params.currency ? `BORICA AMOUNT: ${params.amount} ${params.currency}` : '',
      'Payment status: APPROVED',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await submitOrderRequest({
      ...pending.request,
      idempotencyKey: `borica-${params.order}`,
      paymentMethod: 'card',
      notes: paymentNotes,
      payment: {
        provider: 'borica',
        status: 'approved',
        gatewayOrder: params.order,
        rrn: params.rrn,
        intRef: params.intRef,
        amountEur: pending.amount,
        currency: params.currency ?? 'EUR',
        rc: params.rc,
        action: params.action,
        signatureValid: true,
        approvedAt: new Date().toISOString(),
      },
    });

    handleClearCart();
    return { status: 'approved' as const, reference: result.reference };
  }, []);

  return (
    <>
      {showGlobalHeader ? (
        <div className="page-shell global-header-shell">
          <StoreHeader activeSportSlug={activeSportSlug} />
        </div>
      ) : null}

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              categories={store.categories}
              products={store.products}
              onAddToCart={handleAddToCart}
            />
          }
        />
        <Route path="/category/:slug" element={<CategoryRoute snapshot={store} onAddToCart={handleAddToCart} />} />
        <Route path="/product/:sku" element={<ProductRoute snapshot={store} onAddToCart={handleAddToCart} />} />
        <Route path="/favorites" element={<FavoritesRoute snapshot={store} onAddToCart={handleAddToCart} />} />
        <Route
          path="/checkout"
          element={(
            <CheckoutPage
              products={store.products}
              lines={cartLines}
              onIncrement={handleIncrementCartLine}
              onDecrement={handleDecrementCartLine}
              onRemove={handleRemoveCartLine}
              onClear={handleClearCart}
            />
          )}
        />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/payments/borica/result" element={<PaymentResultPage onBoricaApproved={handleBoricaApproved} />} />
        <Route
          path="/admin"
          element={(
            <AdminPage
              snapshot={store}
              onSnapshotChange={handleSnapshotChange}
              isAuthenticated={isAdminAuthed || hasAdminRole()}
              onAuthChange={handleAdminAuthChange}
            />
          )}
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

      {location.pathname !== '/admin' && !isCheckoutRoute && location.pathname !== '/payments/borica/result' ? (
        <CartDrawer
          products={store.products}
          lines={cartLines}
          autoOpenToken={checkoutRetryToken}
          onIncrement={handleIncrementCartLine}
          onDecrement={handleDecrementCartLine}
          onRemove={handleRemoveCartLine}
        />
      ) : null}
    </>
  );
}

export default App;