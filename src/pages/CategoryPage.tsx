import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Brand, Category, Product } from '../data/catalog';
import type { OrderInput } from '../data/store';
import { submitOrderRequest } from '../data/store';
import BrandLogo from '../components/BrandLogo';

type CategoryPageProps = {
  category: Category;
  products: Product[];
  brands: Brand[];
  onAddToCart: (sku: string) => void;
};

const productTypeLabels: Record<string, string> = {
  Racket: 'Ракета',
  Balls: 'Топки',
  Wear: 'Облекло',
  Bag: 'Чанта',
  Accessory: 'Аксесоар',
  String: 'Кордaж',
  Grip: 'Grip',
};

function CategoryPage({ category, products, brands, onAddToCart }: CategoryPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const primaryProductSku = useMemo(() => products[0]?.sku ?? '', [products]);

  async function handleOrderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: OrderInput = {
      fullName,
      email,
      items: primaryProductSku ? [{ sku: primaryProductSku, quantity: 1 }] : [],
      notes,
    };

    const result = await submitOrderRequest(payload);

    setStatus(`Заявката е записана с номер ${result.reference}.`);
    setFullName('');
    setEmail('');
    setNotes('');
  }

  return (
    <div className="page-shell">
      <header className="category-hero hero">
        <nav className="topbar">
          <div>
            <BrandLogo compact subtitle="Категориен преглед" />
            <h1>{category.name}</h1>
          </div>
          <Link className="nav-cta" to="/">
            Обратно към началото
          </Link>
        </nav>

        <div className="category-hero-grid">
          <section className="hero-copy">
            <p className="badge">{category.accent}</p>
            <p className="intro">{category.heroCopy}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#products">
                Виж продуктите
              </a>
              <a className="button button-secondary" href="#brands">
                Виж марките
              </a>
            </div>
          </section>

          <aside className="hero-panel">
            <p className="panel-label">Фокус на категорията</p>
            <div className="focus-list">
              {category.focus.map((focusItem) => (
                <span key={focusItem}>{focusItem}</span>
              ))}
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section" id="products">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Продукти</p>
              <h2>{category.heroTitle}</h2>
            </div>
            <p className="support-copy">Продуктите са групирани по категория, тип и марка.</p>
          </div>
          <div className="product-grid">
            {products.length > 0 ? (
              products.map((product) => (
                <article className="product-card" key={product.sku}>
                  <img className="product-image" src={product.imageUrl} alt={product.name} />
                  <div className="product-body">
                    <div>
                        <p className="product-category">
                          {product.brand} · {productTypeLabels[product.type] ?? product.type}
                        </p>
                      <h3>{product.name}</h3>
                      <p>{product.details}</p>
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
              ))
            ) : (
              <article className="empty-state">
                <h3>Все още няма продукти</h3>
                <p>Категорията е готова за реален склад, когато свържем backend или CMS.</p>
              </article>
            )}
          </div>
        </section>

        <section className="section order-section">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Поръчки</p>
              <h2>Форма за заявка, готова за backend или CMS.</h2>
            </div>
            <p className="support-copy">
              Тази форма подава заявка за поръчка и по-късно може да се свърже с реален API.
            </p>
          </div>

          <form className="order-form" onSubmit={handleOrderSubmit}>
            <label>
              Име и фамилия
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </label>
            <label>
              Имейл
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Бележки
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
            </label>
            <button className="button button-primary" type="submit">
              Изпрати заявка
            </button>
            {status ? <p className="form-status">{status}</p> : null}
          </form>
        </section>

        <section className="section" id="brands">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Марки</p>
              <h2>Подходящи марки за тази категория.</h2>
            </div>
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

export default CategoryPage;
