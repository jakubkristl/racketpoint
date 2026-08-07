import crypto from 'node:crypto';
import { enforceRateLimit, getClientIp } from '../../_lib/rateLimit';
import { enforceTrustedOrigin, setNoStore } from '../../_lib/security';
import { isValidEmail, normalizeEmail, sanitizeText } from '../../_lib/validation';

type InitRequestBody = {
  amount: number;
  currency?: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  address?: string;
  orderRef?: string;
  orderDescription?: string;
};

function toUtcTimestamp() {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${now.getUTCDate()}`.padStart(2, '0');
  const hour = `${now.getUTCHours()}`.padStart(2, '0');
  const minute = `${now.getUTCMinutes()}`.padStart(2, '0');
  const second = `${now.getUTCSeconds()}`.padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

function randomNonce() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function normalizePem(value?: string) {
  if (!value) {
    return '';
  }

  return value.replace(/\\n/g, '\n').trim();
}

function byteLength(value: string) {
  return Buffer.byteLength(value, 'utf8');
}

function signMacGeneral(fields: string[], privateKeyPem: string) {
  const source = fields.map((value) => `${byteLength(value)}${value}`).join('');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(source, 'utf8');
  signer.end();
  const signature = signer.sign(privateKeyPem);
  return signature.toString('hex').toUpperCase();
}

function parseJsonBody(raw: unknown): InitRequestBody {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Missing request body.');
  }

  const parsed = raw as Record<string, unknown>;
  return {
    amount: Number(parsed.amount ?? 0),
    currency: typeof parsed.currency === 'string' ? parsed.currency : undefined,
    fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
    email: typeof parsed.email === 'string' ? parsed.email : '',
    phone: typeof parsed.phone === 'string' ? parsed.phone : undefined,
    city: typeof parsed.city === 'string' ? parsed.city : undefined,
    address: typeof parsed.address === 'string' ? parsed.address : undefined,
    orderRef: typeof parsed.orderRef === 'string' ? parsed.orderRef : undefined,
    orderDescription: typeof parsed.orderDescription === 'string' ? parsed.orderDescription : undefined,
  };
}

export default function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  if (!enforceRateLimit(req, res, { key: `payments:borica:init:${ip}`, max: 20, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  if (!enforceTrustedOrigin(req, res, { allowWithoutOrigin: true })) {
    return;
  }

  try {
    const body = parseJsonBody(req.body);
    const privateKeyPem = normalizePem(process.env.BORICA_PRIVATE_KEY_PEM);
    const terminal = (process.env.BORICA_TERMINAL_ID ?? '').trim();

    if (!privateKeyPem || !terminal) {
      res.status(500).json({
        error: 'BORICA is not configured. Missing BORICA_PRIVATE_KEY_PEM or BORICA_TERMINAL_ID.',
      });
      return;
    }

    if (!Number.isFinite(body.amount) || body.amount <= 0) {
      res.status(400).json({ error: 'Invalid amount.' });
      return;
    }

    const email = normalizeEmail(body.email);
    const fullName = sanitizeText(body.fullName, 90);
    const city = sanitizeText(body.city ?? '', 64);
    const address = sanitizeText(body.address ?? '', 120);
    const description = sanitizeText(body.orderDescription ?? 'Racketpoint order', 50);

    if (!fullName || !email || !isValidEmail(email)) {
      res.status(400).json({ error: 'Missing customer details.' });
      return;
    }

    const trType = '1';
    const amount = body.amount.toFixed(2);
    const currency = (body.currency ?? process.env.BORICA_CURRENCY ?? 'EUR').toUpperCase();
    const order = `${(Date.now() + Math.floor(Math.random() * 997)) % 1000000}`.padStart(6, '0');
    const timestamp = toUtcTimestamp();
    const nonce = randomNonce();
    const rfu = '-';

    const orderRefSuffix = (body.orderRef ?? `RKT${Date.now().toString(36).toUpperCase()}`)
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 16);
    const addendum = 'AD,TD';
    const customOrderId = `${order}${orderRefSuffix}`.slice(0, 22);
    const desc = description;

    const mInfoPayload = {
      cardholderName: fullName.slice(0, 45),
      email,
      mobilePhone: body.phone
        ? {
            cc: '359',
            subscriber: body.phone.replace(/\D/g, '').slice(-9),
          }
        : undefined,
      billAddrLine1: `${city} ${address}`.trim().slice(0, 50),
      shipAddrLine1: `${city} ${address}`.trim().slice(0, 50),
    };

    const mInfo = Buffer.from(JSON.stringify(mInfoPayload), 'utf8').toString('base64');
    const signFields = [terminal, trType, amount, currency, order, timestamp, nonce, rfu];
    const pSign = signMacGeneral(signFields, privateKeyPem);

    const actionUrl = process.env.BORICA_GATE_URL?.trim() || 'https://3dsgate.borica.bg/cgi-bin/cgi_link';
    const backref = process.env.BORICA_BACKREF_URL?.trim() || 'https://racketpoint.bg/api/payments/borica/callback';
    const fields: Record<string, string> = {
      TERMINAL: terminal,
      TRTYPE: trType,
      AMOUNT: amount,
      CURRENCY: currency,
      ORDER: order,
      DESC: desc,
      MERCHANT: (process.env.BORICA_MERCHANT_ID ?? '').trim(),
      MERCH_NAME: (process.env.BORICA_MERCHANT_NAME ?? 'Racketpoint.bg').trim(),
      MERCH_URL: (process.env.BORICA_MERCHANT_URL ?? 'https://racketpoint.bg').trim(),
      EMAIL: email,
      COUNTRY: (process.env.BORICA_COUNTRY ?? 'BG').trim(),
      MERCH_GMT: (process.env.BORICA_MERCH_GMT ?? '+03').trim(),
      LANG: (process.env.BORICA_LANG ?? 'BG').trim(),
      BACKREF: backref,
      ADDENDUM: addendum,
      'AD.CUST_BOR_ORDER_ID': customOrderId,
      TIMESTAMP: timestamp,
      M_INFO: mInfo,
      NONCE: nonce,
      P_SIGN: pSign,
    };

    const mpay = (process.env.BORICA_MPAY ?? '').trim();
    if (mpay) {
      fields.MPAY = mpay;
    }

    res.status(200).json({
      actionUrl,
      fields,
      order,
      nonce,
      message: 'BORICA payment form is ready.',
    });
  } catch (error) {
    console.error('BORICA init failed', error);
    res.status(500).json({ error: 'Unable to initialize payment at the moment.' });
  }
}
