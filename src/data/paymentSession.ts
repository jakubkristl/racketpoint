import type { OrderInput } from './store';

type PendingPaymentOrder = {
  order: string;
  amount: number;
  createdAt: string;
  request: OrderInput;
};

const pendingPaymentStorageKey = 'racketpoint-borica-pending-v1';

function hasWindow() {
  return typeof window !== 'undefined';
}

function loadAll(): PendingPaymentOrder[] {
  if (!hasWindow()) {
    return [];
  }

  const raw = window.localStorage.getItem(pendingPaymentStorageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PendingPaymentOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(items: PendingPaymentOrder[]) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(pendingPaymentStorageKey, JSON.stringify(items));
}

export function savePendingBoricaOrder(order: string, amount: number, request: OrderInput) {
  const current = loadAll().filter((item) => item.order !== order);
  current.unshift({ order, amount, request, createdAt: new Date().toISOString() });
  saveAll(current.slice(0, 40));
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
