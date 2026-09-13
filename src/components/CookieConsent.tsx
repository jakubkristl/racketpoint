import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyAnalyticsConsent,
  getCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice,
} from '../data/cookieConsent';

type CookieConsentProps = {
  forceOpen?: boolean;
  onCloseSettings?: () => void;
};

function CookieConsent({ forceOpen = false, onCloseSettings }: CookieConsentProps) {
  const [choice, setChoice] = useState<CookieConsentChoice | null>(() => getCookieConsent());
  const visible = forceOpen || choice === null;

  useEffect(() => {
    applyAnalyticsConsent(getCookieConsent());
  }, []);

  if (!visible) {
    return null;
  }

  function decide(next: CookieConsentChoice) {
    saveCookieConsent(next);
    setChoice(next);
    onCloseSettings?.();
  }

  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-banner-title" aria-live="polite">
      <div className="cookie-banner-copy">
        <p className="eyebrow">Бисквитки</p>
        <h2 id="cookie-banner-title">Използваме бисквитки за магазина и статистика</h2>
        <p>
          Необходимите бисквитки държат количката и входа. Аналитичните (Google Analytics) се включват
          само ако приемете. Вижте <Link to="/cookies">Политиката за бисквитки</Link> и <Link to="/privacy">Политиката за поверителност</Link>.
        </p>
      </div>
      <div className="cookie-banner-actions">
        <button className="button button-primary" type="button" onClick={() => decide('all')}>
          Приемам всички
        </button>
        <button className="button button-secondary" type="button" onClick={() => decide('necessary')}>
          Само необходими
        </button>
      </div>
    </div>
  );
}

export default CookieConsent;
