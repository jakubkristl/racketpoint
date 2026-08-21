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
      setStatus(result.message || 'Ако този акаунт съществува, е изпратена връзка за нулиране.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Неуспешна заявка за нулиране на паролата.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <main className="account-page">
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/7648075/pexels-photo-7648075.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Банер за възстановяване на парола" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Възстановяване на акаунт</p>
            <h2>Възстановете достъпа бързо и сигурно.</h2>
          </div>
        </section>

        <div className="account-toolbar">
          <Link className="button button-secondary" to="/account">Към профила</Link>
        </div>

        <section className="account-stack">
          <form className="order-form" onSubmit={handleSubmit}>
            <p className="eyebrow">Нулиране на парола</p>
            <h2>Забравихте паролата си?</h2>
            <p className="support-copy">Въведете имейла си и ще изпратим връзка за нулиране.</p>

            <label>
              Имейл
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? 'Изпращане...' : 'Изпрати връзка'}
            </button>

            {status ? <p className="form-status">{status}</p> : null}
          </form>
        </section>
      </main>
    </div>
  );
}

export default ForgotPasswordPage;
