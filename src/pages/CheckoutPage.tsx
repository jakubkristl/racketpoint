import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Product } from '../data/catalog';
import { submitOrderRequest } from '../data/store';
import { savePendingBoricaOrder } from '../data/paymentSession';

type CartLine = {
  sku: string;
  quantity: number;
};

type CheckoutPageProps = {
  products: Product[];
  lines: CartLine[];
  onIncrement: (sku: string) => void;
  onDecrement: (sku: string) => void;
  onRemove: (sku: string) => void;
  onClear: () => void;
};

const deliveryChoices = [
  { value: 'econt', title: 'Еконт', badge: 'EC', note: 'Куриерска доставка. Интеграцията предстои.' },
  { value: 'speedy', title: 'Спиди', badge: 'SP', note: 'Куриерска доставка. Интеграцията предстои.' },
  { value: 'pickup', title: 'Вземане от магазин', badge: 'PU', note: 'Вземане от физически обект.' },
] as const;

const paymentChoices = [
  { value: 'cash_on_delivery', title: 'Наложен платеж', badge: 'COD', note: 'Плащане при получаване на поръчката.' },
] as const;

function parsePrice(price: string) {
  const normalized = price.replace(/[^\d,.-]/g, '').replace(',', '.');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

function postToGateway(actionUrl: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;

  for (const [key, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

function CheckoutPage({ products, lines, onIncrement, onDecrement, onRemove, onClear }: CheckoutPageProps) {
  const location = useLocation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'econt' | 'speedy' | 'pickup'>('econt');
  const [paymentOption, setPaymentOption] = useState<'cash_on_delivery'>('cash_on_delivery');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const cartItems = useMemo(() => {
    const productBySku = new Map(products.map((product) => [product.sku, product] as const));
    const items: Array<{ sku: string; quantity: number; product: Product; lineTotal: number }> = [];

    for (const line of lines) {
      const product = productBySku.get(line.sku);
      if (!product) {
        continue;
      }
      const price = product.priceEur || parsePrice(product.price || '0');
      items.push({
        ...line,
        product,
        lineTotal: price * line.quantity,
      });
    }

    return items;
  }, [lines, products]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  useEffect(() => {
    if (location.search.includes('checkout=retry')) {
      setStatus('Плащането не беше завършено. Прегледайте поръчката и опитайте отново.');
    }
  }, [location.search]);

  async function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cartItems.length === 0) {
      setStatus('Добавете поне един продукт, преди да направите поръчка.');
      return;
    }

    const deliveryLabel = deliveryOption === 'econt'
      ? 'Еконт'
      : deliveryOption === 'speedy'
        ? 'Спиди'
        : 'Вземане от магазин';

    const paymentLabel = 'Наложен платеж';
    const paymentMethod = paymentOption;

    const orderNotes = [
      `Телефон: ${phone}`,
      `Град: ${city}`,
      `Адрес: ${address}`,
      `Опция за доставка: ${deliveryLabel}`,
      `Опция за плащане: ${paymentLabel}`,
      notes ? `Бележки: ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const orderRequest = {
      fullName,
      email,
      items: cartItems.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        priceEur: item.product.priceEur,
      })),
      billingAddress: { city, address, phone },
      paymentMethod,
      notes: orderNotes,
    } as const;

    if (paymentMethod === 'cash_on_delivery') {
      const result = await submitOrderRequest({
        ...orderRequest,
        payment: {
          status: 'cash_on_delivery',
        },
      });
      setStatus(`Поръчката е създадена успешно: ${result.reference}.`);
      setFullName('');
      setEmail('');
      setPhone('');
      setCity('');
      setAddress('');
      setNotes('');
      setDeliveryOption('econt');
      setPaymentOption('cash_on_delivery');
      onClear();
      return;
    }

    try {
      setStatus('Пренасочване към сигурно плащане...');

      const response = await fetch('/api/payments/borica/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalPrice,
          currency: 'EUR',
          fullName,
          email,
          phone,
          city,
          address,
          orderDescription: `Поръчка от Racketpoint - ${cartItems.length} артикула`,
        }),
      });

      const payload = (await response.json()) as {
        actionUrl?: string;
        fields?: Record<string, string>;
        order?: string;
        error?: string;
      };

      if (!response.ok || !payload.actionUrl || !payload.fields || !payload.order) {
        throw new Error(payload.error || 'Неуспешно стартиране на плащането.');
      }

      savePendingBoricaOrder(payload.order, totalPrice, orderRequest);
      postToGateway(payload.actionUrl, payload.fields);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неуспешно стартиране на плащането.';
      setStatus(message);
    }
  }

  return (
    <div className="page-shell">
      <main>
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Checkout sports atmosphere" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Сигурно плащане</p>
            <h2>Последна стъпка преди следващата ти тренировка.</h2>
          </div>
        </section>

        <section className="checkout-page-layout">
        <section className="checkout-items-panel">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Артикули</p>
              <h2>Твоята количка</h2>
            </div>
            <p className="support-copy">{totalItems} артикул{totalItems === 1 ? '' : 'а'}</p>
          </div>

          <div className="checkout-lines-list">
            {cartItems.length > 0 ? cartItems.map((item) => (
              <article key={item.sku} className="checkout-line-row">
                <div className="checkout-line-product">
                  <img className="checkout-line-thumb" src={item.product.imageUrl} alt={item.product.name} loading="lazy" />
                  <div>
                    <p className="product-category">{item.product.brand}</p>
                    <h3>{item.product.name}</h3>
                    <p className="support-copy">{formatCurrency(item.product.priceEur || parsePrice(item.product.price || '0'))}</p>
                  </div>
                </div>
                <div className="checkout-line-controls">
                  <button type="button" className="qty-btn" onClick={() => onDecrement(item.sku)}>-</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button type="button" className="qty-btn" onClick={() => onIncrement(item.sku)}>+</button>
                </div>
                <strong className="checkout-line-price">{formatCurrency(item.lineTotal)}</strong>
                  <button type="button" className="button button-secondary cart-remove-btn" onClick={() => onRemove(item.sku)}>
                  Премахни
                </button>
              </article>
            )) : (
              <article className="empty-state">
                <h3>Количката е празна.</h3>
                <p>Добавете продукти и се върнете към поръчката.</p>
                <Link className="button button-primary" to="/">Към магазина</Link>
              </article>
            )}
          </div>

          <div className="cart-total checkout-total-box">
            <strong>Общо</strong>
            <strong>{formatCurrency(totalPrice)}</strong>
          </div>
        </section>

        <section className="checkout-form-panel">
          <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
            <p className="eyebrow">Заявка за поръчка</p>
            <label>
              Пълно име
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </label>
            <label>
              Имейл
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              Телефон
              <input value={phone} onChange={(event) => setPhone(event.target.value)} required />
            </label>
            <label>
              Град
              <input value={city} onChange={(event) => setCity(event.target.value)} required />
            </label>
            <label>
              Адрес
              <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={2} required />
            </label>
            <fieldset className="checkout-choice-group">
              <legend>Опция за доставка</legend>
              <div className="checkout-choice-grid">
                {deliveryChoices.map((choice) => (
                  <label key={choice.value} className={deliveryOption === choice.value ? 'checkout-choice-card active' : 'checkout-choice-card'}>
                    <input
                      type="radio"
                      name="deliveryOption"
                      value={choice.value}
                      checked={deliveryOption === choice.value}
                      onChange={() => setDeliveryOption(choice.value)}
                    />
                    <div className="checkout-choice-top">
                      <strong>{choice.title}</strong>
                      <span className="checkout-choice-badge">{choice.badge}</span>
                    </div>
                    <span>{choice.note}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="checkout-choice-group">
              <legend>Опция за плащане</legend>
              <div className="checkout-choice-grid">
                {paymentChoices.map((choice) => (
                  <label key={choice.value} className={paymentOption === choice.value ? 'checkout-choice-card active' : 'checkout-choice-card'}>
                    <input
                      type="radio"
                      name="paymentOption"
                      value={choice.value}
                      checked={paymentOption === choice.value}
                      onChange={() => setPaymentOption(choice.value)}
                    />
                    <div className="checkout-choice-top">
                      <strong>{choice.title}</strong>
                      <span className="checkout-choice-badge">{choice.badge}</span>
                    </div>
                    <span>{choice.note}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Бележки
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
            </label>
            <button className="button button-primary" type="submit" disabled={cartItems.length === 0}>
              Изпрати поръчка
            </button>
            {status ? <p className="form-status">{status}</p> : null}
          </form>
        </section>
        </section>
      </main>
    </div>
  );
}

export default CheckoutPage;
