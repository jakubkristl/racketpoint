import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/racketpoint';
const JWT_SECRET = process.env.JWT_SECRET || 'racketpoint-secret-key-change-in-prod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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

  const { orderId } = req.query;
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('racketpoint');

    if (req.method === 'GET') {
      // Get all orders or specific order
      if (orderId) {
        const order = await db.collection('orders')
          .findOne({ orderNumber: orderId as string });
        
        if (!order) {
          return res.status(404).json({ message: 'Order not found' });
        }
        
        return res.status(200).json(order);
      } else {
        // Get all orders (paginated)
        const page = Number(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const orders = await db.collection('orders')
          .find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const total = await db.collection('orders').countDocuments();

        res.status(200).json({
          orders,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        });
      }
    } else if (req.method === 'PUT') {
      // Update order status
      if (!orderId) {
        return res.status(400).json({ message: 'Order ID is required' });
      }

      const { status } = req.body;
      const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const result = await db.collection('orders').updateOne(
        { orderNumber: orderId as string },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.status(200).json({ message: 'Order updated', status });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ message: 'Error processing order', error: String(error) });
  } finally {
    await client.close();
  }
}
