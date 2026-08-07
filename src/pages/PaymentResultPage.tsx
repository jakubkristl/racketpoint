import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

type PaymentResultPageProps = {
  onBoricaApproved: (params: {
    order: string;
    rc?: string;
    action?: string;
    rrn?: string;
    intRef?: string;
    amount?: string;
    currency?: string;
  }) => Promise<
    | { status: 'approved'; reference: string }
    | { status: 'amount_mismatch' }
    | { status: 'missing_pending' }
  >;
};

function getParam(searchParams: URLSearchParams, key: string) {
  return searchParams.get(key) ?? searchParams.get(key.toLowerCase()) ?? '';
}

function PaymentResultPage({ onBoricaApproved }: PaymentResultPageProps) {
  const [searchParams] = useSearchParams();
  const [localReference, setLocalReference] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Обработваме резултата от плащането...');

  const result = useMemo(() => {
    const order = getParam(searchParams, 'ORDER');
    const action = getParam(searchParams, 'ACTION');
    const rc = getParam(searchParams, 'RC');
    const signature = getParam(searchParams, 'sig');

    const signatureValid = signature === '1';
    const approved = action === '0' && rc === '00' && signatureValid;

    return {
      order,
      action,
      rc,
      signatureValid,
      approved,
      rrn: getParam(searchParams, 'RRN') || undefined,
      intRef: getParam(searchParams, 'INT_REF') || undefined,
      amount: getParam(searchParams, 'AMOUNT') || undefined,
      currency: getParam(searchParams, 'CURRENCY') || undefined,
    };
  }, [searchParams]);

  useEffect(() => {
    let canceled = false;

    async function finalize() {
      if (!result.order) {
        setMessage('Липсва номер на поръчка от платежния оператор.');
        return;
      }

      if (!result.signatureValid) {
        setMessage('Подписът на платежния отговор е невалиден. Плащането е отказано.');
        return;
      }

      if (!result.approved) {
        setMessage('Плащането не беше одобрено. Може да опитате отново.');
        return;
      }

      const savedOrder = await onBoricaApproved({
        order: result.order,
        rc: result.rc,
        action: result.action,
        rrn: result.rrn,
        intRef: result.intRef,
        amount: result.amount,
        currency: result.currency,
      });

      if (canceled) {
        return;
      }

      if (savedOrder.status === 'approved') {
        setLocalReference(savedOrder.reference);
        setMessage('Плащането е успешно. Поръчката е записана в системата.');
      } else if (savedOrder.status === 'amount_mismatch') {
        setMessage('Плащането е потвърдено от BORICA, но сумата не съвпада с локалната поръчка. Не е записана автоматично.');
      } else {
        setMessage('Плащането е успешно, но локалната поръчка не беше намерена за потвърждение.');
      }
    }

    finalize();

    return () => {
      canceled = true;
    };
  }, [onBoricaApproved, result]);

  return (
    <div className="page-shell">
      <main>
        <section className="section category-mood-banner static-banner">
          <img src="https://images.pexels.com/photos/7648078/pexels-photo-7648078.jpeg?auto=compress&cs=tinysrgb&w=1800" alt="Payment status banner" loading="lazy" />
          <div className="category-mood-overlay">
            <p className="eyebrow">Payment status</p>
            <h2>Tracking your BORICA transaction and order confirmation.</h2>
          </div>
        </section>

        <header className="hero">
          <BrandLogo compact subtitle="Платежен резултат" />
          <h1>Резултат от картово плащане</h1>
          <p className="intro">{message}</p>

        <div className="payment-result-meta">
          <span>Order: {result.order || 'n/a'}</span>
          <span>RC: {result.rc || 'n/a'}</span>
          <span>ACTION: {result.action || 'n/a'}</span>
          <span>Signature: {result.signatureValid ? 'Valid' : 'Invalid'}</span>
          {localReference ? <span>Local ref: {localReference}</span> : null}
        </div>

          <div className="hero-actions">
            <Link className="button button-primary" to="/">
              Към начална страница
            </Link>
            {!localReference ? (
              <Link className="button button-secondary" to={`/?checkout=retry&order=${encodeURIComponent(result.order || '')}`}>
                Опитай плащането отново
              </Link>
            ) : null}
          </div>
        </header>
      </main>
    </div>
  );
}

export default PaymentResultPage;
