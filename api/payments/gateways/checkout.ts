import { methodNotAllowed, readBody } from '../../_lib/http';
import { enforceRateLimit, getClientIp } from '../../_lib/rateLimit';
import { enforceTrustedOrigin, setNoStore } from '../../_lib/security';

type CheckoutGatewayBody = {
  gateway: 'borica' | 'cash_on_delivery';
  amount: number;
  currency?: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  address?: string;
  orderDescription?: string;
};

export default function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const ip = getClientIp(req);
  if (!enforceRateLimit(req, res, { key: `payments:gateway:checkout:${ip}`, max: 30, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  if (!enforceTrustedOrigin(req, res, { allowWithoutOrigin: true })) {
    return;
  }

  try {
    const body = readBody<CheckoutGatewayBody>(req);

    if (body.gateway === 'cash_on_delivery') {
      res.status(200).json({
        gateway: 'cash_on_delivery',
        mode: 'offline',
        status: 'accepted',
      });
      return;
    }

    res.status(200).json({
      gateway: 'borica',
      mode: 'redirect_form',
      endpoint: '/api/payments/borica/init',
      payload: {
        amount: body.amount,
        currency: (body.currency ?? 'EUR').toUpperCase(),
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        city: body.city,
        address: body.address,
        orderDescription: body.orderDescription,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid gateway payload.' });
  }
}
