import { ensureSchema, sql } from '../_lib/db';
import { requireSession } from '../_lib/auth';
import { methodNotAllowed } from '../_lib/http';
import { setNoStore } from '../_lib/security';

function mapOrder(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    status: row.status,
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentProvider: row.payment_provider,
    paymentReference: row.payment_reference,
    address: row.address,
    items: row.items,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export default async function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'GET') {
    methodNotAllowed(res);
    return;
  }

  const session = requireSession(req, res);
  if (!session) {
    return;
  }

  try {
    await ensureSchema();

    const includeAll = req.query.all === '1' && session.role === 'ADMIN';
    const rows = includeAll
      ? await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 300`
      : await sql`SELECT * FROM orders WHERE email = ${session.email} ORDER BY created_at DESC LIMIT 200`;

    res.status(200).json(rows.rows.map(mapOrder));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Orders fetch failed.' });
  }
}
