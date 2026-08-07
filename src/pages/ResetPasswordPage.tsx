import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../data/accountStore';

function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token')?.trim() ?? '';
  }, [location.search]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!token) {
      setStatus('Reset token is missing. Open the link from your email again.');
      return;
    }

    if (password.length < 8) {
      setStatus('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setStatus(result.message || 'Password has been reset. Redirecting to account...');
      setTimeout(() => navigate('/account'), 1200);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <main className="account-page">
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/7648080/pexels-photo-7648080.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Reset password banner" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Set new password</p>
            <h2>Keep your account protected with a strong new password.</h2>
          </div>
        </section>

        <div className="account-toolbar">
          <Link className="button button-secondary" to="/account">Back to account</Link>
        </div>

        <section className="account-stack">
          <form className="order-form" onSubmit={handleSubmit}>
            <p className="eyebrow">Password reset</p>
            <h2>Set a new password</h2>
            <p className="support-copy">Create a strong password for your Racketpoint account.</p>

            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>

            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Reset password'}
            </button>

            {status ? <p className="form-status">{status}</p> : null}
          </form>
        </section>
      </main>
    </div>
  );
}

export default ResetPasswordPage;
