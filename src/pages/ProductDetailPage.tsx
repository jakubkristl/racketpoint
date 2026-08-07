import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../data/catalog';
import { isFavoriteSku, toggleFavoriteSku } from '../data/favorites';
import { getPublicAttributes, getPublicDescription } from '../data/publicCatalog';

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

function getAvailability(product: Product) {
  if (typeof product.stock !== 'number') {
    return 'Availability: limited';
  }

  if (product.stock <= 0) {
    return 'Availability: out of stock';
  }

  if (product.stock < 5) {
    return `Availability: low stock (${product.stock})`;
  }

  return `Availability: in stock (${product.stock})`;
}

function isOutOfStock(product: Product) {
  return typeof product.stock === 'number' && product.stock <= 0;
}

type ProductDetailPageProps = {
  product: Product;
  onAddToCart: (sku: string) => void;
};

function ProductDetailPage({ product, onAddToCart }: ProductDetailPageProps) {
  const [isFavorite, setIsFavorite] = useState(() => isFavoriteSku(product.sku));

  useEffect(() => {
    function handleFavoritesChanged() {
      setIsFavorite(isFavoriteSku(product.sku));
    }

    window.addEventListener('racketpoint:favorites-changed', handleFavoritesChanged as EventListener);
    return () => window.removeEventListener('racketpoint:favorites-changed', handleFavoritesChanged as EventListener);
  }, [product.sku]);

  const pricing = useMemo(() => getPricePresentation(product), [product]);
  const displayDescription = getPublicDescription(product);
  const publicAttributes = getPublicAttributes(product.attributes);

  return (
    <div className="page-shell">
      <main className="product-detail-page">
        <Link className="button button-secondary product-detail-back" to={product.categorySlug ? `/category/${product.categorySlug}` : '/'}>
          Back to category
        </Link>

        <section className="product-detail-grid">
          <article className="product-detail-gallery">
            <img className="product-detail-image" src={product.imageUrl} alt={product.name} />
          </article>

          <article className="product-detail-panel">
            <p className="eyebrow">{product.brand}</p>
            <h1>{product.name}</h1>
            <p className="product-detail-availability">{getAvailability(product)}</p>
            {isOutOfStock(product) ? <p className="delivery-note delivery-note-detail">Delivery 7-14 days</p> : null}
            <div className="price-stack product-detail-price">
              {pricing.isOnSale && pricing.original ? <p className="price-original">{pricing.original}</p> : null}
              <strong className={pricing.isOnSale ? 'price-sale' : ''}>{pricing.sale}</strong>
              <p className="price-tax-note">VAT included</p>
            </div>
            <p className="product-detail-description">{displayDescription}</p>

            {publicAttributes.length > 0 ? (
              <div className="product-detail-attributes">
                {publicAttributes.map(({ key, value }) => (
                  <div key={key} className="product-detail-attribute">
                    <strong>{key}</strong>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="product-detail-actions">
              <button
                type="button"
                className={isFavorite ? 'retail-icon-btn favorite-toggle-btn active' : 'retail-icon-btn favorite-toggle-btn'}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                onClick={() => setIsFavorite(toggleFavoriteSku(product.sku))}
              >
                <span className="retail-icon-svg" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => onAddToCart(product.sku)}
              >
                Add to Cart
              </button>
            </div>

            <div className="product-detail-meta">
              <span>Category: {product.categorySlug}</span>
              <span>Type: {product.type}</span>
              {typeof product.weightGrams === 'number' ? <span>Weight: {product.weightGrams}g</span> : null}
              {product.balance ? <span>Balance: {product.balance}</span> : null}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default ProductDetailPage;
