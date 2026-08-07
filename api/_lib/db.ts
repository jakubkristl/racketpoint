import { sql } from '@vercel/postgres';

let schemaReady = false;

function env(name: string, fallback = '') {
  return (process.env[name] ?? fallback).trim();
}

async function seedDefaultAdmin() {
  const email = env('ADMIN_EMAIL', 'admin@racketpoint.bg').toLowerCase();
  const passwordHash = env('ADMIN_PASSWORD_HASH');

  if (!passwordHash) {
    return;
  }

  await sql`
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (${`adm_${Date.now().toString(36)}`}, 'Racketpoint Admin', ${email}, ${passwordHash}, 'ADMIN')
    ON CONFLICT (email) DO NOTHING
  `;
}

export async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verification_token TEXT,
      email_verification_sent_at TIMESTAMPTZ,
      password_reset_token TEXT,
      password_reset_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS addresses JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ`;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      brand TEXT NOT NULL,
      sport TEXT NOT NULL,
      sub_category TEXT NOT NULL,
      cost_price NUMERIC(10,2) NOT NULL,
      selling_price NUMERIC(10,2) NOT NULL,
      discount_price NUMERIC(10,2),
      stock INT NOT NULL DEFAULT 0,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
      sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
      weight_grams INT,
      balance TEXT,
      rating NUMERIC(3,2) NOT NULL DEFAULT 4.50,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      total_amount NUMERIC(10,2) NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_provider TEXT,
      payment_reference TEXT,
      idempotency_key TEXT,
      address JSONB,
      items JSONB NOT NULL,
      notes TEXT,
      stock_reverted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_reverted_at TIMESTAMPTZ`;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      delta_quantity INT NOT NULL,
      reason TEXT NOT NULL,
      order_id TEXT,
      actor TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS borica_payments (
      gateway_order TEXT PRIMARY KEY,
      amount NUMERIC(10,2),
      currency TEXT,
      rc TEXT,
      action TEXT,
      rrn TEXT,
      int_ref TEXT,
      signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_products_sport ON products (sport)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (email)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_stock_movements_sku ON stock_movements (sku)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_stock_movements_order ON stock_movements (order_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_borica_status ON borica_payments (status)`;

  await seedDefaultAdmin();
  schemaReady = true;
}

export { sql };
