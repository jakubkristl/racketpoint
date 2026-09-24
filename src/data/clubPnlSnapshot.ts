/** Club (Double Yellow POS) monthly P&L snapshot for the unified Admin overview.
 * Source of truth remains reception-pos localStorage; this is an ops paste/import mirror.
 */

export const CLUB_PNL_SNAPSHOT_STORAGE_KEY = 'rp-club-pnl-snapshots-v1';
export const CLUB_PNL_SNAPSHOT_SCHEMA = 'double-yellow-club-pnl-v1' as const;

export type ClubPnlSnapshot = {
  schema: typeof CLUB_PNL_SNAPSHOT_SCHEMA;
  source: 'reception-pos';
  month: string;
  exportedAt: string;
  revenue: {
    serviceSales: number;
    stockSales: number;
    multisport: number;
    coolfit: number;
    clubCard: number;
    other: number;
    total: number;
  };
  expenses: {
    rent: number;
    bookingGood: number;
    accountant: number;
    salary: number;
    ads: number;
    socialContributions: number;
    bankCommission: number;
    stockCogs: number;
    ownConsumption: number;
    other: number;
    total: number;
  };
  netProfit: number;
  ops?: {
    racketsRented?: number;
    bestSellerName?: string;
    bestSellerQty?: number;
  };
  paymentMix?: {
    cash: number;
    card: number;
    multisport: number;
    coolfit: number;
    clubCard: number;
  };
};

type ClubPnlStore = {
  byMonth: Record<string, ClubPnlSnapshot>;
  selectedMonth?: string;
};

function emptyStore(): ClubPnlStore {
  return { byMonth: {} };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function asNumber(value: unknown, fallback = 0): number {
  return isFiniteNumber(value) ? value : fallback;
}

export function parseClubPnlSnapshot(raw: unknown): ClubPnlSnapshot | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Partial<ClubPnlSnapshot> & { revenue?: Record<string, unknown>; expenses?: Record<string, unknown> };
  if (candidate.schema !== CLUB_PNL_SNAPSHOT_SCHEMA) {
    return null;
  }

  const month = String(candidate.month ?? '').trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const revenue = (candidate.revenue ?? {}) as Record<string, unknown>;
  const expenses = (candidate.expenses ?? {}) as Record<string, unknown>;

  return {
    schema: CLUB_PNL_SNAPSHOT_SCHEMA,
    source: 'reception-pos',
    month,
    exportedAt: String(candidate.exportedAt ?? new Date().toISOString()),
    revenue: {
      serviceSales: asNumber(revenue.serviceSales),
      stockSales: asNumber(revenue.stockSales),
      multisport: asNumber(revenue.multisport),
      coolfit: asNumber(revenue.coolfit),
      clubCard: asNumber(revenue.clubCard),
      other: asNumber(revenue.other),
      total: asNumber(revenue.total),
    },
    expenses: {
      rent: asNumber(expenses.rent),
      bookingGood: asNumber(expenses.bookingGood),
      accountant: asNumber(expenses.accountant),
      salary: asNumber(expenses.salary),
      ads: asNumber(expenses.ads),
      socialContributions: asNumber(expenses.socialContributions),
      bankCommission: asNumber(expenses.bankCommission),
      stockCogs: asNumber(expenses.stockCogs),
      ownConsumption: asNumber(expenses.ownConsumption),
      other: asNumber(expenses.other),
      total: asNumber(expenses.total),
    },
    netProfit: asNumber(candidate.netProfit),
    ops: candidate.ops && typeof candidate.ops === 'object' ? candidate.ops : undefined,
    paymentMix: candidate.paymentMix && typeof candidate.paymentMix === 'object'
      ? {
          cash: asNumber((candidate.paymentMix as Record<string, unknown>).cash),
          card: asNumber((candidate.paymentMix as Record<string, unknown>).card),
          multisport: asNumber((candidate.paymentMix as Record<string, unknown>).multisport),
          coolfit: asNumber((candidate.paymentMix as Record<string, unknown>).coolfit),
          clubCard: asNumber((candidate.paymentMix as Record<string, unknown>).clubCard),
        }
      : undefined,
  };
}

export function loadClubPnlStore(): ClubPnlStore {
  if (typeof window === 'undefined') {
    return emptyStore();
  }

  try {
    const raw = window.localStorage.getItem(CLUB_PNL_SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }

    const parsed = JSON.parse(raw) as ClubPnlStore;
    const byMonth: Record<string, ClubPnlSnapshot> = {};
    for (const [month, snapshot] of Object.entries(parsed.byMonth ?? {})) {
      const normalized = parseClubPnlSnapshot(snapshot);
      if (normalized) {
        byMonth[month] = normalized;
      }
    }

    return {
      byMonth,
      selectedMonth: parsed.selectedMonth && byMonth[parsed.selectedMonth]
        ? parsed.selectedMonth
        : Object.keys(byMonth).sort().at(-1),
    };
  } catch {
    return emptyStore();
  }
}

export function saveClubPnlStore(store: ClubPnlStore) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CLUB_PNL_SNAPSHOT_STORAGE_KEY, JSON.stringify(store));
}

export function upsertClubPnlSnapshot(snapshot: ClubPnlSnapshot): ClubPnlStore {
  const store = loadClubPnlStore();
  store.byMonth[snapshot.month] = snapshot;
  store.selectedMonth = snapshot.month;
  saveClubPnlStore(store);
  return store;
}

export function clearClubPnlMonth(month: string): ClubPnlStore {
  const store = loadClubPnlStore();
  delete store.byMonth[month];
  const months = Object.keys(store.byMonth).sort();
  store.selectedMonth = months.at(-1);
  saveClubPnlStore(store);
  return store;
}

export function setSelectedClubPnlMonth(month: string): ClubPnlStore {
  const store = loadClubPnlStore();
  if (store.byMonth[month]) {
    store.selectedMonth = month;
    saveClubPnlStore(store);
  }
  return store;
}
