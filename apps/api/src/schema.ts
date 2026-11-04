// Idempotent schema: safe to run on every cold start.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('buyer', 'seller', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per seller account. KYC must be approved before products can be listed.
CREATE TABLE IF NOT EXISTS sellers (
  user_id        INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name  TEXT NOT NULL,
  gstin          TEXT NOT NULL UNIQUE,
  pan            TEXT NOT NULL,
  address        TEXT,
  bank_account   TEXT,
  bank_ifsc      TEXT,
  gst_doc        TEXT,
  pan_doc        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason  TEXT,
  commission_pct NUMERIC(5,2),            -- per-seller override; NULL = use category/default
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  seller_id     INT NOT NULL REFERENCES sellers(user_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  grp           TEXT NOT NULL,
  category      TEXT NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  mrp           NUMERIC(10,2) NOT NULL,
  stock         INT NOT NULL DEFAULT 0,
  images        JSONB NOT NULL DEFAULT '[]',
  skin_types    JSONB NOT NULL DEFAULT '[]',
  hair_types    JSONB NOT NULL DEFAULT '[]',
  sizes         JSONB NOT NULL DEFAULT '[]',
  option_label  TEXT,                     -- 'Shade' | 'Colour'
  options       JSONB NOT NULL DEFAULT '[]', -- [{name, hex, images?}]
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,
  featured      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS products_seller_idx ON products(seller_id);

CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  buyer_id       INT NOT NULL REFERENCES users(id),
  address        JSONB NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'COD',
  subtotal       NUMERIC(10,2) NOT NULL,
  delivery_fee   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total          NUMERIC(10,2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each line belongs to one seller; commission is frozen at order time.
CREATE TABLE IF NOT EXISTS order_items (
  id             SERIAL PRIMARY KEY,
  order_id       INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     INT NOT NULL REFERENCES products(id),
  seller_id      INT NOT NULL REFERENCES sellers(user_id),
  name           TEXT NOT NULL,
  image          TEXT,
  option         TEXT,
  size           TEXT,
  qty            INT NOT NULL,
  unit_price     NUMERIC(10,2) NOT NULL,
  line_total     NUMERIC(10,2) NOT NULL,
  commission_pct NUMERIC(5,2) NOT NULL,
  commission_amt NUMERIC(10,2) NOT NULL,
  seller_amt     NUMERIC(10,2) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'shipped', 'delivered', 'cancelled')),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_items_seller_idx ON order_items(seller_id);

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id),
  rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       TEXT NOT NULL DEFAULT '',
  photos     JSONB NOT NULL DEFAULT '[]',
  verified   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product_id);

CREATE TABLE IF NOT EXISTS payouts (
  id         SERIAL PRIMARY KEY,
  seller_id  INT NOT NULL REFERENCES sellers(user_id),
  amount     NUMERIC(10,2) NOT NULL,
  reference  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
INSERT INTO settings(key, value) VALUES
  ('default_commission_pct', '10'),
  ('category_commission', '{}')
ON CONFLICT (key) DO NOTHING;

-- ===== v2: payments, shipping, returns, notifications, OTP =====

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'cod';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;   -- Razorpay payment link id
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('cod', 'pending', 'paid', 'failed'));

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_status_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_status_check CHECK (status IN (
  'pending_payment', 'placed', 'shipped', 'delivered', 'cancelled',
  'return_requested', 'return_approved', 'refunded'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS courier TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS awb TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tracking JSONB NOT NULL DEFAULT '[]';  -- [{status, note, at}]
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_reason TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_photos JSONB NOT NULL DEFAULT '[]';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_note TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS refund_method TEXT;   -- 'gateway' | 'manual'
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS refund_ref TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS gst_check JSONB;          -- checksum + optional live lookup result

CREATE TABLE IF NOT EXISTS otp_codes (
  phone      TEXT PRIMARY KEY,
  code_hash  TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INT NOT NULL DEFAULT 0,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every message we send (or would send, without provider keys). Doubles as in-app inbox.
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL,            -- 'sms' | 'email' | 'inapp'
  to_addr    TEXT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL,            -- 'sent' | 'logged' | 'failed'
  error      TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);

-- ===== v3: sessions, password reset, account deletion =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;  -- bump to sign out everywhere
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS password_resets (
  email      TEXT PRIMARY KEY,
  code_hash  TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INT NOT NULL DEFAULT 0,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== v4: GST invoices, marketplace deductions, variant stock, seller agreement =====
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_stock JSONB NOT NULL DEFAULT '{}';  -- {"Shade|Size": qty}

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS hsn TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS taxable_value NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cgst NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sgst NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS igst NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS commission_gst NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tcs_amt NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tds_amt NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS invoice_no TEXT UNIQUE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ;

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS agreed_at TIMESTAMPTZ;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS on_holiday BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS invoice_counters (
  seller_id INT NOT NULL REFERENCES sellers(user_id) ON DELETE CASCADE,
  fy        TEXT NOT NULL,
  last      INT NOT NULL,
  PRIMARY KEY (seller_id, fy)
);

INSERT INTO settings(key, value) VALUES
  ('commission_gst_pct', '18'),
  ('tcs_pct', '1'),
  ('tds_pct', '0.1'),
  ('platform', '{"name": "Meyra", "gstin": "", "address": "Bengaluru, Karnataka 560075"}')
ON CONFLICT (key) DO NOTHING;
`;
