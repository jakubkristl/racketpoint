import { ensureSchema, sql } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';
import { methodNotAllowed } from '../_lib/http';
import { setNoStore } from '../_lib/security';

export default async function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'GET') {
    methodNotAllowed(res);
    return;
  }

  const admin = requireAdmin(req, res);
  if (!admin) {
    return;
  }

  try {
    await ensureSchema();

    const [users, products, orders, revenue] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM users`,
      sql`SELECT COUNT(*)::int AS count FROM products`,
      sql`SELECT COUNT(*)::int AS count FROM orders`,
      sql`SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM orders`,
    ]);

    const statusRows = await sql`
      SELECT status, COUNT(*)::int AS count
      FROM orders
      GROUP BY status
      ORDER BY status
    `;

    res.status(200).json({
      users: users.rows[0]?.count ?? 0,
      products: products.rows[0]?.count ?? 0,
      orders: orders.rows[0]?.count ?? 0,
      revenueEur: Number(revenue.rows[0]?.total ?? 0),
      orderStatuses: statusRows.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Stats endpoint failed.' });
  }
}
