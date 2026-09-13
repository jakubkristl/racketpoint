import { Link } from 'react-router-dom';
import { legalCompany, legalDocuments } from '../data/legalDocs';

type StoreFooterProps = {
  onOpenCookieSettings?: () => void;
};

function StoreFooter({ onOpenCookieSettings }: StoreFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p className="eyebrow">Racketpoint.bg</p>
          <strong>{legalCompany.name}</strong>
          <p>Булстат {legalCompany.bulstat}</p>
          <p>{legalCompany.address}</p>
          <p>
            <a href={`mailto:${legalCompany.email}`}>{legalCompany.email}</a>
            {' · '}
            <a href={`mailto:${legalCompany.inboxEmail}`}>{legalCompany.inboxEmail}</a>
            {' · '}
            <a href={`tel:${legalCompany.phone.replace(/\s+/g, '')}`}>{legalCompany.phone}</a>
          </p>
        </div>

        <nav aria-label="Правна информация">
          <p className="eyebrow">Документи</p>
          {legalDocuments.map((document) => (
            <Link key={document.slug} to={`/${document.slug}`}>{document.title}</Link>
          ))}
          {onOpenCookieSettings ? (
            <button type="button" className="site-footer-cookie-btn" onClick={onOpenCookieSettings}>
              Настройки за бисквитки
            </button>
          ) : null}
        </nav>

        <nav aria-label="Магазин">
          <p className="eyebrow">Магазин</p>
          <Link to="/contact">Контакт</Link>
          <Link to="/account">Профил</Link>
          <Link to="/category/squash">Скуош</Link>
          <Link to="/category/tennis">Тенис</Link>
        </nav>
      </div>
    </footer>
  );
}

export default StoreFooter;
