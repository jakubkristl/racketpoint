import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../data/accountStore';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const result = await requestPasswordReset(email);
      setStatus(result.message || 'If this account exists, a reset link has been sent.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to request password reset.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <main className="account-page">
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/7648075/pexels-photo-7648075.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Password reset support banner" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Account recovery</p>
            <h2>Regain access quickly and securely.</h2>
          </div>
        </section>

        <div className="account-toolbar">
          <Link className="button button-secondary" to="/account">Back to account</Link>
        </div>

        <section className="account-stack">
          <form className="order-form" onSubmit={handleSubmit}>
            <p className="eyebrow">Password reset</p>
            <h2>Forgot your password?</h2>
            <p className="support-copy">Enter your email and we will send a reset link.</p>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

            {status ? <p className="form-status">{status}</p> : null}
          </form>
        </section>
      </main>
    </div>
  );
}

export default ForgotPasswordPage;
