import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/racketpoint';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { category, brand, search, sku } = req.query;
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('racketpoint');
    const productsCollection = db.collection('products');

    let query: any = {};

    // Filter by category
    if (category && category !== 'all') {
      query.categorySlug = category;
    }

    // Filter by brand
    if (brand) {
      query.brand = brand;
    }

    // Filter by specific SKU
    if (sku) {
      query.sku = sku;
    }

    // Text search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameBg: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { descriptionBg: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await productsCollection
      .find(query)
      .sort({ type: 1, priceBgn: 1 })
      .toArray();

    res.status(200).json(products);
  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ message: 'Error fetching products', error: String(error) });
  } finally {
    await client.close();
  }
}
