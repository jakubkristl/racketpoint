import { methodNotAllowed } from '../../_lib/http';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    methodNotAllowed(res);
    return;
  }

  const gateways = [
    {
      id: 'borica',
      title: 'BORICA Card Payment',
      type: 'redirect_form',
      enabled: Boolean(process.env.BORICA_PRIVATE_KEY_PEM && process.env.BORICA_TERMINAL_ID),
      currency: (process.env.BORICA_CURRENCY ?? 'EUR').toUpperCase(),
      endpoint: '/api/payments/borica/init',
    },
    {
      id: 'cash_on_delivery',
      title: 'Cash on Delivery',
      type: 'offline',
      enabled: true,
      currency: 'EUR',
    },
  ];

  res.status(200).json({ gateways });
}
