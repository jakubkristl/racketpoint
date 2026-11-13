import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  clearClubPnlMonth,
  loadClubPnlStore,
  parseClubPnlSnapshot,
  setSelectedClubPnlMonth,
  upsertClubPnlSnapshot,
  type ClubPnlSnapshot,
} from '../data/clubPnlSnapshot';

export type OverviewAdminStats = {
  users: number;
  products: number;
  orders: number;
  revenueEur: number;
  orderStatuses: Array<{ status: string; count: number }>;
};

export type OverviewSalesStats = {
  itemsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  soldWithoutCost: number;
  bestsellers: Array<{ sku: string; quantity: number; name: string }>;
  monthlyProfit: Array<{ month: string; profit: number }>;
};

export type OverviewPaymentStats = {
  approvedCardOrders: number;
  cashOnDeliveryOrders: number;
  approvedVolume: number;
};

export type OverviewStockMovement = {
  id: string;
  sku: string;
  deltaQuantity: number;
  reason: string;
  orderId?: string;
  actor?: string;
  createdAt: string;
  productTitle?: string;
};

type AdminOverviewProps = {
  adminStats: OverviewAdminStats | null;
  salesStats: OverviewSalesStats;
  paymentStats: OverviewPaymentStats;
  stockMovements: OverviewStockMovement[];
  formatEur: (value: number) => string;
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function formatMonthLabel(month: string) {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  if (Number.isNaN(date.getTime())) {
    return month;
  }
  return date.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
}

function AdminOverview({
  adminStats,
  salesStats,
  paymentStats,
  stockMovements,
  formatEur,
}: AdminOverviewProps) {
  const [clubStore, setClubStore] = useState(() => loadClubPnlStore());
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const monthKey = currentMonthKey();

  const shopMonthProfit = useMemo(() => {
    return salesStats.monthlyProfit.find((entry) => entry.month === monthKey)?.profit ?? 0;
  }, [monthKey, salesStats.monthlyProfit]);

  const clubMonths = useMemo(
    () => Object.keys(clubStore.byMonth).sort((a, b) => b.localeCompare(a)),
    [clubStore.byMonth],
  );

  const clubSnapshot: ClubPnlSnapshot | null = clubStore.selectedMonth
    ? clubStore.byMonth[clubStore.selectedMonth] ?? null
    : null;

  const combinedHint = clubSnapshot
    ? shopMonthProfit + (clubSnapshot.month === monthKey ? clubSnapshot.netProfit : 0)
    : null;

  function handleImport(event: FormEvent) {
    event.preventDefault();
    setImportMessage('');

    try {
      const parsedJson = JSON.parse(importText) as unknown;
      const snapshot = parseClubPnlSnapshot(parsedJson);
      if (!snapshot) {
        setImportMessage('Невалиден JSON. Копирай месечния summary от reception POS Admin → Monthly P&L.');
        return;
      }

      const next = upsertClubPnlSnapshot(snapshot);
      setClubStore({ ...next });
      setImportText('');
      setImportMessage(`Зареден клуб P&L за ${formatMonthLabel(snapshot.month)}.`);
    } catch {
      setImportMessage('JSON не се парсна. Провери дали е копиран целият блок.');
    }
  }

  function handleClearClubMonth() {
    if (!clubStore.selectedMonth) {
      return;
    }
    const next = clearClubPnlMonth(clubStore.selectedMonth);
    setClubStore({ ...next });
    setImportMessage('Клубният snapshot е премахнат от този преглед (POS данните не се пипат).');
  }

  return (
    <div className="admin-overview">
      <header className="admin-overview-hero">
        <div>
          <p className="eyebrow">Един поглед</p>
          <h2>P&amp;L и статистики</h2>
          <p className="admin-overview-lede">
            Магазинът (RacketPoint) е на живо от поръчки. Клубът (Double Yellow POS) се показва след
            копиране на месечен summary — без дублиране на два източника на истина.
          </p>
        </div>
        <div className="admin-overview-legend">
          <span className="admin-overview-chip admin-overview-chip-shop">Магазин · поръчки</span>
          <span className="admin-overview-chip admin-overview-chip-club">Клуб · POS snapshot</span>
        </div>
      </header>

      <section className="admin-overview-glance" aria-label="At a glance">
        <article className="admin-overview-metric admin-overview-metric-shop">
          <p className="admin-overview-metric-label">Магазин · печалба ({formatMonthLabel(monthKey)})</p>
          <strong>{formatEur(shopMonthProfit)}</strong>
          <span>От поръчки с costEur. Онлайн + Sold onsite.</span>
        </article>
        <article className="admin-overview-metric admin-overview-metric-shop">
          <p className="admin-overview-metric-label">Магазин · печалба (всички месеци)</p>
          <strong>{formatEur(salesStats.profit)}</strong>
          <span>Приходи {formatEur(salesStats.revenue)} − себестойност {formatEur(salesStats.cost)}</span>
        </article>
        <article className="admin-overview-metric admin-overview-metric-club">
          <p className="admin-overview-metric-label">
            Клуб · нетен резултат{clubSnapshot ? ` (${formatMonthLabel(clubSnapshot.month)})` : ''}
          </p>
          <strong>{clubSnapshot ? formatEur(clubSnapshot.netProfit) : '—'}</strong>
          <span>
            {clubSnapshot
              ? `Приходи ${formatEur(clubSnapshot.revenue.total)} · Разходи ${formatEur(clubSnapshot.expenses.total)}`
              : 'Импортирай summary от POS Admin'}
          </span>
        </article>
        {combinedHint !== null && clubSnapshot?.month === monthKey ? (
          <article className="admin-overview-metric admin-overview-metric-combined">
            <p className="admin-overview-metric-label">Общо този месец (магазин + клуб)</p>
            <strong>{formatEur(combinedHint)}</strong>
            <span>Ориентир — двете сметки не се сливат автоматично в счетоводство.</span>
          </article>
        ) : null}
      </section>

      <section className="admin-overview-grid">
        <article className="admin-panel admin-overview-card">
          <p className="eyebrow">Магазин · RacketPoint</p>
          <h3>Продажби и марж</h3>
          <div className="admin-stats-grid">
            <article className="admin-stat-card">
              <h3>Продадени бр.</h3>
              <strong>{salesStats.itemsSold}</strong>
            </article>
            <article className="admin-stat-card">
              <h3>Приходи</h3>
              <strong>{formatEur(salesStats.revenue)}</strong>
            </article>
            <article className="admin-stat-card">
              <h3>Себестойност</h3>
              <strong>{formatEur(salesStats.cost)}</strong>
            </article>
            <article className="admin-stat-card">
              <h3>Печалба</h3>
              <strong>{formatEur(salesStats.profit)}</strong>
            </article>
          </div>

          <div className="admin-stats-grid">
            <article className="admin-stat-card">
              <h3>BORICA одобрени</h3>
              <strong>{paymentStats.approvedCardOrders}</strong>
            </article>
            <article className="admin-stat-card">
              <h3>BORICA обем</h3>
              <strong>{formatEur(paymentStats.approvedVolume)}</strong>
            </article>
            <article className="admin-stat-card">
              <h3>Наложен платеж</h3>
              <strong>{paymentStats.cashOnDeliveryOrders}</strong>
            </article>
            {adminStats ? (
              <article className="admin-stat-card">
                <h3>Поръчки (сървър)</h3>
                <strong>{adminStats.orders}</strong>
              </article>
            ) : null}
          </div>

          {adminStats ? (
            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <h3>Клиенти</h3>
                <strong>{adminStats.users}</strong>
              </article>
              <article className="admin-stat-card">
                <h3>Продукти в каталога</h3>
                <strong>{adminStats.products}</strong>
              </article>
              <article className="admin-stat-card">
                <h3>Приходи (сървър)</h3>
                <strong>{formatEur(adminStats.revenueEur)}</strong>
              </article>
              <article className="admin-stat-card">
                <h3>Статуси</h3>
                {adminStats.orderStatuses.length > 0 ? (
                  <ul className="admin-stat-list">
                    {adminStats.orderStatuses.map((row) => (
                      <li key={row.status}>{row.status}: {row.count}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-empty">Няма статуси.</p>
                )}
              </article>
            </div>
          ) : null}

          <div className="admin-stats-grid">
            <article className="admin-stat-card">
              <h3>Топ продукти</h3>
              {salesStats.bestsellers.length > 0 ? (
                <ul className="admin-stat-list">
                  {salesStats.bestsellers.map((item) => (
                    <li key={item.sku}>{item.name} ({item.quantity})</li>
                  ))}
                </ul>
              ) : (
                <p className="admin-empty">Няма достатъчно данни.</p>
              )}
            </article>
            <article className="admin-stat-card">
              <h3>Месечна печалба (магазин)</h3>
              {salesStats.monthlyProfit.length > 0 ? (
                <ul className="admin-stat-list">
                  {salesStats.monthlyProfit.slice(-8).map((item) => (
                    <li key={item.month}>{item.month}: {formatEur(item.profit)}</li>
                  ))}
                </ul>
              ) : (
                <p className="admin-empty">Няма месечни продажби.</p>
              )}
            </article>
          </div>

          {salesStats.soldWithoutCost > 0 ? (
            <p className="form-status">
              {salesStats.soldWithoutCost} продадени артикула са без себестойност — печалбата е завишена.
            </p>
          ) : null}
        </article>

        <article className="admin-panel admin-overview-card">
          <p className="eyebrow">Клуб · Double Yellow POS</p>
          <h3>Месечен P&amp;L (snapshot)</h3>
          <p className="admin-overview-note">
            Истинският клубски ledger е в reception POS (Admin → Monthly P&amp;L). Тук само преглед след
            „Copy for RacketPoint“. Не се пише обратно към POS.
          </p>

          {clubMonths.length > 0 ? (
            <label className="admin-overview-month">
              Месец
              <select
                value={clubStore.selectedMonth ?? ''}
                onChange={(event) => setClubStore({ ...setSelectedClubPnlMonth(event.target.value) })}
              >
                {clubMonths.map((month) => (
                  <option key={month} value={month}>{formatMonthLabel(month)}</option>
                ))}
              </select>
            </label>
          ) : null}

          {clubSnapshot ? (
            <>
              <div className="admin-stats-grid">
                <article className="admin-stat-card">
                  <h3>Приходи</h3>
                  <strong>{formatEur(clubSnapshot.revenue.total)}</strong>
                </article>
                <article className="admin-stat-card">
                  <h3>Разходи</h3>
                  <strong>{formatEur(clubSnapshot.expenses.total)}</strong>
                </article>
                <article className="admin-stat-card">
                  <h3>Нетен резултат</h3>
                  <strong className={clubSnapshot.netProfit >= 0 ? 'admin-overview-ok' : 'admin-overview-warn'}>
                    {formatEur(clubSnapshot.netProfit)}
                  </strong>
                </article>
                <article className="admin-stat-card">
                  <h3>Експортиран</h3>
                  <strong className="admin-overview-compact">
                    {new Date(clubSnapshot.exportedAt).toLocaleString('bg-BG')}
                  </strong>
                </article>
              </div>

              <div className="admin-stats-grid">
                <article className="admin-stat-card">
                  <h3>Разбивка приходи</h3>
                  <ul className="admin-stat-list">
                    <li>Услуги: {formatEur(clubSnapshot.revenue.serviceSales)}</li>
                    <li>Стока: {formatEur(clubSnapshot.revenue.stockSales)}</li>
                    <li>Multisport: {formatEur(clubSnapshot.revenue.multisport)}</li>
                    <li>Coolfit: {formatEur(clubSnapshot.revenue.coolfit)}</li>
                    <li>Club card: {formatEur(clubSnapshot.revenue.clubCard)}</li>
                    <li>Други: {formatEur(clubSnapshot.revenue.other)}</li>
                  </ul>
                </article>
                <article className="admin-stat-card">
                  <h3>Ключови разходи</h3>
                  <ul className="admin-stat-list">
                    <li>Наем: {formatEur(clubSnapshot.expenses.rent)}</li>
                    <li>Заплати: {formatEur(clubSnapshot.expenses.salary)}</li>
                    <li>Реклама: {formatEur(clubSnapshot.expenses.ads)}</li>
                    <li>COGS: {formatEur(clubSnapshot.expenses.stockCogs)}</li>
                    <li>Собствено ползване: {formatEur(clubSnapshot.expenses.ownConsumption)}</li>
                    <li>Други: {formatEur(clubSnapshot.expenses.other)}</li>
                  </ul>
                </article>
              </div>

              {clubSnapshot.ops ? (
                <div className="admin-stats-grid">
                  <article className="admin-stat-card">
                    <h3>Оперативни бележки</h3>
                    <ul className="admin-stat-list">
                      {typeof clubSnapshot.ops.racketsRented === 'number' ? (
                        <li>Наети ракети: {clubSnapshot.ops.racketsRented}</li>
                      ) : null}
                      {clubSnapshot.ops.bestSellerName ? (
                        <li>
                          Бестселър: {clubSnapshot.ops.bestSellerName}
                          {typeof clubSnapshot.ops.bestSellerQty === 'number' ? ` (${clubSnapshot.ops.bestSellerQty})` : ''}
                        </li>
                      ) : null}
                    </ul>
                  </article>
                </div>
              ) : null}

              <div className="admin-inline-actions">
                <button className="button button-secondary" type="button" onClick={handleClearClubMonth}>
                  Премахни този месец от прегледа
                </button>
              </div>
            </>
          ) : (
            <p className="admin-empty">
              Все още няма клубен snapshot. В reception POS → Unlock Admin → Monthly P&amp;L →
              „Copy for RacketPoint“, после постави JSON тук.
            </p>
          )}

          <form className="admin-overview-import" onSubmit={handleImport}>
            <label>
              Постави клубен P&amp;L JSON
              <textarea
                rows={5}
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder='{"schema":"double-yellow-club-pnl-v1", ...}'
              />
            </label>
            <button className="button button-primary" type="submit">
              Зареди snapshot
            </button>
          </form>
          {importMessage ? <p className="form-status">{importMessage}</p> : null}
        </article>
      </section>

      <article className="admin-panel admin-overview-card">
        <p className="eyebrow">Склад · RacketPoint</p>
        <h3>Последни движения</h3>
        {stockMovements.length > 0 ? (
          <div className="admin-order-list admin-overview-movements">
            {stockMovements.slice(0, 12).map((movement) => (
              <article className="admin-order-card" key={movement.id}>
                <h3>{movement.productTitle || movement.sku}</h3>
                <p>
                  {movement.deltaQuantity > 0 ? `+${movement.deltaQuantity}` : movement.deltaQuantity}
                  {' · '}
                  {movement.reason}
                </p>
                <p>{new Date(movement.createdAt).toLocaleString('bg-BG')}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty">Няма движения по склад все още.</p>
        )}
      </article>
    </div>
  );
}

export default AdminOverview;
