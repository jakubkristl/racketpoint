export const COOKIE_CONSENT_KEY = 'racketpoint-cookie-consent-v1';
export const COOKIE_CONSENT_EVENT = 'racketpoint:cookie-consent-changed';

export type CookieConsentChoice = 'necessary' | 'all';

type ConsentRecord = {
  choice: CookieConsentChoice;
  savedAt: string;
};

const CONSENT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180;

function isConsentRecord(value: unknown): value is ConsentRecord {
  return Boolean(
    value
    && typeof value === 'object'
    && 'choice' in value
    && (value.choice === 'necessary' || value.choice === 'all')
    && 'savedAt' in value
    && typeof value.savedAt === 'string',
  );
}

export function getCookieConsent(): CookieConsentChoice | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isConsentRecord(parsed)) {
      return null;
    }

    const savedAt = Date.parse(parsed.savedAt);
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > CONSENT_MAX_AGE_MS) {
      return null;
    }

    return parsed.choice;
  } catch {
    return null;
  }
}

export function saveCookieConsent(choice: CookieConsentChoice) {
  const record: ConsentRecord = {
    choice,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
  applyAnalyticsConsent(choice);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: choice }));
}

export function applyAnalyticsConsent(choice: CookieConsentChoice | null) {
  const granted = choice === 'all';
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;

  if (typeof gtag !== 'function') {
    return;
  }

  gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}
