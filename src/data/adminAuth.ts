import { getSessionUser, login, logout } from './accountStore';

export function isAdminAuthenticated() {
  return getSessionUser()?.role === 'ADMIN';
}

export async function signInAdmin(email: string, password: string) {
  try {
    const user = await login(email.trim().toLowerCase(), password);

    if (user.role !== 'ADMIN') {
      logout();
      throw new Error('Този акаунт няма достъп до админ панела.');
    }

    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/invalid credentials/i.test(message)) {
      throw new Error('Невалиден имейл или парола.');
    }
    throw error;
  }
}

export function signOutAdmin() {
  logout();
}
