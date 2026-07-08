# Phase 3: E-Commerce Platform Build - Backend Setup Guide

## Overview
Complete buildout of user accounts, admin CRM, payment processing, and Unsquashable product catalog with Bulgarian translations and competitive pricing.

## Architecture

```
Frontend (React + Vite)
    ↓
Vercel Serverless Functions (/api)
    ↓
MongoDB Atlas (Database)
    ↓
Stripe API (Payments)
```

## 1. Database Setup (MongoDB Atlas)

### Steps:
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account → Create Project → Create Cluster (Shared tier, free)
3. Add IP whitelist: 0.0.0.0/0 (for development)
4. Create database user: `racketpoint_user` with auto-generated password
5. Get connection string: `mongodb+srv://racketpoint_user:PASSWORD@cluster.mongodb.net/racketpoint`

### Environment Variables (set in Vercel):
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/racketpoint
JWT_SECRET=your-super-secret-key-generate-random
ADMIN_PASSWORD=racketpoint-admin
```

## 2. Payment Methods Setup

This version supports two payment methods:
- **Online Card Payment**: For credit/debit cards (requires payment gateway integration later)
- **Cash on Delivery**: Orders are collected with payment due on delivery

No payment gateway configuration needed for initial launch.

## 3. Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed with bcrypt),
  name: String,
  phone: String,
  language: 'bg' | 'en',
  role: 'user' | 'admin',
  addresses: [{
    id: String,
    label: String,
    street: String,
    city: String,
    zipCode: String,
    country: String,
    isDefault: Boolean
  }],
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

### Products Collection
```javascript
{
  _id: ObjectId,
  sku: String (unique),
  name: String,
  nameBg: String,
  brand: String,
  category: String,
  categorySlug: String,
  type: String,
  priceEur: Number,
  description: String,
  descriptionBg: String,
  imageUrl: String,
  details: String,
  detailsBg: String,
  badges: Array<String>,
  stock: Number,
  createdAt: Date
}
```

### Orders Collection
```javascript
{
  _id: ObjectId,
  orderNumber: String (unique, e.g., "RP-2026-00001"),
  userId: ObjectId (ref to Users),
  items: [{
    sku: String,
    name: String,
    quantity: Number,
    priceEur: Number,
    subtotal: Number
  }],
  billingAddress: Object,
  shippingAddress: Object,
  subtotal: Number (EUR),
  shippingCost: Number (EUR),
  total: Number (EUR),
  currency: 'EUR',
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled',
  paymentMethod: 'card' | 'cash_on_delivery',
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 4. API Endpoints to Implement

### Authentication
- `POST /api/auth/register` - User registration ✓
- `POST /api/auth/login` - User login ✓
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/password-reset` - Password reset

### Products
- `GET /api/products` - List all products
- `GET /api/products/:sku` - Get product details
- `GET /api/products/category/:slug` - Products by category
- `POST /api/products` (admin) - Create product
- `PUT /api/products/:sku` (admin) - Update product
- `DELETE /api/products/:sku` (admin) - Delete product

### Orders
- `POST /api/orders/create` - Create order (EUR, no VAT)
- `GET /api/orders` - User's orders
- `GET /api/orders/:id` - Order details
- `PUT /api/orders/:id` (admin) - Update order status
- `POST /api/orders/:id/cancel` - Cancel order

### Admin
- `GET /api/admin/users` (admin) - List users
- `GET /api/admin/orders` (admin) - List all orders
- `GET /api/admin/products` (admin) - Inventory management
- `GET /api/admin/analytics` (admin) - Sales analytics

## 5. Installation & Deployment Steps

### Step 1: Install Dependencies
```bash
npm install jsonwebtoken bcryptjs mongodb
```

### Step 2: Create API Routes
All files go in `/api` directory. Vercel auto-detects them.

### Step 3: Database Migration
Create script to seed Unsquashable products:
```bash
node scripts/seedProducts.js
```

### Step 4: Set Environment Variables in Vercel
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add these variables:
   - `MONGODB_URI` (from MongoDB Atlas)
   - `JWT_SECRET` (random key)
   - `ADMIN_PASSWORD`

### Step 5: Deploy
```bash
git add .
git commit -m "Add full backend: auth, products, orders, admin CRM"
git push origin main
```

Vercel auto-deploys when code is pushed.

## 6. Frontend Components to Create

### Pages
- `/register` - User registration page
- `/login` - User login page
- `/account` - User profile & order history
- `/checkout` - Checkout with Stripe
- `/admin` - Enhanced admin CRM dashboard

### Components
- `<LoginForm />` - Login/Register form (tabs)
- `<CartCheckout />` - Checkout flow (enhance existing CartDrawer)
- `<OrderHistory />` - User orders
- `<AdminDashboard />` - CRM interface
- `<ProductManagement />` - Admin product editor
- `<UserManagement />` - Admin user search/edit

## 7. Production Checklist

- [ ] Use bcrypt for password hashing (not base64)
- [ ] Enable JWT refresh tokens (7-day expiry + refresh)
- [ ] Set proper CORS headers
- [ ] Rate limiting on auth endpoints
- [ ] Add input validation & sanitization
- [ ] Use HTTPS only in production
- [ ] Set secure/httpOnly cookies for tokens
- [ ] Add logging & monitoring
- [ ] Configure email notifications (order confirmations)
- [ ] Set production environment variables in Vercel
- [ ] Payment gateway integration for card payments (future)
- [ ] Implement SSL certificate via Vercel

## 8. Testing Accounts

### Admin:
- Email: `admin@racketpoint.bg`
- Password: `racketpoint-admin`

### Test User:
- Email: `user@test.bg`
- Password: `test123`

## Next Steps

1. Install dependencies
2. Create MongoDB cluster and add connection string
3. Create Stripe account and add API keys
4. Create remaining API routes in `/api` folder
5. Build frontend components for login, account, checkout
6. Deploy and test full flow
7. Add product images (currently placeholders)
8. Implement email notifications
