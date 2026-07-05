import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Brand, Category, Product } from '../data/catalog';
import BrandLogo from '../components/BrandLogo';

type HomePageProps = {
  categories: Category[];
  brands: Brand[];
  featuredProducts: Product[];
  onAddToCart: (sku: string) => void;
};

const sportsLanes = [
  'Tennis',
  'Squash',
  'Badminton',
  'Padel',
  'Racketball',
  'Table Tennis',
];

const productTypeLabels: Record<string, string> = {
  Racket: 'Ракета',
  Balls: 'Топки',
  Wear: 'Облекло',
  Bag: 'Чанта',
  Accessory: 'Аксесоар',
  String: 'Кордaж',
  Grip: 'Grip',
};

function HomePage({ categories, brands, featuredProducts, onAddToCart }: HomePageProps) {
  const categoryNameBySlug = new Map(categories.map((category) => [category.slug, category.name] as const));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const filteredProducts = useMemo(() => {
    return featuredProducts.filter((product) => {
      const matchesSearch = `${product.name} ${product.details}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase().trim());
      const matchesCategory = selectedCategory === 'all' || product.categorySlug === selectedCategory;
      const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand;
      const matchesType = selectedType === 'all' || product.type === selectedType;

      return matchesSearch && matchesCategory && matchesBrand && matchesType;
    });
  }, [featuredProducts, searchTerm, selectedCategory, selectedBrand, selectedType]);

  return (
    <div className="page-shell">
      <header className="hero">
        <nav className="topbar">
          <div>
            <BrandLogo />
            <h1>Racketpoint.bg is live for all racket sports.</h1>
          </div>
          <a className="nav-cta" href="#catalog">
            Shop the collection
          </a>
        </nav>

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="badge">Rackets · Footwear · Bags · Strings · Apparel · Accessories</p>
            <p className="intro">
              Premium Bulgarian storefront for tennis, squash, badminton, padel, racketball, and table tennis.
              Built for product discovery and fast conversion.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#catalog">
                Browse products
              </a>
              <a className="button button-secondary" href="#categories">
                Shop by department
              </a>
            </div>
            <ul className="stats" aria-label="Основни предимства">
              <li>
                <strong>6+</strong>
                <span>core sports lanes</span>
              </li>
              <li>
                <strong>7</strong>
                <span>shopping departments</span>
              </li>
              <li>
                <strong>24/7</strong>
                <span>launch-ready stack</span>
              </li>
            </ul>
            <div className="sports-strip" aria-label="Racket sports categories">
              {sportsLanes.map((sport) => (
                <span key={sport}>{sport}</span>
              ))}
            </div>
          </section>

          <aside className="hero-panel">
            <p className="panel-label">Fast access departments</p>
            <div className="panel-list">
              {categories.slice(0, 3).map((category) => (
                <Link className="panel-card" key={category.slug} to={`/category/${category.slug}`}>
                  <div>
                    <h2>{category.name}</h2>
                    <p>{category.description}</p>
                  </div>
                  <span>{category.accent}</span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section" id="categories">
          <div className="section-heading">
            <p className="eyebrow">Shop by department</p>
            <h2>Every department is ready for full live inventory.</h2>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link className="category-card" key={category.slug} to={`/category/${category.slug}`}>
                <span className="category-tag">{category.accent}</span>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
                <span className="card-link">Open department</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section" id="catalog">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Featured catalog</p>
              <h2>Conversion-ready product cards for launch week.</h2>
            </div>
            <p className="support-copy">
              Structured for products, brands, and future stock synchronization via CMS or API.
            </p>
          </div>

          <div className="catalog-filters">
            <input
              placeholder="Search by product name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              <option value="all">All departments</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <select value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)}>
              <option value="all">All brands</option>
              {brands.map((brand) => (
                <option key={brand.name} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              <option value="all">All types</option>
              {Object.keys(productTypeLabels).map((type) => (
                <option key={type} value={type}>
                  {productTypeLabels[type]}
                </option>
              ))}
            </select>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedBrand('all');
                setSelectedType('all');
              }}
            >
              Clear filters
            </button>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product.sku}>
                <img className="product-image" src={product.imageUrl} alt={product.name} />
                <div className="product-body">
                  <div>
                    <p className="product-category">
                      {product.brand} · {productTypeLabels[product.type] ?? product.type}
                    </p>
                    <h3>{product.name}</h3>
                    <p>{product.details}</p>
                    <p className="product-meta">{categoryNameBySlug.get(product.categorySlug) ?? product.categorySlug}</p>
                  </div>
                  <div className="product-badges">
                    {product.badges.map((badge) => (
                      <span key={badge}>{badge}</span>
                    ))}
                  </div>
                  <div className="product-footer">
                    <strong>{product.price}</strong>
                    <button type="button" onClick={() => onAddToCart(product.sku)}>
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Brands</p>
              <h2>Ready for supplier expansion and brand campaigns.</h2>
            </div>
            <p className="support-copy">
              Data is separated into departments, brands, products, and order submissions.
            </p>
          </div>
          <div className="brand-grid">
            {brands.map((brand) => (
              <article className="brand-card" key={brand.name}>
                <p className="eyebrow">Марка</p>
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

export default HomePage;
