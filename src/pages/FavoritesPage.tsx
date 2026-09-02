import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../data/catalog';
import { getFavoriteSkus, toggleFavoriteSku } from '../data/favorites';
import ProductTags from '../components/ProductTags';

type FavoritesPageProps = {
  products: Product[];
  onAddToCart: (sku: string) => void;
};

function formatEur(value: number) {
  return `EUR ${value.toFixed(2)}`;
}

function getPricePresentation(product: Product) {
  const salePrice = typeof product.salePriceEur === 'number' ? product.salePriceEur : product.priceEur;
  const originalPrice = typeof product.originalPriceEur === 'number' ? product.originalPriceEur : undefined;
  const isOnSale = typeof salePrice === 'number' && typeof originalPrice === 'number' && salePrice < originalPrice;

  if (isOnSale) {
    return {
      isOnSale: true,
      sale: formatEur(salePrice),
      original: formatEur(originalPrice),
    };
  }

  return {
    isOnSale: false,
    sale: typeof product.priceEur === 'number' ? formatEur(product.priceEur) : 'EUR 0.00',
    original: null,
  };
}

function getStockLabel(product: Product) {
  if (typeof product.stock !== 'number') {
    return 'Ограничено количество';
  }

  if (product.stock <= 0) {
    return 'Изчерпано';
  }

  if (product.stock < 5) {
    return 'Ограничени бройки';
  }

  return 'Налично';
}

function isOutOfStock(product: Product) {
  return typeof product.stock === 'number' && product.stock <= 0;
}

function getProductTitleClass(name: string) {
  if (name.length > 62) {
    return 'product-title product-title-xlong';
  }

  if (name.length > 44) {
    return 'product-title product-title-long';
  }

  return 'product-title';
}

function FavoritesPage({ products, onAddToCart }: FavoritesPageProps) {
  const navigate = useNavigate();
  const [favoriteSkus, setFavoriteSkus] = useState<string[]>(() => getFavoriteSkus());

  useEffect(() => {
    function handleFavoritesChanged() {
      setFavoriteSkus(getFavoriteSkus());
    }

    window.addEventListener('racketpoint:favorites-changed', handleFavoritesChanged as EventListener);
    return () => window.removeEventListener('racketpoint:favorites-changed', handleFavoritesChanged as EventListener);
  }, []);

  const favoriteProducts = useMemo(
    () => products.filter((product) => favoriteSkus.includes(product.sku)),
    [products, favoriteSkus],
  );

  return (
    <div className="page-shell">
      <main className="section">
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/1263349/pexels-photo-1263349.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Favorites sports atmosphere" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Любими продукти</p>
            <h2>Запазената ти екипировка е готова за мачовия ден.</h2>
          </div>
        </section>

        <div className="section-heading split">
          <div>
            <p className="eyebrow">Любими</p>
            <h2>Запазени продукти</h2>
          </div>
          <p className="support-copy">{favoriteProducts.length} продукт{favoriteProducts.length === 1 ? '' : 'а'} в любимите ти.</p>
        </div>

        <div className="product-grid">
          {favoriteProducts.length > 0 ? favoriteProducts.map((product) => {
            const pricing = getPricePresentation(product);
            return (
              <article
                className="product-card clickable-card product-card-compact"
                key={product.sku}
                onClick={() => navigate(`/product/${encodeURIComponent(product.sku)}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/product/${encodeURIComponent(product.sku)}`);
                  }
                }}
              >
                <img className="product-image" src={product.imageUrl} alt={product.name} loading="lazy" />
                <div className="product-body">
                  <h3 className={getProductTitleClass(product.name)}>{product.name}</h3>
                  <ProductTags product={product} />
                  <p className="product-availability">{getStockLabel(product)}</p>
                  {isOutOfStock(product) ? <p className="delivery-note">Доставка 7-14 дни</p> : null}
                  <div className="product-footer">
                    <div className="price-stack">
                      {pricing.isOnSale && pricing.original ? <p className="price-original">{pricing.original}</p> : null}
                      <strong className={pricing.isOnSale ? 'price-sale' : ''}>{pricing.sale}</strong>
                      <p className="price-tax-note">ДДС включено</p>
                    </div>
                    <div className="product-action-stack">
                      <button
                        type="button"
                        className="retail-icon-btn favorite-toggle-btn active"
                        aria-label="Премахни от любими"
                        title="Премахни от любими"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavoriteSku(product.sku);
                        }}
                      >
                        <span className="retail-icon-svg" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="button button-primary product-action-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAddToCart(product.sku);
                        }}
                      >
                        Добави в количката
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          }) : (
            <article className="empty-state">
              <h3>Все още няма любими продукти.</h3>
              <p>Използвайте „Добави в любими“ от страниците на категории и продукти, за да ги запазите тук.</p>
            </article>
          )}
        </div>
      </main>
    </div>
  );
}

export default FavoritesPage;
