import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrders, type OrderRecord } from '../data/store';
import {
  ensureSeededAdminUser,
  getSessionUser,
  login,
  logout,
  refreshProfile,
  resendVerificationEmail,
  signup,
  type AccountAddress,
  type AccountUser,
  updateProfile,
} from '../data/accountStore';

function AccountPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<AccountUser | null>(() => getSessionUser());
  const [userOrders, setUserOrders] = useState<OrderRecord[]>([]);
  const [signupAddress, setSignupAddress] = useState<Omit<AccountAddress, 'id'>>({
    label: 'Delivery',
    street: '',
    city: '',
    zipCode: '',
    country: 'Bulgaria',
  });
  const [addressForm, setAddressForm] = useState<Omit<AccountAddress, 'id'>>({
    label: 'Home',
    street: '',
    city: '',
    zipCode: '',
    country: 'Bulgaria',
  });
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    ensureSeededAdminUser();
  }, []);

  useEffect(() => {
    let canceled = false;

    async function loadAccountData() {
      if (!sessionUser) {
        setUserOrders([]);
        return;
      }

      try {
        const [profile, orders] = await Promise.all([
          refreshProfile(),
          fetchOrders(),
        ]);

        if (canceled) {
          return;
        }

        setSessionUser(profile);
        setUserOrders(orders);
      } catch (error) {
        if (canceled) {
          return;
        }

        setStatus(error instanceof Error ? error.message : 'Failed to load account data.');
      }
    }

    loadAccountData();

    return () => {
      canceled = true;
    };
  }, [sessionUser?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    try {
      let user: AccountUser;

      if (mode === 'login') {
        user = await login(email, password);
      } else {
        user = await signup(name, email, password);
        const deliveryAddress: AccountAddress = {
          id: `ADR-${Date.now().toString(36).toUpperCase()}`,
          ...signupAddress,
        };
        user = await updateProfile({ addresses: [deliveryAddress] });
      }

      setSessionUser(user);
      setStatus(mode === 'login' ? 'Logged in successfully.' : 'Account created successfully.');
      window.dispatchEvent(new CustomEvent('racketpoint:auth-changed'));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed.');
    }
  }

  function handleLogout() {
    logout();
    setSessionUser(null);
    setStatus('Logged out.');
    window.dispatchEvent(new CustomEvent('racketpoint:auth-changed'));
  }

  async function handleSaveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionUser) {
      return;
    }

    const nextAddress: AccountAddress = {
      id: `ADR-${Date.now().toString(36).toUpperCase()}`,
      ...addressForm,
    };

    try {
      const next = await updateProfile({ addresses: [...sessionUser.addresses, nextAddress] });
      setSessionUser(next);
      setStatus('Address saved.');
      setAddressForm({
        label: 'Home',
        street: '',
        city: '',
        zipCode: '',
        country: 'Bulgaria',
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save address.');
    }
  }

  async function handleNameSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionUser) {
      return;
    }

    try {
      const next = await updateProfile({ name: (name || sessionUser.name).trim() });
      setSessionUser(next);
      setStatus('Profile updated.');
      window.dispatchEvent(new CustomEvent('racketpoint:auth-changed'));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to update profile.');
    }
  }

  async function handleResendVerification() {
    if (!email.trim()) {
      setStatus('Enter your email first, then request a new verification message.');
      return;
    }

    setResendLoading(true);
    try {
      const result = await resendVerificationEmail(email);
      setStatus(result.message || 'If needed, a new verification email has been sent.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <main className="account-page">
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/7648297/pexels-photo-7648297.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Account and support banner" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Account center</p>
            <h2>Manage profile, addresses and orders in one place.</h2>
          </div>
        </section>

        <div className="account-toolbar">
          <a className="button button-secondary" href="/">Back to Store</a>
          {sessionUser ? <button className="button button-primary" type="button" onClick={handleLogout}>Logout</button> : null}
        </div>

      {!sessionUser ? (
        <section>
          <div className="account-mode-switch">
            <button className={mode === 'login' ? 'button button-primary' : 'button button-secondary'} type="button" onClick={() => setMode('login')}>
              Login
            </button>
            <button className={mode === 'signup' ? 'button button-primary' : 'button button-secondary'} type="button" onClick={() => setMode('signup')}>
              Sign Up
            </button>
          </div>

          <form className="order-form" onSubmit={handleSubmit}>
            {mode === 'signup' ? (
              <>
                <label>
                  Full name
                  <input value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label>
                  Delivery street
                  <input
                    value={signupAddress.street}
                    onChange={(event) => setSignupAddress((prev) => ({ ...prev, street: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Delivery city
                  <input
                    value={signupAddress.city}
                    onChange={(event) => setSignupAddress((prev) => ({ ...prev, city: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Delivery ZIP code
                  <input
                    value={signupAddress.zipCode}
                    onChange={(event) => setSignupAddress((prev) => ({ ...prev, zipCode: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Delivery country
                  <input
                    value={signupAddress.country}
                    onChange={(event) => setSignupAddress((prev) => ({ ...prev, country: event.target.value }))}
                    required
                  />
                </label>
              </>
            ) : null}
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <button className="button button-primary" type="submit">{mode === 'login' ? 'Login' : 'Create account'}</button>
            {mode === 'login' ? (
              <p className="support-copy">
                Forgot password? <Link to="/forgot-password">Reset it here</Link>.
              </p>
            ) : null}
            {mode === 'login' ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
              >
                {resendLoading ? 'Sending verification...' : 'Resend verification email'}
              </button>
            ) : null}
            {status ? <p className="form-status">{status}</p> : null}
          </form>
        </section>
      ) : (
        <section className="account-stack">
          <form className="order-form" onSubmit={handleNameSave}>
            <p className="eyebrow">Profile</p>
            <label>
              Display name
              <input value={name || sessionUser.name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <p className="support-copy">{sessionUser.email} · {sessionUser.role}</p>
            <button className="button button-primary" type="submit">Save profile</button>
          </form>

          <form className="order-form" onSubmit={handleSaveAddress}>
            <p className="eyebrow">Address book</p>
            <div className="brand-grid account-cards">
              {sessionUser.addresses.length > 0 ? sessionUser.addresses.map((address) => (
                <article className="brand-card" key={address.id}>
                  <h3>{address.label}</h3>
                  <p>{address.street}</p>
                  <p>{address.city}, {address.zipCode}</p>
                  <p>{address.country}</p>
                </article>
              )) : <article className="empty-state"><h3>No saved addresses yet.</h3></article>}
            </div>
            <label>
              Label
              <input value={addressForm.label} onChange={(event) => setAddressForm((prev) => ({ ...prev, label: event.target.value }))} required />
            </label>
            <label>
              Street
              <input value={addressForm.street} onChange={(event) => setAddressForm((prev) => ({ ...prev, street: event.target.value }))} required />
            </label>
            <label>
              City
              <input value={addressForm.city} onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))} required />
            </label>
            <label>
              ZIP code
              <input value={addressForm.zipCode} onChange={(event) => setAddressForm((prev) => ({ ...prev, zipCode: event.target.value }))} required />
            </label>
            <label>
              Country
              <input value={addressForm.country} onChange={(event) => setAddressForm((prev) => ({ ...prev, country: event.target.value }))} required />
            </label>
            <button className="button button-primary" type="submit">Save address</button>
          </form>

          <section className="order-form">
            <p className="eyebrow">Order history</p>
            <div className="brand-grid account-cards">
              {userOrders.length > 0 ? userOrders.map((order) => (
                <article className="brand-card" key={order.reference}>
                  <h3>{order.reference}</h3>
                  <p>{new Date(order.createdAt).toLocaleString()}</p>
                  <p>{order.items.map((item) => `${item.sku} x${item.quantity}`).join(', ')}</p>
                </article>
              )) : <article className="empty-state"><h3>No orders yet.</h3></article>}
            </div>
          </section>
        </section>
      )}
      </main>
    </div>
  );
}

export default AccountPage;
