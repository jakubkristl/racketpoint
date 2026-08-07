import { Link } from 'react-router-dom';
import type { Category, Product } from '../data/catalog';
import { getPublicShortDetails } from '../data/publicCatalog';

type HomePageProps = {
  categories: Category[];
  products: Product[];
  onAddToCart: (sku: string) => void;
};

const subcategoryBlueprint = ['Rackets', 'Grips', 'Apparel', 'Bags', 'Balls', 'Accessories'];

const subcategoryBySport: Record<string, string[]> = {
  squash: ['Rackets', 'Grips', 'Strings', 'Apparel', 'Bags', 'Accessories'],
  tennis: ['Rackets', 'Overgrips', 'Apparel', 'Bags', 'Balls', 'Accessories'],
  'table-tennis': ['Bats', 'Rubbers', 'Balls', 'Bags', 'Grips', 'Accessories'],
  badminton: ['Rackets', 'Shuttlecocks', 'Grips', 'Apparel', 'Bags', 'Accessories'],
  padel: ['Rackets', 'Overgrips', 'Apparel', 'Bags', 'Balls', 'Accessories'],
};

const heroVideoPath = '/branding/homepage/hero/launch-loop.mp4';
const heroPosterPath = '/branding/homepage/hero/launch-poster.jpg';

const sportVisuals = [
  {
    slug: 'squash',
    sport: 'Squash',
    caption: 'Rackets, grips, footwear and match-day essentials.',
    imageUrl: '/branding/homepage/categories/squash.jpg',
    href: '/category/squash',
  },
  {
    slug: 'badminton',
    sport: 'Badminton',
    caption: 'Fast setups for speed, control and quick transitions.',
    imageUrl: '/branding/homepage/categories/badminton.jpg',
    href: '/category/badminton',
  },
  {
    slug: 'padel',
    sport: 'Padel',
    caption: 'Urban court momentum with technical product picks.',
    imageUrl: '/branding/homepage/categories/padel.jpg',
    href: '/category/padel',
  },
  {
    slug: 'table-tennis',
    sport: 'Table Tennis',
    caption: 'Compact power and precision-focused control lines.',
    imageUrl: '/branding/homepage/categories/table-tennis.jpg',
    href: '/category/table-tennis',
  },
  {
    slug: 'tennis',
    sport: 'Tennis',
    caption: 'Premium rackets and accessories for all-court players.',
    imageUrl: '/branding/homepage/categories/tennis.jpg',
    href: '/category/tennis',
  },
];

function getInventoryBadge(product: Product) {
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

function getDisplayPriceValue(product: Product) {
  if (typeof product.priceEur === 'number' && Number.isFinite(product.priceEur)) {
    return `EUR ${product.priceEur.toFixed(2)}`;
  }

  if (product.price) {
    return product.price.includes('EUR') ? product.price : `EUR ${product.price.replace('€', '').trim()}`;
  }

  return 'EUR 0.00';
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

function HomePage({ categories, products, onAddToCart }: HomePageProps) {
  const featuredProducts = products.slice(0, 8);
  const homeCategoryOrder = ['squash', 'badminton', 'padel', 'table-tennis', 'tennis'];
  const primaryCategories = homeCategoryOrder
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category): category is Category => Boolean(category));

  return (
    <div className="page-shell home-editorial-page">
      <main className="home-editorial-main">
        <section className="home-editorial-hero">
          <article className="home-editorial-copy">
            <p className="eyebrow">New Season</p>
            <h1>Move Faster. Shop The Court.</h1>
            <p className="intro">
              Premium racket sports storefront inspired by modern editorial retail.
              One click takes customers straight to each sport collection.
            </p>
            <div className="home-editorial-actions">
              <a className="button button-primary" href="#shop-categories">Shop categories</a>
              <a className="button button-secondary" href="#featured-products">Shop featured</a>
            </div>
            <div className="home-editorial-tags">
              {subcategoryBlueprint.map((section) => <span key={section}>{section}</span>)}
            </div>
          </article>

          <article className="home-editorial-media" aria-label="Hero animation area">
            <img
              src={heroPosterPath}
              alt="Racketpoint hero"
              className="home-editorial-poster"
              loading="eager"
              onError={(event) => {
                const target = event.currentTarget;
                if (target.src.endsWith('/branding/logo-fallback.png')) {
                  return;
                }
                target.src = '/branding/logo-fallback.png';
              }}
            />
            <video className="home-editorial-video" autoPlay muted loop playsInline poster={heroPosterPath}>
              <source src={heroVideoPath} type="video/mp4" />
            </video>
            <div className="home-editorial-media-overlay">
              <strong>Drop your animation file into:</strong>
              <span>/public/branding/homepage/hero/launch-loop.mp4</span>
            </div>
          </article>
        </section>

        <section className="section" id="shop-categories">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Shop by sport</p>
              <h2>One-click entry to every main category.</h2>
            </div>
          </div>

          <div className="home-category-grid">
            {sportVisuals.map((visual) => (
              <Link to={visual.href} className="home-category-card" key={visual.slug}>
                <img
                  src={visual.imageUrl}
                  alt={visual.sport}
                  loading="lazy"
                  onError={(event) => {
                    const target = event.currentTarget;
                    if (target.src.endsWith('/branding/logo-fallback.png')) {
                      return;
                    }
                    target.src = '/branding/logo-fallback.png';
                  }}
                />
                <div className="home-category-card-overlay">
                  <h3>{visual.sport}</h3>
                  <p>{visual.caption}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section" id="featured-products">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Featured now</p>
              <h2>Fast picks ready for cart.</h2>
            </div>
          </div>

          <div className="product-grid">
            {featuredProducts.map((product) => (
              <article className="product-card" key={product.sku}>
                <Link to={`/product/${encodeURIComponent(product.sku)}`}>
                  <img className="product-image" src={product.imageUrl} alt={product.name} loading="lazy" />
                </Link>
                <div className="product-body">
                  <div>
                    <p className="product-category">{product.brand}</p>
                    <h3 className={getProductTitleClass(product.name)}>{product.name}</h3>
                    <p>{getPublicShortDetails(product)}</p>
                  </div>
                  <div className="product-badges">
                    <span className="stock-pill">{getInventoryBadge(product)}</span>
                    {product.badges.map((badge) => <span key={badge}>{badge}</span>)}
                  </div>
                  {isOutOfStock(product) ? <p className="delivery-note">Delivery 7-14 days</p> : null}
                  <div className="product-footer">
                    <strong>{getDisplayPriceValue(product)}</strong>
                    <button type="button" onClick={() => onAddToCart(product.sku)}>Quick Add</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Category shortcuts</p>
              <h2>Go straight to sub-categories.</h2>
            </div>
          </div>

          <div className="mega-menu-grid">
            {primaryCategories.map((category) => (
              <article className="mega-menu-column" key={`home-${category.slug}`}>
                <h3>{category.name}</h3>
                <p>{category.heroCopy}</p>
                <div className="mega-menu-links">
                  {(subcategoryBySport[category.slug] ?? subcategoryBlueprint).map((sub) => (
                    <Link key={`${category.slug}-${sub}`} to={`/category/${category.slug}?sub=${encodeURIComponent(sub)}`}>
                      {sub}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
