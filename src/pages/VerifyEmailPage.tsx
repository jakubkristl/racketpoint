import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { verifyEmailToken } from '../data/accountStore';

function VerifyEmailPage() {
  const location = useLocation();
  const [status, setStatus] = useState('Verifying your email...');

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token')?.trim() ?? '';
  }, [location.search]);

  useEffect(() => {
    let canceled = false;

    async function verify() {
      if (!token) {
        setStatus('Verification token is missing. Please use the link from your email.');
        return;
      }

      try {
        const result = await verifyEmailToken(token);
        if (!canceled) {
          setStatus(result.message || 'Email verified successfully.');
        }
      } catch (error) {
        if (!canceled) {
          setStatus(error instanceof Error ? error.message : 'Email verification failed.');
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
          <img src="https://images.pexels.com/photos/7648143/pexels-photo-7648143.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Email verification banner" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Email verification</p>
            <h2>Activate your account and continue shopping.</h2>
          </div>
        </section>

        <section className="account-stack">
          <article className="order-form">
            <p className="eyebrow">Email verification</p>
            <h2>Account confirmation</h2>
            <p className="form-status">{status}</p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/account">Go to account</Link>
              <Link className="button button-secondary" to="/">Back to store</Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default VerifyEmailPage;
