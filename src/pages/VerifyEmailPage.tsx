import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { verifyEmailToken } from '../data/accountStore';

function VerifyEmailPage() {
  const location = useLocation();
  const [status, setStatus] = useState('Потвърждаваме имейла ви...');

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token')?.trim() ?? '';
  }, [location.search]);

  useEffect(() => {
    let canceled = false;

    async function verify() {
      if (!token) {
        setStatus('Липсва токен за потвърждение. Моля, използвайте връзката от имейла си.');
        return;
      }

      try {
        const result = await verifyEmailToken(token);
        if (!canceled) {
          setStatus(result.message || 'Имейлът е потвърден успешно.');
        }
      } catch (error) {
        if (!canceled) {
          setStatus(error instanceof Error ? error.message : 'Неуспешно потвърждение на имейла.');
        }
      }
    }

    verify();
    return () => {
      canceled = true;
    };
  }, [token]);

  return (
    <div className="page-shell">
      <main className="account-page">
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/7648143/pexels-photo-7648143.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Банер за потвърждение на имейл" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Потвърждение на имейл</p>
            <h2>Активирайте акаунта си и продължете с пазаруването.</h2>
          </div>
        </section>

        <section className="account-stack">
          <article className="order-form">
            <p className="eyebrow">Потвърждение на имейл</p>
            <h2>Потвърждение на акаунта</h2>
            <p className="form-status">{status}</p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/account">Към профила</Link>
              <Link className="button button-secondary" to="/">Към магазина</Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default VerifyEmailPage;
