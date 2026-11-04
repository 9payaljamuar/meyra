import {Router} from 'express';
import {z} from 'zod';
import {one, q} from '../db.js';
import {optionalAuth, requireAuth} from '../auth.js';
import {CATEGORIES, GROUPS, HAIR_TYPES, SIZES, SKIN_TYPES} from '../catalog.js';
import {PRODUCT_SELECT, serializeProduct} from '../products.js';
import {GST_RATES, STATE_NAMES, TAX_DEFAULTS} from '../tax.js';
import {paymentsLive} from '../providers/payments.js';
import {emailLive, fixedTestOtp, smsLive} from '../providers/messaging.js';

const r = Router();

r.get('/meta', (_req, res) => {
  res.json({groups: GROUPS, categories: CATEGORIES, skinTypes: SKIN_TYPES, hairTypes: HAIR_TYPES, sizes: SIZES,
    gstRates: GST_RATES, taxDefaults: TAX_DEFAULTS, states: STATE_NAMES.map(s => s.name),
    // What clients may offer right now. Outside production, test modes count as available.
    features: {
      onlinePayment: paymentsLive || process.env.NODE_ENV !== 'production',
      phoneLogin: smsLive || !!fixedTestOtp || process.env.NODE_ENV !== 'production',
      emailReset: emailLive || process.env.NODE_ENV !== 'production',
      testMode: !paymentsLive,
    }});
});

const list = (v: unknown) =>
  typeof v === 'string' && v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];

const SORTS: Record<string, string> = {
  popular: 'review_count DESC, p.id DESC',
  newest: 'p.created_at DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  discount: 'discount DESC',
  rating: 'rating DESC, review_count DESC',
};

r.get('/products', async (req, res) => {
  const where = [`p.status = 'approved'`, `s.status = 'approved'`, `NOT s.on_holiday`];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replace('$?', `$${params.length}`));
  };
  const Q = req.query;

  if (Q.q) add(`(p.name || ' ' || p.category || ' ' || p.grp || ' ' || s.business_name) ILIKE $?`, `%${Q.q}%`);
  if (Q.group) add('p.grp = $?', Q.group);
  if (Q.category) add('p.category = $?', Q.category);
  if (Q.seller) add('p.seller_id = $?', Number(Q.seller));
  if (Q.featured === 'true') where.push('p.featured');
  const skin = list(Q.skin);
  if (skin.length) add('p.skin_types ?| $?::text[]', skin);
  const hair = list(Q.hair);
  if (hair.length) add('p.hair_types ?| $?::text[]', hair);
  if (Q.minPrice) add('p.price >= $?', Number(Q.minPrice));
  if (Q.maxPrice) add('p.price < $?', Number(Q.maxPrice));
  if (Q.minDiscount) add('ROUND((p.mrp - p.price) * 100 / NULLIF(p.mrp, 0)) >= $?', Number(Q.minDiscount));
  const ids = list(Q.ids).map(Number).filter(Boolean);
  if (ids.length) add('p.id = ANY($?::int[])', ids);

  const order = SORTS[String(Q.sort ?? 'popular')] ?? SORTS.popular;
  const limit = Math.min(Number(Q.limit) || 100, 200);
  const rows = await q(
    `SELECT * FROM (${PRODUCT_SELECT} WHERE ${where.join(' AND ')}) p ORDER BY ${order.replaceAll('p.', '')} LIMIT ${limit}`,
    params,
  );
  res.json(rows.map(serializeProduct));
});

r.get('/products/:id', optionalAuth, async (req, res) => {
  const row = await one(`${PRODUCT_SELECT} WHERE p.id = $1`, [Number(req.params.id)]);
  const u = req.user;
  const canSee = row && (row.status === 'approved' || u?.role === 'admin' || u?.id === row.seller_id);
  if (!canSee) return res.status(404).json({error: 'Product not found'});
  res.json(serializeProduct(row));
});

r.get('/products/:id/reviews', async (req, res) => {
  const rows = await q(
    `SELECT r.id, r.rating, r.text, r.photos, r.verified, r.created_at, u.name
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 50`,
    [Number(req.params.id)],
  );
  res.json(rows.map(x => ({...x, createdAt: x.created_at, created_at: undefined})));
});

r.post('/products/:id/reviews', requireAuth('buyer'), async (req, res) => {
  const b = z
    .object({
      rating: z.number().int().min(1).max(5),
      text: z.string().trim().max(2000).default(''),
      photos: z.array(z.string()).max(5).default([]),
    })
    .parse(req.body);
  const productId = Number(req.params.id);
  const product = await one(`SELECT id FROM products WHERE id = $1 AND status = 'approved'`, [productId]);
  if (!product) return res.status(404).json({error: 'Product not found'});
  const bought = await one(
    `SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.buyer_id = $1 AND oi.product_id = $2 AND oi.status <> 'cancelled'`,
    [req.user!.id, productId],
  );
  const row = await one(
    `INSERT INTO reviews(product_id, user_id, rating, text, photos, verified)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [productId, req.user!.id, b.rating, b.text, JSON.stringify(b.photos), !!bought],
  );
  res.status(201).json(row);
});

export default r;
