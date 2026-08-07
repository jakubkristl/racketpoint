import { Link } from 'react-router-dom';
function ContactPage() {
  return (
    <div className="page-shell">
      <main>
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/6203524/pexels-photo-6203524.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Customer support sports desk" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Customer support</p>
            <h2>Fast answers for gear, orders and delivery.</h2>
          </div>
        </section>

        <section className="section compact-contact-layout">
          <section className="compact-page-intro">
          <p className="eyebrow">Customer Support</p>
          <h1>Contact Racketpoint.bg</h1>
          <p className="intro">
            Sport And Beyond Ltd (Bulstat 208314448). Reach our team for delivery support, order tracking,
            returns and product guidance.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/account">Open account support</Link>
            <a className="button button-secondary" href="mailto:info@racketpoint.bg">Email info@racketpoint.bg</a>
          </div>
        </section>

          <aside className="hero-panel">
            <article className="panel-card">
            <p className="panel-label">Phone</p>
            <h2>0896 754 014</h2>
            <p>Mon-Fri 09:00 - 18:00</p>
            </article>
            <article className="panel-card">
            <p className="panel-label">Company Details</p>
            <h2>Sport And Beyond Ltd</h2>
            <p>Bulstat: 208314448</p>
            <p>Address: Lyuben Rusev 6, 1113 Sofia</p>
            <span>info@racketpoint.bg</span>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default ContactPage;
