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
      setStatus('Липсва токен за нулиране. Отворете отново връзката от имейла си.');
      return;
    }

    if (password.length < 8) {
      setStatus('Паролата трябва да е поне 8 знака.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('Паролите не съвпадат.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setStatus(result.message || 'Паролата е нулирана. Пренасочване към профила...');
      setTimeout(() => navigate('/account'), 1200);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Неуспешно нулиране на паролата.');
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
            <p className="eyebrow">Нова парола</p>
            <h2>Пазете акаунта си с нова и силна парола.</h2>
          </div>
        </section>

        <div className="account-toolbar">
          <Link className="button button-secondary" to="/account">Към профила</Link>
        </div>

        <section className="account-stack">
          <form className="order-form" onSubmit={handleSubmit}>
            <p className="eyebrow">Нулиране на парола</p>
            <h2>Задайте нова парола</h2>
            <p className="support-copy">Създайте силна парола за своя акаунт в Racketpoint.</p>

            <label>
              Нова парола
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>

            <label>
              Потвърдете новата парола
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>

            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? 'Запазване...' : 'Нулирай паролата'}
            </button>

            {status ? <p className="form-status">{status}</p> : null}
          </form>
        </section>
      </main>
    </div>
  );
}

export default ResetPasswordPage;
