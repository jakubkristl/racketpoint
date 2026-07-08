import React, { useState, useEffect } from 'react';

interface AdminTab {
  id: string;
  label: string;
  labelBg: string;
  icon: string;
}

const ADMIN_TABS: AdminTab[] = [
  { id: 'dashboard', label: 'Dashboard', labelBg: 'Панел', icon: '📊' },
  { id: 'orders', label: 'Orders', labelBg: 'Поръчки', icon: '📦' },
  { id: 'users', label: 'Users', labelBg: 'Потребители', icon: '👥' },
  { id: 'products', label: 'Products', labelBg: 'Продукти', icon: '📦' },
  { id: 'analytics', label: 'Analytics', labelBg: 'Анализи', icon: '📈' },
];

interface AdminCRMProps {
  userRole?: string;
  language?: 'bg' | 'en';
}

function AdminCRM({ userRole = 'user', language = 'bg' }: AdminCRMProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is admin
  if (userRole !== 'admin') {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: '400px' }}>
        <p style={{ fontSize: '1.2rem', color: '#5f5a52' }}>
          {language === 'bg' ? 'Немате достъп до администраторския панел' : 'You do not have access to the admin panel'}
        </p>
      </div>
    );
  }

  const fetchAdminData = async (tab: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('racketpoint-auth-token');
      const response = await fetch(`/api/admin/${tab}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (tab === 'orders') setOrders(data);
        if (tab === 'users') setUsers(data);
        if (tab === 'products') setProducts(data);
        if (tab === 'dashboard') setStats(data);
      }
    } catch (error) {
      console.error(`Error fetching ${tab}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData(activeTab);
  }, [activeTab]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4efe6' }}>
      {/* Admin Header */}
      <div style={{ 
        backgroundColor: '#0b6b57', 
        color: 'white', 
        padding: '20px',
        borderBottom: '2px solid var(--border)'
      }}>
        <h1 style={{ margin: '0', fontSize: '1.8rem' }}>
          {language === 'bg' ? 'Администраторски Панел' : 'Admin Panel'}
        </h1>
        <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
          {language === 'bg' ? 'Управление на магазин и поръчки' : 'Manage store and orders'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'white',
        overflowX: 'auto',
      }}>
        {ADMIN_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '16px 20px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#0b6b57' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#5f5a52',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: activeTab === tab.id ? 600 : 500,
              borderBottom: activeTab === tab.id ? '3px solid #d5a94d' : 'none',
              transition: 'all 140ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ marginRight: '8px' }}>{tab.icon}</span>
            {language === 'bg' ? tab.labelBg : tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5f5a52' }}>
            {language === 'bg' ? 'Зареждане...' : 'Loading...'}
          </div>
        )}

        {!isLoading && activeTab === 'dashboard' && (
          <DashboardTab language={language} stats={stats} />
        )}

        {!isLoading && activeTab === 'orders' && (
          <OrdersTab language={language} orders={orders} />
        )}

        {!isLoading && activeTab === 'users' && (
          <UsersTab language={language} users={users} />
        )}

        {!isLoading && activeTab === 'products' && (
          <ProductsTab language={language} products={products} />
        )}

        {!isLoading && activeTab === 'analytics' && (
          <AnalyticsTab language={language} stats={stats} />
        )}
      </div>
    </div>
  );
}

function DashboardTab({ language, stats }: any) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>
        {language === 'bg' ? 'Преглед' : 'Overview'}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <StatCard 
          label={language === 'bg' ? 'Общо Поръчки' : 'Total Orders'}
          value={stats.totalOrders || 0}
          icon='📦'
        />
        <StatCard 
          label={language === 'bg' ? 'Общ Доход' : 'Total Revenue'}
          value={`${(stats.totalRevenue || 0).toFixed(2)} BGN`}
          icon='💰'
        />
        <StatCard 
          label={language === 'bg' ? 'Активни Потребители' : 'Active Users'}
          value={stats.activeUsers || 0}
          icon='👥'
        />
        <StatCard 
          label={language === 'bg' ? 'Продукти в Склад' : 'Products in Stock'}
          value={stats.productsInStock || 0}
          icon='📊'
        />
      </div>
    </div>
  );
}

function OrdersTab({ language, orders }: any) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>
        {language === 'bg' ? 'Поръчки' : 'Orders'} ({orders.length})
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f0f0f0' }}>
            <tr>
              <th style={tableHeaderStyle}>{language === 'bg' ? 'Номер' : 'Number'}</th>
              <th style={tableHeaderStyle}>{language === 'bg' ? 'Клиент' : 'Customer'}</th>
              <th style={tableHeaderStyle}>{language === 'bg' ? 'Сума' : 'Total'}</th>
              <th style={tableHeaderStyle}>{language === 'bg' ? 'Статус' : 'Status'}</th>
              <th style={tableHeaderStyle}>{language === 'bg' ? 'Дата' : 'Date'}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#5f5a52' }}>
                  {language === 'bg' ? 'Няма поръчки' : 'No orders'}
                </td>
              </tr>
            ) : (
              orders.map((order: any) => (
                <tr key={order._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tableCellStyle}>{order.orderNumber}</td>
                  <td style={tableCellStyle}>{order.customerName}</td>
                  <td style={tableCellStyle}>{order.total.toFixed(2)} BGN</td>
                  <td style={tableCellStyle}>
                    <StatusBadge status={order.status} language={language} />
                  </td>
                  <td style={tableCellStyle}>{new Date(order.createdAt).toLocaleDateString('bg-BG')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ language, users }: any) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>
        {language === 'bg' ? 'Потребители' : 'Users'} ({users.length})
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f0f0f0' }}>
            <tr>
              <th style={tableHeaderStyle}>{language === 'bg' ? 'Имейл' : 'Email'}</th>
              <th style={tableHeaderStyle}>{language === 'bg' ? 'Име' : 'Name'}</th>
              <th style={tableHeaderStyle}>{language === 'bg' ? 'Поръчки' : 'Orders'}</th>
              <th style={tableHeaderStyle}>{language === 'bg' ? 'Регистриран' : 'Registered'}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#5f5a52' }}>
                  {language === 'bg' ? 'Няма потребители' : 'No users'}
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr key={user._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tableCellStyle}>{user.email}</td>
                  <td style={tableCellStyle}>{user.name}</td>
                  <td style={tableCellStyle}>{user.orderCount || 0}</td>
                  <td style={tableCellStyle}>{new Date(user.createdAt).toLocaleDateString('bg-BG')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsTab({ language, products }: any) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>
        {language === 'bg' ? 'Продукти' : 'Products'} ({products.length})
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {products.length === 0 ? (
          <div style={{ padding: '40px', color: '#5f5a52', gridColumn: '1 / -1' }}>
            {language === 'bg' ? 'Няма продукти' : 'No products'}
          </div>
        ) : (
          products.map((product: any) => (
            <div 
              key={product._id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'white'
              }}
            >
              <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>{product.nameBg || product.name}</h4>
              <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#5f5a52' }}>
                {product.priceBgn} BGN
              </p>
              <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#5f5a52' }}>
                {language === 'bg' ? 'Склад:' : 'Stock:'} <strong>{product.stock}</strong>
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AnalyticsTab({ language, stats }: any) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>
        {language === 'bg' ? 'Анализи' : 'Analytics'}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <AnalyticsCard
          label={language === 'bg' ? 'Средна Стойност Поръчка' : 'Average Order Value'}
          value={`${(stats.avgOrderValue || 0).toFixed(2)} BGN`}
          trend={stats.orderTrend}
        />
        <AnalyticsCard
          label={language === 'bg' ? 'Конверсионен Процент' : 'Conversion Rate'}
          value={`${(stats.conversionRate || 0).toFixed(1)}%`}
          trend={stats.conversionTrend}
        />
        <AnalyticsCard
          label={language === 'bg' ? 'Средна Брой Артикули' : 'Items per Order'}
          value={(stats.avgItemsPerOrder || 0).toFixed(1)}
          trend={stats.itemsTrend}
        />
        <AnalyticsCard
          label={language === 'bg' ? 'Повторни Клиенти' : 'Returning Customers'}
          value={`${(stats.returningCustomerRate || 0).toFixed(1)}%`}
          trend={stats.loyaltyTrend}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{icon}</div>
      <p style={{ margin: '0 0 8px', color: '#5f5a52', fontSize: '0.9rem' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#0b6b57' }}>{value}</p>
    </div>
  );
}

function AnalyticsCard({ label, value, trend }: any) {
  const trendColor = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#5f5a52';
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <p style={{ margin: '0 0 12px', color: '#5f5a52', fontSize: '0.9rem' }}>{label}</p>
      <p style={{ margin: '0 0 8px', fontSize: '1.8rem', fontWeight: 700, color: '#0b6b57' }}>{value}</p>
      {trend !== undefined && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: trendColor, fontWeight: 600 }}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status, language }: any) {
  const statusMap: any = {
    pending: { bg: '#fbbf24', text: 'bg-yellow-600', bgBg: '#fbbf24', textBg: 'Чакаща' },
    paid: { bg: '#10b981', text: 'bg-green-600', bgBg: '#10b981', textBg: 'Платена' },
    shipped: { bg: '#3b82f6', text: 'bg-blue-600', bgBg: '#3b82f6', textBg: 'Изпратена' },
    delivered: { bg: '#8b5cf6', text: 'bg-purple-600', bgBg: '#8b5cf6', textBg: 'Доставена' },
    cancelled: { bg: '#ef4444', text: 'bg-red-600', bgBg: '#ef4444', textBg: 'Отменена' },
  };

  const config = statusMap[status];
  if (!config) return <span>{status}</span>;

  return (
    <span style={{
      backgroundColor: config.bg,
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.85rem',
      fontWeight: 600,
    }}>
      {language === 'bg' ? config.textBg : status}
    </span>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '0.9rem',
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '0.9rem',
};

export default AdminCRM;
