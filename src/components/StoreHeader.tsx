import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { getFavoriteSkus } from '../data/favorites';

type StoreHeaderProps = {
  activeSportSlug?: string;
};

type NavItem = {
  key: string;
  label: string;
  to: string;
  hover: string;
};

const navOrder: NavItem[] = [
  { key: 'squash', label: 'Squash', to: '/category/squash', hover: 'Rackets, grips, shoes and accessories for squash.' },
  { key: 'badminton', label: 'Badminton', to: '/category/badminton', hover: 'Rackets, shuttlecocks, apparel and bags.' },
  { key: 'padel', label: 'Padel', to: '/category/padel', hover: 'Control and power padel range for all levels.' },
  { key: 'table-tennis', label: 'Table Tennis', to: '/category/table-tennis', hover: 'Bats, rubbers, balls and table-tennis gear.' },
  { key: 'tennis', label: 'Tennis', to: '/category/tennis', hover: 'Tennis rackets, strings, shoes and bags.' },
  { key: 'contact', label: 'Contact', to: '/contact', hover: 'Customer care, delivery and company details.' },
];

function HeaderIcon({ children }: { children: ReactNode }) {
  return <span className="retail-icon-svg" aria-hidden="true">{children}</span>;
}

function CategoryPictogram({ category }: { category: string }) {
  if (category === 'squash') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="9" cy="8" rx="4" ry="5" />
        <path d="M12 12l5 5" />
      </svg>
    );
  }

  if (category === 'badminton') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4l10 10" />
        <path d="M6 5l4-2" />
        <path d="M10 9l2-4" />
        <path d="M15 14l4-2" />
      </svg>
    );
  }

  if (category === 'padel') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="10" height="12" rx="3" />
        <path d="M10 15v6" />
      </svg>
    );
  }

  if (category === 'table-tennis') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="5" width="12" height="8" rx="2" />
        <path d="M10 13v5" />
        <circle cx="19" cy="9" r="2" />
      </svg>
    );
  }

  if (category === 'tennis') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="6" />
        <path d="M14 14l6 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h12" />
    </svg>
  );
}

function StoreHeader({ activeSportSlug }: StoreHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSearch = new URLSearchParams(location.search).get('q') ?? '';
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [favoriteCount, setFavoriteCount] = useState(() => getFavoriteSkus().length);

  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    function handleFavoritesChanged() {
      setFavoriteCount(getFavoriteSkus().length);
    }

    window.addEventListener('racketpoint:favorites-changed', handleFavoritesChanged as EventListener);
    return () => window.removeEventListener('racketpoint:favorites-changed', handleFavoritesChanged as EventListener);
  }, []);

  function handleOpenCart() {
    window.dispatchEvent(new CustomEvent('racketpoint:open-cart'));
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const baseSport = activeSportSlug || 'squash';
    const trimmedQuery = searchValue.trim();

    navigate(
      trimmedQuery
        ? `/category/${baseSport}?q=${encodeURIComponent(trimmedQuery)}`
        : `/category/${baseSport}`,
    );
  }

  return (
    <div className="store-header-shell retail-shell">
      <div className="retail-mainnav">
        <Link className="retail-logo-link" to="/" aria-label="Go to homepage">
          <BrandLogo compact subtitle="" />
        </Link>

        <nav className="retail-links" aria-label="Main store navigation">
          {navOrder.map((item) => (
            <Link
              key={item.key}
              className={item.key === activeSportSlug || (item.key === 'contact' && location.pathname === '/contact') ? 'retail-link active' : 'retail-link'}
              to={item.to}
              title={item.hover}
            >
              <span className="retail-link-icon" aria-hidden="true"><CategoryPictogram category={item.key} /></span>
              <span>{item.label}</span>
              <span className="retail-link-hover">{item.hover}</span>
            </Link>
          ))}
        </nav>

        <form className="store-search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search..."
            aria-label="Search products"
          />
          <button className="header-icon-btn" type="submit" title="Search products">
            Search
          </button>
        </form>

        <div className="retail-icons">

          <Link
            className={location.pathname.startsWith('/favorites') ? 'retail-icon-btn active' : 'retail-icon-btn'}
            to="/favorites"
            aria-label="Open favorites page"
            title="Favorites"
          >
            <HeaderIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </HeaderIcon>
            {favoriteCount > 0 ? <span className="retail-icon-badge">{favoriteCount > 99 ? '99+' : favoriteCount}</span> : null}
          </Link>

          <Link className="retail-icon-btn" to="/account" aria-label="User account" title="Profile">
            <HeaderIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 1 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </HeaderIcon>
          </Link>

          <button className="retail-cart-btn" type="button" onClick={handleOpenCart} aria-label="Open cart drawer" title="Cart">
            <HeaderIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2l1.5 4H20a1 1 0 0 1 1 1l-1.5 8a1 1 0 0 1-1 .8H9a1 1 0 0 1-1-.8L6 2z" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
            </HeaderIcon>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StoreHeader;
