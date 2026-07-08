import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/racketpoint';
const JWT_SECRET = process.env.JWT_SECRET || 'racketpoint-secret-key-change-in-prod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Get auth token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - no token' });
  }

  let userId: string;
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized - invalid token' });
  }

  const { items, billingAddress, shippingAddress, notes, paymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order must have at least one item' });
  }

  if (!billingAddress || !billingAddress.city) {
    return res.status(400).json({ message: 'Billing address is required' });
  }

  if (!paymentMethod || !['card', 'cash_on_delivery'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Payment method must be "card" or "cash_on_delivery"' });
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('racketpoint');

    // Calculate totals (EUR, no VAT)
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (Number(item.priceEur) * Number(item.quantity));
    }, 0);

    const shippingCost = subtotal > 100 ? 0 : 8.95; // Free shipping over €100
    const total = subtotal + shippingCost;

    // Generate order number
    const orderCount = await db.collection('orders').countDocuments();
    const orderNumber = `RP-${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, '0')}`;

    const order = {
      orderNumber,
      userId: new ObjectId(userId),
      items,
      billingAddress,
      shippingAddress: shippingAddress || billingAddress,
      subtotal: Math.round(subtotal * 100) / 100,
      shippingCost: Math.round(shippingCost * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: 'EUR',
      status: 'pending',
      paymentMethod,
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('orders').insertOne(order);

    res.status(201).json({
      success: true,
      orderId: result.insertedId,
      orderNumber: order.orderNumber,
      ...order,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Error creating order', error: String(error) });
  } finally {
    await client.close();
  }
}
