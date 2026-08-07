import type { OrderInput } from './store';

type PendingPaymentOrder = {
  order: string;
  amount: number;
  createdAt: string;
  request: OrderInput;
};

const pendingPaymentStorageKey = 'racketpoint-borica-pending-v1';
const pendingPaymentMaxAgeMs = 2 * 60 * 60 * 1000;

function hasWindow() {
  return typeof window !== 'undefined';
}

function loadAll(): PendingPaymentOrder[] {
  if (!hasWindow()) {
    return [];
  }

  const raw = window.sessionStorage.getItem(pendingPaymentStorageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PendingPaymentOrder[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    const now = Date.now();
    const fresh = parsed.filter((item) => {
      const created = new Date(item.createdAt).getTime();
      return Number.isFinite(created) && now - created <= pendingPaymentMaxAgeMs;
    });

    if (fresh.length !== parsed.length) {
      saveAll(fresh);
    }

    return fresh;
  } catch {
    return [];
  }
}

function saveAll(items: PendingPaymentOrder[]) {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.setItem(pendingPaymentStorageKey, JSON.stringify(items));
}

export function savePendingBoricaOrder(order: string, amount: number, request: OrderInput) {
  const current = loadAll().filter((item) => item.order !== order);
  current.unshift({ order, amount, request, createdAt: new Date().toISOString() });
  saveAll(current.slice(0, 12));
}

export function getPendingBoricaOrder(order: string): PendingPaymentOrder | null {
  return loadAll().find((item) => item.order === order) ?? null;
}

export function removePendingBoricaOrder(order: string) {
  const next = loadAll().filter((item) => item.order !== order);
  saveAll(next);
}

export function consumePendingBoricaOrder(order: string): PendingPaymentOrder | null {
  const current = loadAll();
  const matched = current.find((item) => item.order === order) ?? null;

  if (!matched) {
    return null;
  }

  const next = current.filter((item) => item.order !== order);
  saveAll(next);
  return matched;
}
