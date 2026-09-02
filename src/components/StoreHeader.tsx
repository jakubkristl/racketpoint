import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { getFavoriteSkus } from '../data/favorites';
import { getSubcategoriesForSport } from '../data/subcategories';

type StoreHeaderProps = {
  activeSportSlug?: string;
};

type NavItem = {
  key: string;
  label: string;
  to: string;
  iconPath?: string;
};

const navOrder: NavItem[] = [
  { key: 'squash', label: 'Скуош', to: '/category/squash', iconPath: '/branding/navigation/thumbnails/squash.png' },
  { key: 'badminton', label: 'Бадминтон', to: '/category/badminton', iconPath: '/branding/navigation/thumbnails/badminton.png' },
  { key: 'padel', label: 'Падел', to: '/category/padel', iconPath: '/branding/navigation/thumbnails/padel.png' },
  { key: 'table-tennis', label: 'Тенис на маса', to: '/category/table-tennis', iconPath: '/branding/navigation/thumbnails/table-tennis.png' },
  { key: 'tennis', label: 'Тенис', to: '/category/tennis', iconPath: '/branding/navigation/thumbnails/tennis.png' },
  { key: 'contact', label: 'Контакт', to: '/contact' },
];

function HeaderIcon({ children }: { children: ReactNode }) {
  return <span className="retail-icon-svg" aria-hidden="true">{children}</span>;
}

function StoreHeader({ activeSportSlug }: StoreHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSearch = new URLSearchParams(location.search).get('q') ?? '';
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [favoriteCount, setFavoriteCount] = useState(() => getFavoriteSkus().length);
  const [openSport, setOpenSport] = useState<string | null>(null);

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
        <Link className="retail-logo-link" to="/" aria-label="Към началната страница">
          <BrandLogo compact subtitle="" />
        </Link>

        <nav className="retail-links" aria-label="Основна навигация">
          {navOrder.map((item) => {
            const isActive = item.key === activeSportSlug || (item.key === 'contact' && location.pathname === '/contact');
            const hasSubcategories = item.key !== 'contact';
            const subcategories = hasSubcategories ? getSubcategoriesForSport(item.key) : [];

            return (
              <div
                className="retail-nav-item"
                key={item.key}
                onMouseEnter={() => setOpenSport(item.key)}
                onMouseLeave={() => setOpenSport(null)}
                onFocus={() => setOpenSport(item.key)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpenSport(null);
                  }
                }}
              >
                <Link
                  className={isActive ? 'retail-link active' : 'retail-link'}
                  to={item.to}
                >
                  {item.iconPath ? (
                    <img
                      className="retail-link-thumb"
                      src={item.iconPath}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span>{item.label}</span>
                </Link>

                {hasSubcategories && openSport === item.key ? (
                  <div className="retail-mega-menu" aria-label={`${item.label} подкатегории`}>
                    {subcategories.map((subcategory) => (
                      <Link
                        className="retail-mega-link"
                        key={`${item.key}-${subcategory.slug}`}
                        to={`${item.to}?sub=${encodeURIComponent(subcategory.slug)}`}
                      >
                        <img
                          src={subcategory.imageUrl}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          onError={(event) => {
                            const target = event.currentTarget;
                            if (target.src === subcategory.fallbackImageUrl) {
                              return;
                            }
                            target.src = subcategory.fallbackImageUrl;
                          }}
                        />
                        <span>{subcategory.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <form className="store-search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Търсене..."
            aria-label="Търсене на продукти"
          />
          <button className="header-icon-btn" type="submit" title="Търсене на продукти">
            Търси
          </button>
        </form>

        <div className="retail-icons">

          <Link
            className={location.pathname.startsWith('/favorites') ? 'retail-icon-btn active' : 'retail-icon-btn'}
            to="/favorites"
            aria-label="Отвори любими"
            title="Любими"
          >
            <HeaderIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </HeaderIcon>
            {favoriteCount > 0 ? <span className="retail-icon-badge">{favoriteCount > 99 ? '99+' : favoriteCount}</span> : null}
          </Link>

          <Link className="retail-icon-btn" to="/account" aria-label="Потребителски профил" title="Профил">
            <HeaderIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 1 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </HeaderIcon>
          </Link>

          <button className="retail-cart-btn" type="button" onClick={handleOpenCart} aria-label="Отвори количката" title="Количка">
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
