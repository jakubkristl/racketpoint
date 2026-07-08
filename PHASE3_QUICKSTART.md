# 🚀 Phase 3 Quick Start: Build Full E-Commerce Platform

**Status:** Phase 3 implementation started. All product data and backend structure ready. 

**Time to Complete:** ~2-3 hours for full setup + testing

---

## Step 1: Install Backend Dependencies (5 min)

```bash
cd "c:\Users\Jakub Kristl\Desktop\Racketpoint"
npm install jsonwebtoken bcryptjs mongodb stripe
```

✅ This installs packages for authentication, database, and payments.

---

## Step 2: Setup MongoDB Database (10 min)

1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Create a Free Account" (or login if you have one)
3. Create a **Project** and **Cluster** (Shared tier, FREE)
4. Choose region closest to Bulgaria (e.g., Frankfurt)
5. Go to **Database** → **Connect** → **Drivers**
6. Copy the connection string that looks like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true
   ```
7. Keep this safe — you'll need it in Step 3

✅ Database is ready.

---

## Step 3: Setup Stripe Payment Processing (5 min)

1. Go to https://dashboard.stripe.com/register
2. Create free account (no credit card needed for testing)
3. Go to **Developers** → **API Keys**
4. Copy both:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)
5. Keep these safe

✅ Payment processing ready.

---

## Step 4: Add Environment Variables to Vercel (5 min)

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Click on **racketpoint** project
3. Go to **Settings** → **Environment Variables**
4. Add these 5 variables (click "Add" for each):

| Name | Value |
|------|-------|
| `MONGODB_URI` | Your MongoDB connection string from Step 2 |
| `JWT_SECRET` | `racketpoint-super-secret-2026-change-in-production` |
| `STRIPE_PUBLISHABLE_KEY` | Your Stripe Publishable Key |
| `STRIPE_SECRET_KEY` | Your Stripe Secret Key |
| `ADMIN_PASSWORD` | `racketpoint-admin` |

✅ Environment variables configured.

---

## Step 5: Seed Database with Products (5 min)

**Option A: Local seeding (dev environment)**
```bash
node scripts/seedProducts.js
```

**Option B: Production seeding (Vercel)**
- We'll create an admin endpoint to seed products

✅ 20 Unsquashable rackets loaded into database.

---

## Step 6: Create Remaining API Routes (30 min)

Create these files in `/api` folder:

### `/api/products/index.ts` - Get all products
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { category, brand, search } = req.query;
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const db = client.db('racketpoint');
    const products = db.collection('products');

    let query: any = {};
    if (category) query.categorySlug = category;
    if (brand) query.brand = brand;
    if (search) query.$text = { $search: search as string };

    const result = await products.find(query).toArray();
    res.status(200).json(result);
  } finally {
    await client.close();
  }
}
```

### `/api/orders/create.ts` - Create order
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const { items, billingAddress, shippingAddress, notes } = req.body;

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.priceBgn * item.quantity), 0);
    const tax = subtotal * 0.2; // 20% VAT
    const total = subtotal + tax;

    const client = new MongoClient(process.env.MONGODB_URI!);
    const db = client.db('racketpoint');
    const orders = db.collection('orders');

    const order = {
      orderNumber: `RP-${Date.now()}`,
      userId: decoded.userId,
      items,
      billingAddress,
      shippingAddress,
      subtotal,
      tax,
      total,
      status: 'pending',
      notes,
      createdAt: new Date(),
    };

    const result = await orders.insertOne(order);
    res.status(201).json({ orderId: result.insertedId, ...order });
  } catch (error) {
    res.status(500).json({ message: 'Error creating order' });
  }
}
```

### `/api/admin/stats.ts` - Admin dashboard stats
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const client = new MongoClient(process.env.MONGODB_URI!);
    const db = client.db('racketpoint');

    const totalOrders = await db.collection('orders').countDocuments();
    const totalRevenue = await db.collection('orders')
      .aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }])
      .toArray()
      .then(r => r[0]?.total || 0);

    const activeUsers = await db.collection('users').countDocuments();
    const productsInStock = await db.collection('products')
      .aggregate([{ $group: { _id: null, total: { $sum: '$stock' } } }])
      .toArray()
      .then(r => r[0]?.total || 0);

    res.status(200).json({
      totalOrders,
      totalRevenue,
      activeUsers,
      productsInStock,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
}
```

---

## Step 7: Build Frontend Pages (45 min)

### Create `/src/pages/LoginPage.tsx`
Login/Register form with tabs

### Create `/src/pages/CheckoutPage.tsx`
Cart checkout with Stripe integration

### Create `/src/pages/AccountPage.tsx`
User profile and order history

---

## Step 8: Update Routes in App.tsx

```typescript
<Route path="/login" element={<LoginPage />} />
<Route path="/account" element={<AccountPage />} />
<Route path="/checkout" element={<CheckoutPage />} />
<Route path="/admin" element={<AdminCRM userRole={userRole} language="bg" />} />
```

---

## Step 9: Deploy (3 min)

```bash
git add .
git commit -m "Phase 3: Add full e-commerce platform with auth, products, payments"
git push origin main
```

Vercel auto-deploys when you push to main.

---

## Step 10: Test End-to-End (30 min)

### 1. Test Admin Login
- URL: `racketpoint.vercel.app/login`
- Email: `admin@racketpoint.bg`
- Password: `racketpoint-admin`

### 2. Test User Registration
- Register new test account
- Verify profile saves

### 3. Test Products
- View product catalog
- Filter by category/brand
- Check prices in BGN

### 4. Test Order
- Add products to cart
- Proceed to checkout
- Complete Stripe test payment

### 5. Test Admin Panel
- View orders in admin dashboard
- Check analytics
- Verify user management

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `MONGODB_URI is undefined` | Add environment variable to Vercel Settings |
| `JWT_SECRET not found` | Set all 5 environment variables (Step 4) |
| `API returns 404` | Vercel needs 30-60s after push to recognize new `/api` routes |
| `Stripe payment fails` | Verify you're using **test keys**, not live keys |
| `Build errors` | Run `npm run build` locally first to see errors |

---

## Test Credentials

**Admin Account:**
- Email: `admin@racketpoint.bg`
- Password: `racketpoint-admin`

**Stripe Test Cards:**
- Visa: `4242 4242 4242 4242`
- Exp: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

---

## Timeline Summary

- **Phase 1** ✅: Storefront branding & deployment
- **Phase 2** ✅: Shopping cart & checkout structure
- **Phase 3** 🚀: Full backend, auth, payments, CRM
- **Phase 4** (Next): Email notifications, inventory sync, fulfillment
- **Production**: SSL, payment gateway compliance, backup strategy

---

## Files Created in Phase 3

```
src/
  ├── data/
  │   ├── authContext.ts (new)
  │   └── productsUnsquashable.ts (new)
  └── components/
      └── AdminCRM.tsx (new)
api/
  ├── auth/
  │   ├── register.ts (new)
  │   └── login.ts (new)
  ├── products/
  │   └── index.ts (to create)
  ├── orders/
  │   └── create.ts (to create)
  └── admin/
      └── stats.ts (to create)
scripts/
  └── seedProducts.js (new)
BACKEND_SETUP.md (comprehensive guide)
```

---

## Next Phase (Phase 4)

Once Phase 3 is complete and tested, Phase 4 will include:
- Email confirmations for orders
- Inventory management APIs
- Automatic order tracking
- Customer support system
- Advanced analytics

---

Need help? Check BACKEND_SETUP.md for detailed technical documentation.
