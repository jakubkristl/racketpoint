import { useMemo, useState, type FormEvent } from 'react';
import type { Product } from '../data/catalog';
import { submitOrderRequest } from '../data/store';

type CartLine = {
  sku: string;
  quantity: number;
};

type CartDrawerProps = {
  products: Product[];
  lines: CartLine[];
  onIncrement: (sku: string) => void;
  onDecrement: (sku: string) => void;
  onRemove: (sku: string) => void;
  onClear: () => void;
};

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

function CartDrawer({
  products,
  lines,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
}: CartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const cartItems = useMemo(() => {
    const productBySku = new Map(products.map((product) => [product.sku, product] as const));

    return lines
      .map((line) => {
        const product = productBySku.get(line.sku);
        if (!product) {
          return null;
        }

        return {
          ...line,
          product,
          lineTotal: parsePrice(product.price) * line.quantity,
        };
      })
      .filter((item) => item !== null);
  }, [lines, products]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  async function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cartItems.length === 0) {
      setStatus('Добави поне един продукт в количката.');
      return;
    }

    const orderNotes = [
      `Phone: ${phone}`,
      `City: ${city}`,
      `Address: ${address}`,
      notes ? `Notes: ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await submitOrderRequest({
      fullName,
      email,
      items: cartItems.map((item) => ({ sku: item.sku, quantity: item.quantity })),
      notes: orderNotes,
    });

    setStatus(`Заявката е приета с номер ${result.reference}.`);
    setFullName('');
    setEmail('');
    setPhone('');
    setCity('');
    setAddress('');
    setNotes('');
    onClear();
  }

  return (
    <>
      <button className="cart-toggle" type="button" onClick={() => setIsOpen(true)}>
        Cart {totalItems > 0 ? `(${totalItems})` : ''}
      </button>

      {isOpen ? <button className="cart-overlay" type="button" aria-label="Close cart" onClick={() => setIsOpen(false)} /> : null}

      <aside className={isOpen ? 'cart-drawer open' : 'cart-drawer'} aria-label="Shopping cart drawer">
        <div className="cart-drawer-header">
          <h2>Your cart</h2>
          <button className="button button-secondary" type="button" onClick={() => setIsOpen(false)}>
            Close
          </button>
        </div>

        <div className="cart-lines">
          {cartItems.length > 0 ? (
            cartItems.map((item) => (
              <article key={item.sku} className="cart-line">
                <div>
                  <p className="product-category">{item.product.brand}</p>
                  <h3>{item.product.name}</h3>
                  <p>{item.product.price}</p>
                </div>
                <div className="cart-line-actions">
                  <button type="button" onClick={() => onDecrement(item.sku)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => onIncrement(item.sku)}>
                    +
                  </button>
                  <button type="button" onClick={() => onRemove(item.sku)}>
                    Remove
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="support-copy">Количката е празна. Добави продукти от каталога.</p>
          )}
        </div>

        <div className="cart-total">
          <strong>Total</strong>
          <strong>{formatCurrency(totalPrice)}</strong>
        </div>

        <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
          <p className="eyebrow">Checkout request</p>
          <label>
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </label>
          <label>
            City
            <input value={city} onChange={(event) => setCity(event.target.value)} required />
          </label>
          <label>
            Address
            <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={2} required />
          </label>
          <label>
            Notes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
          </label>
          <button className="button button-primary" type="submit" disabled={cartItems.length === 0}>
            Submit order request
          </button>
          {status ? <p className="form-status">{status}</p> : null}
        </form>
      </aside>
    </>
  );
}

export default CartDrawer;
