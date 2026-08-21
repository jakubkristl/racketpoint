import { Link } from 'react-router-dom';
function ContactPage() {
  return (
    <div className="page-shell">
      <main>
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/6203524/pexels-photo-6203524.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Customer support sports desk" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Обслужване на клиенти</p>
            <h2>Бързи отговори за екипировка, поръчки и доставка.</h2>
          </div>
        </section>

        <section className="section compact-contact-layout">
          <section className="compact-page-intro">
          <p className="eyebrow">Обслужване на клиенти</p>
          <h1>Свържете се с Racketpoint.bg</h1>
          <p className="intro">
            Sport And Beyond Ltd (Булстат 208314448). Свържете се с нашия екип за доставка, проследяване на
            поръчки, връщания и помощ при избор на продукти.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/account">Поддръжка на профила</Link>
            <a className="button button-secondary" href="mailto:info@racketpoint.bg">Имейл info@racketpoint.bg</a>
          </div>
        </section>

          <aside className="hero-panel">
            <article className="panel-card">
            <p className="panel-label">Телефон</p>
            <h2>0896 754 014</h2>
            <p>Пон-Пет 09:00 - 18:00</p>
            </article>
            <article className="panel-card">
            <p className="panel-label">Данни за фирмата</p>
            <h2>Sport And Beyond Ltd</h2>
            <p>Bulstat: 208314448</p>
            <p>Адрес: ул. „Любен Русев“ 6, 1113 София</p>
            <span>info@racketpoint.bg</span>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default ContactPage;
