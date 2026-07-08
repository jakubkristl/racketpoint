import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/racketpoint';
const JWT_SECRET = process.env.JWT_SECRET || 'racketpoint-secret-key-change-in-prod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify admin
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  let userRole: string;
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    userRole = decoded.role;
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (userRole !== 'admin') {
    return res.status(403).json({ message: 'Forbidden - admin access required' });
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('racketpoint');

    // Get stats
    const totalOrders = await db.collection('orders').countDocuments();
    const totalUsers = await db.collection('users').countDocuments();
    const totalProducts = await db.collection('products').countDocuments();

    // Calculate revenue
    const revenueResult = await db.collection('orders')
      .aggregate([
        { $match: { status: { $in: ['paid', 'shipped', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ])
      .toArray();
    const totalRevenue = revenueResult[0]?.total || 0;

    // Get average order value
    const avgOrderResult = await db.collection('orders')
      .aggregate([
        { $group: { _id: null, avg: { $avg: '$total' } } },
      ])
      .toArray();
    const avgOrderValue = avgOrderResult[0]?.avg || 0;

    // Get products in stock
    const stockResult = await db.collection('products')
      .aggregate([
        { $group: { _id: null, total: { $sum: '$stock' } } },
      ])
      .toArray();
    const totalStock = stockResult[0]?.total || 0;

    // Get recent orders for trend
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = await db.collection('orders')
      .countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Get orders from last month (for trend calculation)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const previousOrderCount = await db.collection('orders')
      .countDocuments({
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
      });

    const orderTrend = previousOrderCount > 0
      ? ((recentOrders - previousOrderCount) / previousOrderCount) * 100
      : 0;

    // Returning customers (users with 2+ orders)
    const returningCustomers = await db.collection('orders')
      .aggregate([
        { $group: { _id: '$userId', orderCount: { $sum: 1 } } },
        { $match: { orderCount: { $gte: 2 } } },
        { $count: 'total' },
      ])
      .toArray();
    const returningCount = returningCustomers[0]?.total || 0;
    const returningRate = totalUsers > 0 ? (returningCount / totalUsers) * 100 : 0;

    res.status(200).json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      productsInStock: totalStock,
      recentOrders,
      orderTrend: Math.round(orderTrend * 10) / 10,
      returningCustomerRate: Math.round(returningRate * 10) / 10,
      avgItemsPerOrder: totalOrders > 0 ? 3.2 : 0, // Placeholder
      conversionRate: 2.5, // Placeholder
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Error fetching stats', error: String(error) });
  } finally {
    await client.close();
  }
}
