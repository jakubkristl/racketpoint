export type AccountRole = 'USER' | 'ADMIN';

export type AccountAddress = {
  id: string;
  label: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
};

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  addresses: AccountAddress[];
};

type LocalAccountRecord = AccountUser & {
  password: string;
};

const sessionTokenKey = 'racketpoint-session-token-v1';
const sessionKey = 'racketpoint-session-user-v1';
const localUsersKey = 'racketpoint-local-users-v1';

function allowLocalAuthFallback() {
  return import.meta.env.VITE_ENABLE_LOCAL_AUTH_FALLBACK === 'true';
}

function allowClientBootstrapCall() {
  return import.meta.env.VITE_ENABLE_CLIENT_BOOTSTRAP === 'true';
}

function hasWindow() {
  return typeof window !== 'undefined';
}

function writeSession(user: AccountUser | null, token?: string | null) {
  if (!hasWindow()) {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(sessionKey);
    window.localStorage.removeItem(sessionTokenKey);
    return;
  }

  window.localStorage.setItem(sessionKey, JSON.stringify(user));

  if (token) {
    window.localStorage.setItem(sessionTokenKey, token);
  }
}

function readStoredSessionUser() {
  if (!hasWindow()) {
    return null;
  }

  const raw = window.localStorage.getItem(sessionKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AccountUser;
    return parsed && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export function getSessionToken() {
  if (!hasWindow()) {
    return null;
  }

  return window.localStorage.getItem(sessionTokenKey);
}

export function getAuthHeaders(extra?: Record<string, string>) {
  const token = getSessionToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeAddress(value: unknown, index: number): AccountAddress | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' && record.id ? record.id : `ADR-${index + 1}`;
  const label = typeof record.label === 'string' ? record.label : 'Address';
  const street = typeof record.street === 'string' ? record.street : '';
  const city = typeof record.city === 'string' ? record.city : '';
  const zipCode = typeof record.zipCode === 'string' ? record.zipCode : '';
  const country = typeof record.country === 'string' ? record.country : 'Bulgaria';

  return { id, label, street, city, zipCode, country };
}

function normalizeUser(value: unknown): AccountUser {
  const record = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const addresses = Array.isArray(record.addresses)
    ? record.addresses
      .map((address, index) => normalizeAddress(address, index))
      .filter((address): address is AccountAddress => Boolean(address))
    : [];

  return {
    id: typeof record.id === 'string' ? record.id : '',
    name: typeof record.name === 'string' ? record.name : '',
    email: typeof record.email === 'string' ? record.email : '',
    role: record.role === 'ADMIN' ? 'ADMIN' : 'USER',
    addresses,
  };
}

function readLocalUsers() {
  if (!hasWindow()) {
    return [] as LocalAccountRecord[];
  }

  const raw = window.localStorage.getItem(localUsersKey);
  if (!raw) {
    return [] as LocalAccountRecord[];
  }

  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) {
      return [] as LocalAccountRecord[];
    }

    return parsed
      .map((item) => {
        const user = normalizeUser(item);
        const password = typeof item.password === 'string' ? item.password : '';
        if (!user.id || !user.email || !password) {
          return null;
        }

        return {
          ...user,
          password,
        };
      })
      .filter((item): item is LocalAccountRecord => Boolean(item));
  } catch {
    return [] as LocalAccountRecord[];
  }
}

function writeLocalUsers(users: LocalAccountRecord[]) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(localUsersKey, JSON.stringify(users));
}

function findLocalUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return readLocalUsers().find((user) => user.email.toLowerCase() === normalized) ?? null;
}

function localSessionToken(userId: string) {
  return `local-${userId}`;
}

function isLocalSessionToken(token: string | null) {
  return Boolean(token && token.startsWith('local-'));
}

async function parseApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

async function parseApiResponseOrStatus<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  return { payload, hasErrorMessage: typeof payload.error === 'string' && payload.error.length > 0 };
}

export async function ensureSeededAdminUser() {
  if (!allowClientBootstrapCall()) {
    return;
  }

  try {
    await fetch('/api/system/bootstrap', {
      method: 'POST',
      headers: {
        'x-bootstrap-key': import.meta.env.VITE_BOOTSTRAP_API_KEY?.trim() || '',
      },
    });
  } catch {
    // Ignore bootstrap errors in local preview.
  }
}

type AuthPayload = {
  token: string;
  user: unknown;
};

type ProfilePayload = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  addresses?: unknown[];
};

async function authenticate(path: '/api/auth/login' | '/api/auth/register', body: Record<string, unknown>) {
  const email = String(body.email ?? '').trim().toLowerCase();
  const name = String(body.name ?? '').trim();
  const password = String(body.password ?? '');
  const apiUnavailableToken = '__API_UNAVAILABLE__';

  try {
    await ensureSeededAdminUser();
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const { payload, hasErrorMessage } = await parseApiResponseOrStatus<AuthPayload>(response);
    if (response.ok) {
      const user = normalizeUser(payload.user);
      writeSession(user, payload.token);
      return user;
    }

    const backendUnavailable = response.status === 404 || response.status === 405 || (response.status >= 500 && !hasErrorMessage);
    if (backendUnavailable) {
      throw new Error(apiUnavailableToken);
    }

    throw new Error(payload.error || 'Request failed.');
  } catch (error) {
    // Preserve backend validation/auth errors; fallback only for unavailable API/network.
    if (error instanceof TypeError) {
      // Network or CORS style fetch failure -> fallback below.
    } else if (error instanceof Error && error.message !== apiUnavailableToken) {
      throw error;
    }
  }

  if (!allowLocalAuthFallback()) {
    throw new Error('Authentication service is unavailable. Please try again shortly.');
  }

  if (path === '/api/auth/register') {
    if (!name || !email || password.length < 8) {
      throw new Error('Name, email and password (min 8 chars) are required.');
    }

    if (findLocalUserByEmail(email)) {
      throw new Error('Account already exists.');
    }

    const localUser: LocalAccountRecord = {
      id: `usr_${Date.now().toString(36)}`,
      name,
      email,
      role: 'USER',
      addresses: [],
      password,
    };

    const users = readLocalUsers();
    users.push(localUser);
    writeLocalUsers(users);

    const sessionUser = normalizeUser(localUser);
    writeSession(sessionUser, localSessionToken(sessionUser.id));
    return sessionUser;
  }

  const localUser = findLocalUserByEmail(email);
  if (!localUser || localUser.password !== password) {
    throw new Error('Invalid email or password.');
  }

  const sessionUser = normalizeUser(localUser);
  writeSession(sessionUser, localSessionToken(sessionUser.id));
  return sessionUser;
}

export async function signup(name: string, email: string, password: string) {
  return authenticate('/api/auth/register', {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function login(email: string, password: string) {
  return authenticate('/api/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  });
}

export function logout() {
  writeSession(null);
}

export function getSessionUser() {
  return readStoredSessionUser();
}

export async function refreshProfile() {
  const token = getSessionToken();
  const sessionUser = getSessionUser();

  if (isLocalSessionToken(token) && sessionUser) {
    const localUser = readLocalUsers().find((user) => user.id === sessionUser.id) ?? null;
    const normalized = normalizeUser(localUser ?? sessionUser);
    writeSession(normalized, token);
    return normalized;
  }

  try {
    const response = await fetch('/api/auth/profile', {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const payload = await parseApiResponse<ProfilePayload>(response);
    const user = normalizeUser(payload);
    writeSession(user, token);
    return user;
  } catch {
    if (sessionUser) {
      return sessionUser;
    }
    throw new Error('Request failed.');
  }
}

export async function updateProfile(updates: Partial<Pick<AccountUser, 'name' | 'addresses'>>) {
  const token = getSessionToken();
  const sessionUser = getSessionUser();

  if (isLocalSessionToken(token) && sessionUser) {
    const users = readLocalUsers();
    const index = users.findIndex((user) => user.id === sessionUser.id);
    if (index === -1) {
      throw new Error('User profile not found.');
    }

    const nextUser: LocalAccountRecord = {
      ...users[index],
      name: typeof updates.name === 'string' ? updates.name.trim() || users[index].name : users[index].name,
      addresses: Array.isArray(updates.addresses) ? updates.addresses : users[index].addresses,
    };

    users[index] = nextUser;
    writeLocalUsers(users);

    const normalized = normalizeUser(nextUser);
    writeSession(normalized, token);
    return normalized;
  }

  const response = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(updates),
  });

  const payload = await parseApiResponse<ProfilePayload>(response);
  const user = normalizeUser(payload);
  writeSession(user, token);
  return user;
}

export async function requestPasswordReset(email: string) {
  const response = await fetch('/api/auth/request-password-reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  const payload = await parseApiResponse<{ message: string; url?: string }>(response);
  return payload;
}

export async function resetPassword(token: string, newPassword: string) {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: token.trim(),
      newPassword,
    }),
  });

  const payload = await parseApiResponse<{ message: string }>(response);
  return payload;
}

export async function verifyEmailToken(token: string) {
  const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token.trim())}`, {
    method: 'GET',
  });

  const payload = await parseApiResponse<{ message: string }>(response);
  return payload;
}

export async function resendVerificationEmail(email: string) {
  const response = await fetch('/api/auth/resend-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  const payload = await parseApiResponse<{ message: string }>(response);
  return payload;
}
