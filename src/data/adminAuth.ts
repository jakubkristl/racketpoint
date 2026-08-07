const authKey = 'racketpoint-admin-auth';

function allowFrontendAdminPassword() {
  return import.meta.env.DEV || import.meta.env.VITE_ENABLE_FRONTEND_ADMIN_PASSWORD === 'true';
}

function hasWindow() {
  return typeof window !== 'undefined';
}

function readPassword() {
  if (!allowFrontendAdminPassword()) {
    return '';
  }

  return import.meta.env.VITE_ADMIN_PASSWORD?.trim() || '';
}

export function isAdminAuthenticated() {
  if (!hasWindow()) {
    return false;
  }

  return window.sessionStorage.getItem(authKey) === 'true';
}

export function signInAdmin(password: string) {
  const configuredPassword = readPassword();
  if (!configuredPassword) {
    return false;
  }

  const isValid = password.trim() === configuredPassword;

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
  if (!allowFrontendAdminPassword()) {
    return 'Frontend admin password unlock is disabled in production.';
  }

  return import.meta.env.VITE_ADMIN_PASSWORD
    ? 'Конфигурирана в VITE_ADMIN_PASSWORD'
    : 'VITE_ADMIN_PASSWORD is required for frontend admin unlock.';
}
