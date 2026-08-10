import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSportArtwork, type BalanceProfile, type Brand, type Category, type Product } from '../data/catalog';
import { getFavoriteSkus, isFavoriteSku, toggleFavoriteSku } from '../data/favorites';

type CategoryPageProps = {
  category: Category;
  products: Product[];
  brands: Brand[];
  onAddToCart: (sku: string) => void;
};

const productTypeLabels: Record<string, string> = {
  Racket: 'Rackets',
  Balls: 'Balls',
  Wear: 'Apparel',
  Shoe: 'Footwear',
  Bag: 'Bags',
  Accessory: 'Accessories',
  String: 'Rackets',
  Grip: 'Grips',
};

const subcategoryOptions = ['Rackets', 'Balls', 'Apparel', 'Grips', 'Footwear', 'Bags', 'Accessories'];
const sizeOptions = ['S', 'M', 'L', 'XL', '39', '40', '41', '42', '43', '44'];

const subcategoryStockImages: Record<string, string> = {
  Rackets: createSportArtwork('Rackets', 'Selected frames', '#0d4e8f'),
  Balls: createSportArtwork('Balls', 'Match essentials', '#e56717'),
  Apparel: createSportArtwork('Apparel', 'Court-ready layers', '#1b7bd1'),
  Grips: createSportArtwork('Grips', 'Touch and control', '#1f6b3a'),
  Footwear: createSportArtwork('Footwear', 'Fast support', '#4d6f8f'),
  Bags: createSportArtwork('Bags', 'Travel ready', '#8c5bbf'),
  Accessories: createSportArtwork('Accessories', 'Daily add-ons', '#c24c6b'),
};

const categoryMoodBySlug: Record<string, { imageUrl: string; title: string; copy: string }> = {
  squash: {
    imageUrl: createSportArtwork('Squash', 'Performance edit', '#0d4e8f'),
    title: 'Squash performance edit',
    copy: 'Built for speed, control and hard match tempo.',
  },
  tennis: {
    imageUrl: createSportArtwork('Tennis', 'Precision edit', '#1f6b3a'),
    title: 'Tennis precision edit',
    copy: 'Court-ready setups for club and tournament play.',
  },
  badminton: {
    imageUrl: createSportArtwork('Badminton', 'Speed edit', '#1b7bd1'),
    title: 'Badminton speed edit',
    copy: 'Lightweight gear for acceleration and quick recovery.',
  },
  padel: {
    imageUrl: createSportArtwork('Padel', 'Momentum edit', '#e56717'),
    title: 'Padel momentum edit',
    copy: 'Modern glass-court focus with power and touch balance.',
  },
  'table-tennis': {
    imageUrl: createSportArtwork('Table Tennis', 'Control edit', '#4d6f8f'),
    title: 'Table tennis control edit',
    copy: 'Spin-ready setups for compact and technical play.',
  },
};

function getPriceValue(product: Product) {
  if (typeof product.priceEur === 'number') {
    return product.priceEur;
  }

  if (!product.price) {
    return 0;
  }

  const parsed = Number.parseFloat(product.price.replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getStockLabel(product: Product) {
  if (typeof product.stock !== 'number') {
    return 'Limited';
  }

  if (product.stock <= 0) {
    return 'Out of stock';
  }

  if (product.stock < 5) {
    return 'Low stock';
  }

  return 'In stock';
}

function isOutOfStock(product: Product) {
  return typeof product.stock === 'number' && product.stock <= 0;
}

function hasSize(product: Product, requestedSize: string) {
  const normalized = requestedSize.trim().toUpperCase();
  const text = `${product.name} ${product.details} ${product.badges.join(' ')}`.toUpperCase();
  const marker = new RegExp(`(^|\\s|-)${normalized}($|\\s|-)`, 'i');
  return marker.test(text);
}

function weightMatches(product: Product, requestedWeight: string) {
  if (!requestedWeight) {
    return true;
  }

  if (typeof product.weightGrams !== 'number') {
    return false;
  }

  if (requestedWeight === 'lte120') {
    return product.weightGrams <= 120;
  }

  if (requestedWeight === '121to130') {
    return product.weightGrams >= 121 && product.weightGrams <= 130;
  }

  if (requestedWeight === 'gte131') {
    return product.weightGrams >= 131;
  }

  return true;
}

function formatEur(value: number) {
  return `EUR ${value.toFixed(2)}`;
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

  const fallbackPrice = typeof product.priceEur === 'number'
    ? formatEur(product.priceEur)
    : (product.price?.includes('EUR') ? product.price : `EUR ${(product.price ?? '0.00').replace('€', '')}`);

  return {
    isOnSale: false,
    sale: fallbackPrice,
    original: null,
  };
}

function CategoryPage({ category, products, brands, onAddToCart }: CategoryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [favoriteSkus, setFavoriteSkus] = useState<string[]>(() => getFavoriteSkus());

  useEffect(() => {
    function handleFavoritesChanged() {
      setFavoriteSkus(getFavoriteSkus());
    }

    window.addEventListener('racketpoint:favorites-changed', handleFavoritesChanged as EventListener);
    return () => window.removeEventListener('racketpoint:favorites-changed', handleFavoritesChanged as EventListener);
  }, []);

  const requestedSub = searchParams.get('sub') ?? 'all';
  const requestedBrand = searchParams.get('brand') ?? 'all';
  const requestedMinPrice = searchParams.get('minPrice') ?? '';
  const requestedMaxPrice = searchParams.get('maxPrice') ?? '';
  const requestedSize = searchParams.get('size') ?? '';
  const requestedWeight = searchParams.get('weight') ?? '';
  const requestedBalance = searchParams.get('balance') ?? '';
  const requestedStock = searchParams.get('stock') ?? 'all';
  const requestedQuery = searchParams.get('q') ?? '';

  const availableBalances = useMemo(
    () => Array.from(new Set(products.map((item) => item.balance).filter((item): item is BalanceProfile => Boolean(item)))),
    [products],
  );

  const availableBrands = useMemo(
    () => Array.from(new Set(products.map((item) => item.brand))).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const subcategoryBlocks = useMemo(
    () => subcategoryOptions.map((subCategory) => ({
      label: subCategory,
      count: products.filter((product) => (productTypeLabels[product.type] ?? product.type) === subCategory).length,
    })),
    [products],
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const mappedSub = productTypeLabels[product.type] ?? product.type;
      const productPrice = getPriceValue(product);
      const queryText = `${product.name} ${product.details} ${product.brand}`.toLowerCase();

      if (requestedSub !== 'all' && mappedSub !== requestedSub) {
        return false;
      }

      if (requestedBrand !== 'all' && product.brand !== requestedBrand) {
        return false;
      }

      if (requestedMinPrice) {
        const min = Number(requestedMinPrice);
        if (Number.isFinite(min) && productPrice < min) {
          return false;
        }
      }

      if (requestedMaxPrice) {
        const max = Number(requestedMaxPrice);
        if (Number.isFinite(max) && productPrice > max) {
          return false;
        }
      }

      if (requestedSize && !hasSize(product, requestedSize)) {
        return false;
      }

      if (!weightMatches(product, requestedWeight)) {
        return false;
      }

      if (requestedBalance && product.balance !== requestedBalance) {
        return false;
      }

      if (requestedStock === 'in-stock' && (typeof product.stock === 'number' ? product.stock <= 0 : false)) {
        return false;
      }

      if (requestedStock === 'out-of-stock' && (typeof product.stock === 'number' ? product.stock > 0 : true)) {
        return false;
      }

      if (requestedQuery && !queryText.includes(requestedQuery.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [
    products,
    requestedSub,
    requestedBrand,
    requestedMinPrice,
    requestedMaxPrice,
    requestedSize,
    requestedWeight,
    requestedBalance,
    requestedStock,
    requestedQuery,
  ]);
  const categoryMood = categoryMoodBySlug[category.slug] ?? {
    imageUrl: 'https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=1800',
    title: `${category.name} visual edit`,
    copy: category.description,
  };

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);

    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    setSearchParams(next, { replace: false });
  }

  function clearAllFilters() {
    const next = new URLSearchParams();
    if (requestedQuery) {
      next.set('q', requestedQuery);
    }
    setSearchParams(next, { replace: false });
  }

  function selectSubCategory(value: string) {
    setParam('sub', value === requestedSub ? 'all' : value);
  }

  function openProduct(productSku: string) {
    navigate(`/product/${encodeURIComponent(productSku)}`);
  }

  return (
    <div className="page-shell">
      <main>
        <section className="section compact-page-intro">
          <p className="eyebrow">Category</p>
          <h1>{category.name}</h1>
          <p className="intro">{category.heroCopy}</p>
        </section>

        <section className="section category-mood-banner">
          <img
            src={categoryMood.imageUrl}
            alt={`${category.name} banner`}
            loading="lazy"
          />
          <div className="category-mood-overlay">
            <p className="eyebrow">{categoryMood.title}</p>
            <h2>{categoryMood.copy}</h2>
          </div>
        </section>

        <section className="section" id="products">
          <div className="catalog-top-row">
            <div className="subcategory-block-grid">
              {subcategoryBlocks.map((subCategory) => {
                const imageUrl = subcategoryStockImages[subCategory.label] ?? 'https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=1200';

                return (
                  <button
                    key={subCategory.label}
                    type="button"
                    className={requestedSub === subCategory.label ? 'subcategory-block active' : 'subcategory-block'}
                    onClick={() => selectSubCategory(subCategory.label)}
                  >
                    <img
                      className="subcategory-block-media"
                      src={imageUrl}
                      alt={`${subCategory.label} stock visual`}
                      loading="lazy"
                    />
                    <div className="subcategory-block-copy">
                      <span>{subCategory.label}</span>
                      <strong>{subCategory.count} items</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="catalog-layout">
            <aside className="catalog-sidebar" id="filters">
              <div className="catalog-sidebar-header">
                <h3>Filters</h3>
              </div>
              <div className="filter-block">
                <h3>Sub-category</h3>
                <select value={requestedSub} onChange={(event) => setParam('sub', event.target.value)}>
                  <option value="all">All</option>
                  {subcategoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="filter-block">
                <h3>Brand</h3>
                <select value={requestedBrand} onChange={(event) => setParam('brand', event.target.value)}>
                  <option value="all">All brands</option>
                  {availableBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </div>

              <div className="filter-block filter-row-2">
                <div>
                  <h3>Min EUR</h3>
                  <input value={requestedMinPrice} onChange={(event) => setParam('minPrice', event.target.value)} placeholder="0" />
                </div>
                <div>
                  <h3>Max EUR</h3>
                  <input value={requestedMaxPrice} onChange={(event) => setParam('maxPrice', event.target.value)} placeholder="300" />
                </div>
              </div>

              <div className="filter-block">
                <h3>Size</h3>
                <select value={requestedSize} onChange={(event) => setParam('size', event.target.value)}>
                  <option value="">All sizes</option>
                  {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>

              <div className="filter-block">
                <h3>Weight</h3>
                <select value={requestedWeight} onChange={(event) => setParam('weight', event.target.value)}>
                  <option value="">All weights</option>
                  <option value="lte120">Up to 120g</option>
                  <option value="121to130">121g - 130g</option>
                  <option value="gte131">131g+</option>
                </select>
              </div>

              <div className="filter-block">
                <h3>Balance</h3>
                <select value={requestedBalance} onChange={(event) => setParam('balance', event.target.value)}>
                  <option value="">All balances</option>
                  {availableBalances.map((balance) => <option key={balance} value={balance}>{balance}</option>)}
                </select>
              </div>

              <div className="filter-block">
                <h3>Stock</h3>
                <select value={requestedStock} onChange={(event) => setParam('stock', event.target.value)}>
                  <option value="all">All</option>
                  <option value="in-stock">In stock</option>
                  <option value="out-of-stock">Out of stock</option>
                </select>
              </div>

              <button className="button button-secondary" type="button" onClick={clearAllFilters}>Clear filters</button>
            </aside>

            <div className="product-grid">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  (() => {
                    const isFavorite = favoriteSkus.includes(product.sku) || isFavoriteSku(product.sku);

                    return (
                      <article
                        className="product-card clickable-card product-card-compact"
                        key={product.sku}
                        onClick={() => openProduct(product.sku)}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openProduct(product.sku);
                          }
                        }}
                      >
                        <img className="product-image" src={product.imageUrl} alt={product.name} loading="lazy" />
                        <div className="product-body">
                          <h3 className={getProductTitleClass(product.name)}>{product.name}</h3>

                          <p className="product-availability">{getStockLabel(product)}</p>
                          {isOutOfStock(product) ? <p className="delivery-note">Delivery 7-14 days</p> : null}

                          <div className="product-footer">
                            <div className="price-stack">
                              {(() => {
                                const pricing = getPricePresentation(product);
                                return (
                                  <>
                                    {pricing.isOnSale && pricing.original ? (
                                      <p className="price-original">{pricing.original}</p>
                                    ) : null}
                                    <strong className={pricing.isOnSale ? 'price-sale' : ''}>{pricing.sale}</strong>
                                    <p className="price-tax-note">VAT included</p>
                                  </>
                                );
                              })()}
                            </div>
                            <div className="product-action-stack">
                              <button
                                type="button"
                                className={isFavorite ? 'retail-icon-btn favorite-toggle-btn active' : 'retail-icon-btn favorite-toggle-btn'}
                                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleFavoriteSku(product.sku);
                                }}
                              >
                                <span className="retail-icon-svg" aria-hidden="true">
                                  <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                Add to Cart
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })()
                ))
              ) : (
                <article className="empty-state">
                  <h3>No products match the current filters.</h3>
                  <p>Adjust filters or clear them to broaden results.</p>
                </article>
              )}
            </div>
          </div>
        </section>

        <section className="section" id="brands">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Brands</p>
              <h2>Brand context for this sport category.</h2>
            </div>
          </div>
          <div className="brand-grid">
            {brands.map((brand) => (
              <article className="brand-card clickable-card" key={brand.name}>
                <p className="eyebrow">Brand</p>
                <h3>{brand.name}</h3>
                <p>{brand.note}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default CategoryPage;

