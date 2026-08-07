import crypto from 'node:crypto';
import { ensureSchema, sql } from '../../_lib/db';

function normalizePem(value?: string) {
  if (!value) {
    return '';
  }

  return value.replace(/\\n/g, '\n').trim();
}

function byteLength(value: string) {
  return Buffer.byteLength(value, 'utf8');
}

function verifyBoricaSignature(payload: Record<string, string>, publicKeyPem: string) {
  const fields = [
    payload.ACTION ?? '-',
    payload.RC ?? '-',
    payload.APPROVAL ?? '-',
    payload.TERMINAL ?? '-',
    payload.TRTYPE ?? '-',
    payload.AMOUNT ?? '-',
    payload.CURRENCY ?? '-',
    payload.ORDER ?? '-',
    payload.RRN ?? '-',
    payload.INT_REF ?? '-',
    payload.PARES_STATUS ?? '-',
    payload.ECI ?? '-',
    payload.TIMESTAMP ?? '-',
    payload.NONCE ?? '-',
    '-',
  ];

  const source = fields.map((value) => `${byteLength(value)}${value}`).join('');
  const signatureHex = payload.P_SIGN ?? '';
  if (!signatureHex) {
    return false;
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(source, 'utf8');
  verifier.end();
  return verifier.verify(publicKeyPem, Buffer.from(signatureHex, 'hex'));
}

function toStringRecord(input: unknown) {
  if (typeof input === 'string') {
    const params = new URLSearchParams(input);
    const output: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      output[key] = value;
    }
    return output;
  }

  if (!input || typeof input !== 'object') {
    return {} as Record<string, string>;
  }

  const obj = input as Record<string, unknown>;
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      continue;
    }

    output[key] = String(value);
  }
  return output;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const payload = toStringRecord(req.method === 'POST' ? req.body : req.query);
  const publicKeyPem = normalizePem(process.env.BORICA_PUBLIC_KEY_PEM);

  if (!publicKeyPem) {
    res.status(500).json({ error: 'BORICA public key is missing.' });
    return;
  }

  const signatureValid = verifyBoricaSignature(payload, publicKeyPem);
  const approved = payload.RC === '00' && payload.ACTION === '0' && signatureValid;
  const status = approved ? 'approved' : 'failed';

  try {
    await ensureSchema();

    await sql`
      INSERT INTO borica_payments (
        gateway_order, amount, currency, rc, action, rrn, int_ref,
        signature_valid, status, payload, updated_at
      ) VALUES (
        ${payload.ORDER ?? null},
        ${payload.AMOUNT ? Number(payload.AMOUNT) : null},
        ${payload.CURRENCY ?? null},
        ${payload.RC ?? null},
        ${payload.ACTION ?? null},
        ${payload.RRN ?? null},
        ${payload.INT_REF ?? null},
        ${signatureValid},
        ${status},
        ${JSON.stringify(payload)}::jsonb,
        NOW()
      )
      ON CONFLICT (gateway_order) DO UPDATE
      SET
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        rc = EXCLUDED.rc,
        action = EXCLUDED.action,
        rrn = EXCLUDED.rrn,
        int_ref = EXCLUDED.int_ref,
        signature_valid = EXCLUDED.signature_valid,
        status = EXCLUDED.status,
        payload = EXCLUDED.payload,
        updated_at = NOW()
    `;

    if (payload.ORDER) {
      const callbackNote = approved ? '\nBORICA callback: APPROVED' : '\nBORICA callback: FAILED';
      const rrnNote = payload.RRN ? `\nRRN: ${payload.RRN}` : '';
      const intRefNote = payload.INT_REF ? `\nINT_REF: ${payload.INT_REF}` : '';

      await sql`
        UPDATE orders
        SET
          payment_status = ${approved ? 'approved' : 'failed'},
          payment_provider = COALESCE(payment_provider, 'borica'),
          payment_reference = ${payload.ORDER},
          notes = CONCAT(
            COALESCE(notes, ''),
            ${callbackNote},
            ${rrnNote},
            ${intRefNote}
          )
        WHERE payment_reference = ${payload.ORDER}
      `;
    }
  } catch {
    // Callback persistence should not block the redirect flow.
  }

  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  const proto = (req.headers['x-forwarded-proto'] || 'https').toString();
  const fallbackResultUrl = host
    ? `${proto}://${host}/payments/borica/result`
    : 'https://racketpoint.bg/payments/borica/result';
  const resultBase = process.env.BORICA_RESULT_URL?.trim() || fallbackResultUrl;

  const resultUrl = new URL(resultBase);
  resultUrl.searchParams.set('ORDER', payload.ORDER ?? '');
  resultUrl.searchParams.set('ACTION', payload.ACTION ?? '');
  resultUrl.searchParams.set('RC', payload.RC ?? '');
  resultUrl.searchParams.set('RRN', payload.RRN ?? '');
  resultUrl.searchParams.set('INT_REF', payload.INT_REF ?? '');
  resultUrl.searchParams.set('AMOUNT', payload.AMOUNT ?? '');
  resultUrl.searchParams.set('CURRENCY', payload.CURRENCY ?? '');
  resultUrl.searchParams.set('sig', signatureValid ? '1' : '0');
  resultUrl.searchParams.set('status', status);

  const wantsJson = req.headers.accept?.includes('application/json');
  if (!wantsJson) {
    res.status(302).setHeader('Location', resultUrl.toString());
    res.end();
    return;
  }

  res.status(200).json({
    status,
    approved,
    signatureValid,
    order: payload.ORDER ?? null,
    amount: payload.AMOUNT ?? null,
    currency: payload.CURRENCY ?? null,
    rc: payload.RC ?? null,
    action: payload.ACTION ?? null,
    rrn: payload.RRN ?? null,
    intRef: payload.INT_REF ?? null,
    raw: payload,
  });
}
