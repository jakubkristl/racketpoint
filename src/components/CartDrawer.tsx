import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../data/catalog';

type CartLine = {
  sku: string;
  quantity: number;
};

type CartDrawerProps = {
  products: Product[];
  lines: CartLine[];
  autoOpenToken?: string;
  onIncrement: (sku: string) => void;
  onDecrement: (sku: string) => void;
  onRemove: (sku: string) => void;
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
  autoOpenToken,
  onIncrement,
  onDecrement,
  onRemove,
}: CartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const cartItems = useMemo(() => {
    const productBySku = new Map(products.map((product) => [product.sku, product] as const));

    const items: Array<{ sku: string; quantity: number; product: Product; lineTotal: number }> = [];

    for (const line of lines) {
      const product = productBySku.get(line.sku);
      if (!product) {
        continue;
      }

      const unitPrice = product.priceEur || parsePrice(product.price || '0');
      items.push({
        sku: line.sku,
        quantity: line.quantity,
        product,
        lineTotal: unitPrice * line.quantity,
      });
    }

    return items;
  }, [lines, products]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  useEffect(() => {
    if (autoOpenToken) {
      setIsOpen(true);
      setStatus('Картовото плащане не беше завършено. Можете да продължите от страницата за поръчка.');
    }
  }, [autoOpenToken]);

  useEffect(() => {
    function onOpenCart() {
      setIsOpen(true);
    }

    window.addEventListener('racketpoint:open-cart', onOpenCart as EventListener);
    return () => window.removeEventListener('racketpoint:open-cart', onOpenCart as EventListener);
  }, []);

  return (
    <>
      <button className="cart-toggle" type="button" onClick={() => setIsOpen(true)}>
        Количка {totalItems > 0 ? `(${totalItems})` : ''}
      </button>

      {isOpen ? <button className="cart-overlay" type="button" aria-label="Затвори количката" onClick={() => setIsOpen(false)} /> : null}

      <aside className={isOpen ? 'cart-drawer open' : 'cart-drawer'} aria-label="Панел на количката">
        <div className="cart-drawer-header">
          <h2>Твоята количка</h2>
          <button className="button button-secondary" type="button" onClick={() => setIsOpen(false)}>
            Затвори
          </button>
        </div>

        <div className="cart-lines">
          {cartItems.length > 0 ? (
            cartItems.map((item) => (
              <article key={item.sku} className="cart-line">
                <div className="cart-line-main">
                  <img className="cart-line-thumb" src={item.product.imageUrl} alt={item.product.name} loading="lazy" />
                  <div>
                    <p className="product-category">{item.product.brand}</p>
                    <h3>{item.product.name}</h3>
                    <p className="support-copy">Единична цена: {formatCurrency(item.product.priceEur || parsePrice(item.product.price || '0'))}</p>
                    <p className="cart-line-total">Общо за реда: {formatCurrency(item.lineTotal)}</p>
                  </div>
                </div>

                <div className="cart-line-actions">
                  <button type="button" className="qty-btn" onClick={() => onDecrement(item.sku)}>-</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button type="button" className="qty-btn" onClick={() => onIncrement(item.sku)}>+</button>
                  <button type="button" className="button button-secondary cart-remove-btn" onClick={() => onRemove(item.sku)}>
                    Премахни
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="support-copy">Количката е празна. Добавете продукти от каталога.</p>
          )}
        </div>

        <div className="cart-total">
          <strong>Общо</strong>
          <strong>{formatCurrency(totalPrice)}</strong>
        </div>

        <div className="cart-drawer-footer">
          <Link className="button button-primary" to={totalItems > 0 ? '/checkout' : '/'} onClick={() => setIsOpen(false)}>
            {totalItems > 0 ? 'Към поръчката' : 'Към магазина'}
          </Link>
          {status ? <p className="form-status">{status}</p> : null}
        </div>
      </aside>
    </>
  );
}

export default CartDrawer;
