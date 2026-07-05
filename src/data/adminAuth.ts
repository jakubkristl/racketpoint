const authKey = 'racketpoint-admin-auth';

function hasWindow() {
  return typeof window !== 'undefined';
}

function readPassword() {
  return import.meta.env.VITE_ADMIN_PASSWORD?.trim() || 'racketpoint-admin';
}

export function isAdminAuthenticated() {
  if (!hasWindow()) {
    return false;
  }

  return window.sessionStorage.getItem(authKey) === 'true';
}

export function signInAdmin(password: string) {
  const isValid = password.trim() === readPassword();

  if (hasWindow() && isValid) {
    window.sessionStorage.setItem(authKey, 'true');
  }

  return isValid;
}

export function signOutAdmin() {
  if (hasWindow()) {
    window.sessionStorage.removeItem(authKey);
  }
}

export function getAdminPasswordHint() {
  return import.meta.env.VITE_ADMIN_PASSWORD
    ? 'Конфигурирана в VITE_ADMIN_PASSWORD'
    : 'Парола по подразбиране: racketpoint-admin';
}
