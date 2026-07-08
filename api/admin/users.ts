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

    // Get pagination params
    const page = Number(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    let query: any = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    // Get users
    const users = await db.collection('users')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Count orders for each user
    const usersWithOrderCount = await Promise.all(
      users.map(async (user: any) => {
        const orderCount = await db.collection('orders').countDocuments({ userId: user._id });
        const lastOrderDate = await db.collection('orders')
          .findOne({ userId: user._id }, { sort: { createdAt: -1 } });

        return {
          ...user,
          password: undefined, // Don't send password
          orderCount,
          lastOrderDate: lastOrderDate?.createdAt || null,
        };
      })
    );

    const total = await db.collection('users').countDocuments(query);

    res.status(200).json({
      users: usersWithOrderCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ message: 'Error fetching users', error: String(error) });
  } finally {
    await client.close();
  }
}
