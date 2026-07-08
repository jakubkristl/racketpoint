# 🚀 Phase 3 Quick Start: Build Full E-Commerce Platform

**Status:** Phase 3 implementation started. All product data and backend structure ready. 

**Time to Complete:** ~2-3 hours for full setup + testing

---

## Step 1: Install Backend Dependencies (5 min)

```bash
cd "c:\Users\Jakub Kristl\Desktop\Racketpoint"
npm install jsonwebtoken bcryptjs mongodb
```

✅ This installs packages for authentication and database access.

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

## Step 3: Add Environment Variables to Vercel (5 min)

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Click on **racketpoint** project
3. Go to **Settings** → **Environment Variables**
4. Add these 3 variables (click "Add" for each):

| Name | Value |
|------|-------|
| `MONGODB_URI` | Your MongoDB connection string from Step 2 |
| `JWT_SECRET` | `racketpoint-super-secret-2026-change-in-production` |
| `ADMIN_PASSWORD` | `racketpoint-admin` |

✅ Environment variables configured.

---

## Step 4: Seed Database with Products (5 min)

**Option A: Local seeding (dev environment)**
```bash
node scripts/seedProducts.js
```

**Option B: Production seeding (Vercel)**
- We'll create an admin endpoint to seed products

✅ 20 Unsquashable rackets loaded into database.

---

## Step 5: Create Remaining API Routes (30 min)

Create these files in `/api` folder:

### `/api/products/index.ts` - Get all products
```typescript
// Returns products filtered by category, brand, or search
// Prices in EUR, no VAT
GET /api/products?category=rackets&brand=UNSQUASHABLE
```

### `/api/orders/create.ts` - Create order
```typescript
// Creates order with EUR pricing
// No VAT added (not VAT-registered)
// Accepts payment methods: 'card' or 'cash_on_delivery'
POST /api/orders/create
{
  items: [{ sku, quantity, priceEur }],
  paymentMethod: 'card' | 'cash_on_delivery',
  billingAddress: { city, address, phone }
}
```

### `/api/admin/stats.ts` - Admin dashboard stats
- Get sales totals in EUR
- Track orders and revenue
- User and product counts

---

## Step 6: Build Frontend Pages (45 min)

### Create `/src/pages/LoginPage.tsx`
Login/Register form with tabs

### Create `/src/pages/CheckoutPage.tsx`
Cart checkout with payment method selection (card or cash on delivery)

### Create `/src/pages/AccountPage.tsx`
User profile and order history

---

## Step 7: Update Routes in App.tsx

```typescript
<Route path="/login" element={<LoginPage />} />
<Route path="/account" element={<AccountPage />} />
<Route path="/checkout" element={<CheckoutPage />} />
<Route path="/admin" element={<AdminCRM userRole={userRole} language="bg" />} />
```

---

## Step 8: Deploy (3 min)

```bash
git add .
git commit -m "Phase 3: Add full e-commerce platform with auth, products, payments"
git push origin main
```

Vercel auto-deploys when you push to main.

---

## Step 9: Test End-to-End (30 min)

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
- Check prices in EUR

### 4. Test Order (Cash on Delivery)
- Add products to cart
- Proceed to checkout
- Select "Cash on Delivery" as payment method
- Submit order

### 5. Test Order (Card Payment)
- Add products to cart
- Select "Online Card Payment"
- Submit order (stored for manual payment processing)

### 6. Test Admin Panel
- View orders in admin dashboard
- Check analytics in EUR
- Verify user management

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `MONGODB_URI is undefined` | Add environment variable to Vercel Settings |
| `JWT_SECRET not found` | Set all 3 environment variables (Step 3) |
| `API returns 404` | Vercel needs 30-60s after push to recognize new `/api` routes |
| `Build errors` | Run `npm run build` locally first to see errors |

---

## Test Credentials

**Admin Account:**
- Email: `admin@racketpoint.bg`
- Password: `racketpoint-admin`

---

## Pricing Summary

All prices in EUR. No VAT charged (not VAT-registered).

**Shipping:**
- Free shipping on orders over €100
- €8.95 flat rate for orders under €100

**Payment Methods:**
- Online card payment (orders marked as pending)
- Cash on delivery

---

## Timeline Summary

- **Phase 1** ✅: Storefront branding & deployment
- **Phase 2** ✅: Shopping cart & checkout structure
- **Phase 3** 🚀: Full backend, auth, CRM (EUR pricing, no Stripe)
- **Phase 4** (Next): Email notifications, inventory sync, fulfillment
- **Production**: Payment gateway, email system, analytics

---

## Files Created in Phase 3 (Updated for EUR)

```
src/
  ├── data/
  │   ├── authContext.ts (new)
  │   └── productsUnsquashable.ts (updated - EUR only)
  └── components/
      ├── CartDrawer.tsx (updated - payment methods)
      └── AdminCRM.tsx (new)
api/
  ├── auth/
  │   ├── register.ts (new)
  │   └── login.ts (new)
  ├── products/
  │   └── index.ts (new - EUR pricing)
  ├── orders/
  │   └── create.ts (new - no VAT, payment methods)
  └── admin/
      ├── stats.ts (new - EUR totals)
      ├── orders.ts (new)
      ├── users.ts (new)
      └── products.ts (new - EUR pricing)
scripts/
  └── seedProducts.js (new - EUR pricing)
BACKEND_SETUP.md (updated for EUR, no Stripe)
PHASE3_QUICKSTART.md (updated - 8 steps, EUR, simple payments)
```

---

## Next Phase (Phase 4)

Once Phase 3 is complete and tested, Phase 4 will include:
- Email order confirmations and tracking
- Inventory management APIs
- Automatic order processing for both payment methods
- Customer support system
- Advanced analytics

---

Need help? Check BACKEND_SETUP.md for detailed technical documentation.
