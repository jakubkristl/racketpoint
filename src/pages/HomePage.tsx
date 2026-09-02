import { Link } from 'react-router-dom';
import type { Category, Product } from '../data/catalog';
import { createSportArtwork } from '../data/catalog';
import { getPublicShortDetails } from '../data/publicCatalog';
import { shopSubcategories } from '../data/subcategories';
import ProductTags from '../components/ProductTags';

type HomePageProps = {
  categories: Category[];
  products: Product[];
  onAddToCart: (sku: string) => void;
};

const heroVideoPath = '/branding/homepage/hero/FB%20Final.mp4';

function createHomeHeroArtwork() {
  return createSportArtwork('Hero', 'Racketpoint editorial storefront', '#0d4e8f');
}

const heroPosterPath = createHomeHeroArtwork();

const sportVisuals = [
  {
    slug: 'squash',
    sport: 'Скуош',
    caption: '',
    imageUrl: '/branding/homepage/categories/squash.webp',
    fallbackImageUrl: 'https://images.pexels.com/photos/7648269/pexels-photo-7648269.jpeg?auto=compress&cs=tinysrgb&w=1200',
    href: '/category/squash',
  },
  {
    slug: 'badminton',
    sport: 'Бадминтон',
    caption: '',
    imageUrl: '/branding/homepage/categories/badminton.webp',
    fallbackImageUrl: 'https://images.pexels.com/photos/2202685/pexels-photo-2202685.jpeg?auto=compress&cs=tinysrgb&w=1200',
    href: '/category/badminton',
  },
  {
    slug: 'padel',
    sport: 'Падел',
    caption: '',
    imageUrl: '/branding/homepage/categories/padel.webp',
    fallbackImageUrl: 'https://images.pexels.com/photos/35248332/pexels-photo-35248332.jpeg?auto=compress&cs=tinysrgb&w=1200',
    href: '/category/padel',
  },
  {
    slug: 'table-tennis',
    sport: 'Тенис на маса',
    caption: '',
    imageUrl: '/branding/homepage/categories/table-tennis.webp',
    fallbackImageUrl: 'https://images.pexels.com/photos/709134/pexels-photo-709134.jpeg?auto=compress&cs=tinysrgb&w=1200',
    href: '/category/table-tennis',
  },
  {
    slug: 'tennis',
    sport: 'Тенис',
    caption: '',
    imageUrl: '/branding/homepage/categories/tennis.webp',
    fallbackImageUrl: 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=1200',
    href: '/category/tennis',
  },
];

function getInventoryBadge(product: Product) {
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

function getDisplayPriceValue(product: Product) {
  if (typeof product.salePriceEur === 'number' && Number.isFinite(product.salePriceEur)) {
    return `EUR ${product.salePriceEur.toFixed(2)}`;
  }

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

function hasHomepageFeatureTag(product: Product) {
  const badgeText = product.badges.join(' ').toLowerCase();

  return badgeText.includes('hot')
    || badgeText.includes('хит')
    || badgeText.includes('new')
    || badgeText.includes('нов')
    || badgeText.includes('sale')
    || badgeText.includes('akcia')
    || badgeText.includes('акция')
    || badgeText.includes('%')
    || (typeof product.originalPriceEur === 'number'
      && typeof product.salePriceEur === 'number'
      && product.salePriceEur < product.originalPriceEur);
}

function HomePage({ categories, products, onAddToCart }: HomePageProps) {
  const featuredProducts = products.filter(hasHomepageFeatureTag).slice(0, 8);
  const homeCategoryOrder = ['squash', 'badminton', 'padel', 'table-tennis', 'tennis'];
  const primaryCategories = homeCategoryOrder
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category): category is Category => Boolean(category));

  return (
    <div className="page-shell home-editorial-page">
      <main className="home-editorial-main">
        <section className="home-editorial-hero">
          <article className="home-editorial-copy">
            <p className="eyebrow">Нов сезон</p>
            <h1>Движи се по-бързо. Пазарувай за корта.</h1>
            <p className="intro">
              Премиум магазин за ракетни спортове, вдъхновен от модерна редакционна търговия.
              С един клик клиентите отиват директно към всяка спортна колекция.
            </p>
            <div className="home-editorial-actions">
              <a className="button button-primary" href="#shop-categories">Категории</a>
              <a className="button button-secondary" href="#featured-products">Избрани продукти</a>
            </div>
            <div className="home-editorial-tags">
              {shopSubcategories.slice(0, 6).map((section) => <span key={section.slug}>{section.label}</span>)}
            </div>
          </article>

          <a
            className="home-editorial-media"
            href="https://www.doubleyellowsquash.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="Посети Double Yellow Squash"
          >
            <img
              src={heroPosterPath}
              alt="Racketpoint hero"
              className="home-editorial-poster"
              loading="eager"
            />
            <video className="home-editorial-video" autoPlay muted loop playsInline poster={heroPosterPath}>
              <source src={heroVideoPath} type="video/mp4" />
            </video>
          </a>
        </section>

        <section className="section" id="shop-categories">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Пазарувай по спорт</p>
              <h2>Директен достъп до всяка основна категория.</h2>
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
                    if (target.src === visual.fallbackImageUrl) {
                      target.src = '/branding/logo-fallback.png';
                      return;
                    }
                    target.src = visual.fallbackImageUrl;
                  }}
                />
                <div className="home-category-card-overlay">
                  <h3>{visual.sport}</h3>
                  {visual.caption ? <p>{visual.caption}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section" id="featured-products">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Избрани предложения</p>
              <h2>Бързи предложения, готови за количката.</h2>
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
                    <p className="product-description">{getPublicShortDetails(product)}</p>
                  </div>
                  <div className="product-badges">
                    <span className="stock-pill">{getInventoryBadge(product)}</span>
                    <ProductTags product={product} />
                  </div>
                  {isOutOfStock(product) ? <p className="delivery-note">Доставка 7-14 дни</p> : null}
                  <div className="product-footer">
                    <strong>{getDisplayPriceValue(product)}</strong>
                    <button type="button" onClick={() => onAddToCart(product.sku)}>Бързо добавяне</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Бързи връзки</p>
              <h2>Отиди директно към подкатегориите.</h2>
            </div>
          </div>

          <div className="mega-menu-grid">
            {primaryCategories.map((category) => (
              <article className="mega-menu-column" key={`home-${category.slug}`}>
                <h3>{category.name}</h3>
                <div className="mega-menu-links">
                  {shopSubcategories.map((sub) => (
                    <Link key={`${category.slug}-${sub.slug}`} to={`/category/${category.slug}?sub=${encodeURIComponent(sub.slug)}`}>
                      {sub.label}
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
