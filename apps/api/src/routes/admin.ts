import {Router} from 'express';
import {z} from 'zod';
import {one, q} from '../db.js';
import {requireAuth} from '../auth.js';
import {ALL_CATEGORIES} from '../catalog.js';
import {getSettings} from '../commission.js';
import {PRODUCT_SELECT, serializeProduct} from '../products.js';
import {addTracking, HttpError, refundItem} from '../lifecycle.js';
import {emailLive, fixedTestOtp, notifyLater, smsLive} from '../providers/messaging.js';
import {gstLookupLive, validateGstin, verifyGstin} from '../providers/gst.js';
import {paymentsLive} from '../providers/payments.js';
import {shiprocketLive} from '../providers/shipping.js';
import {s3Live} from '../providers/storage.js';
import {docLinks} from '../documents.js';

const r = Router();
r.use(requireAuth('admin'));

r.get('/stats', async (_req, res) => {
  const sales = await one(
    `SELECT COALESCE(SUM(line_total), 0) AS gmv, COALESCE(SUM(commission_amt), 0) AS commission,
            COUNT(DISTINCT order_id)::int AS orders
     FROM order_items WHERE status NOT IN ('cancelled','pending_payment','refunded')`,
  );
  const counts = await one(
    `SELECT
       (SELECT COUNT(*) FROM sellers WHERE status = 'pending')::int AS pending_sellers,
       (SELECT COUNT(*) FROM sellers WHERE status = 'approved')::int AS approved_sellers,
       (SELECT COUNT(*) FROM products WHERE status = 'pending')::int AS pending_products,
       (SELECT COUNT(*) FROM products WHERE status = 'approved')::int AS live_products,
       (SELECT COUNT(*) FROM users WHERE role = 'buyer')::int AS buyers,
       (SELECT COUNT(*) FROM order_items WHERE status = 'return_requested')::int AS open_returns,
       (SELECT COUNT(*) FROM order_items WHERE refund_method = 'manual' AND refund_ref IS NULL)::int AS manual_refunds,
       (SELECT COUNT(*) FROM deletion_requests WHERE status = 'open')::int AS deletion_requests`,
  );
  const daily = await q(
    `SELECT to_char(date_trunc('day', o.created_at), 'DD Mon') AS day,
            SUM(oi.line_total)::float AS gmv, SUM(oi.commission_amt)::float AS commission
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.status NOT IN ('cancelled','pending_payment','refunded') AND o.created_at > now() - interval '14 days'
     GROUP BY 1, date_trunc('day', o.created_at) ORDER BY date_trunc('day', o.created_at)`,
  );
  res.json({...sales, ...counts, daily});
});

// ---- Sellers / KYC ----

r.get('/sellers', async (req, res) => {
  const status = req.query.status as string | undefined;
  const rows = await q(
    `SELECT s.*, u.name, u.email, u.phone,
       (SELECT COUNT(*) FROM products p WHERE p.seller_id = s.user_id)::int AS product_count
     FROM sellers s JOIN users u ON u.id = s.user_id
     ${status ? 'WHERE s.status = $1' : ''} ORDER BY s.created_at DESC`,
    status ? [status] : [],
  );
  res.json(rows);
});

r.patch('/sellers/:id', async (req, res) => {
  const b = z
    .object({
      status: z.enum(['approved', 'rejected']).optional(),
      rejectReason: z.string().trim().optional(),
      commissionPct: z.number().min(0).max(100).nullable().optional(),
    })
    .parse(req.body);
  if (b.status === 'rejected' && !b.rejectReason)
    return res.status(400).json({error: 'Give a reason so the seller can fix it'});
  const row = await one(
    `UPDATE sellers SET
       status = COALESCE($2, status),
       reject_reason = CASE WHEN $2 = 'rejected' THEN $3 WHEN $2 = 'approved' THEN NULL ELSE reject_reason END,
       reviewed_at = CASE WHEN $2 IS NOT NULL THEN now() ELSE reviewed_at END,
       commission_pct = CASE WHEN $5 THEN $4 ELSE commission_pct END
     WHERE user_id = $1 RETURNING *`,
    [Number(req.params.id), b.status ?? null, b.rejectReason ?? null, b.commissionPct ?? null, b.commissionPct !== undefined],
  );
  if (!row) return res.status(404).json({error: 'Seller not found'});
  if (b.status === 'approved')
    notifyLater(row.user_id, 'Your KYC is approved 🎉', 'Welcome aboard! Your seller account is verified. You can now list products for free in the Meyra Seller Hub.', {sms: true});
  if (b.status === 'rejected')
    notifyLater(row.user_id, 'KYC needs attention', `We couldn’t verify your KYC: ${b.rejectReason}. Please update your details in Seller Hub → Business & KYC.`, {sms: true});
  res.json(row);
});

r.post('/sellers/:id/gst-check', async (req, res) => {
  const s = await one('SELECT gstin FROM sellers WHERE user_id = $1', [Number(req.params.id)]);
  if (!s) return res.status(404).json({error: 'Seller not found'});
  const check = await verifyGstin(s.gstin);
  await q('UPDATE sellers SET gst_check = $2 WHERE user_id = $1', [Number(req.params.id), JSON.stringify(check)]);
  res.json(check);
});

// ---- Product approval ----

r.get('/products', async (req, res) => {
  const status = req.query.status as string | undefined;
  const rows = await q(
    `${PRODUCT_SELECT} ${status ? 'WHERE p.status = $1' : ''} ORDER BY p.updated_at DESC`,
    status ? [status] : [],
  );
  res.json(rows.map(serializeProduct));
});

r.patch('/products/:id', async (req, res) => {
  const b = z
    .object({
      status: z.enum(['approved', 'rejected']).optional(),
      rejectReason: z.string().trim().optional(),
      featured: z.boolean().optional(),
    })
    .parse(req.body);
  if (b.status === 'rejected' && !b.rejectReason)
    return res.status(400).json({error: 'Give a reason so the seller can fix it'});
  const row = await one(
    `UPDATE products SET
       status = COALESCE($2, status),
       reject_reason = CASE WHEN $2 = 'rejected' THEN $3 WHEN $2 = 'approved' THEN NULL ELSE reject_reason END,
       featured = COALESCE($4, featured)
     WHERE id = $1 RETURNING id, status, featured, seller_id, name`,
    [Number(req.params.id), b.status ?? null, b.rejectReason ?? null, b.featured ?? null],
  );
  if (!row) return res.status(404).json({error: 'Product not found'});
  if (b.status === 'approved') notifyLater(row.seller_id, 'Product approved', `“${row.name}” is now live in the Meyra app.`);
  if (b.status === 'rejected') notifyLater(row.seller_id, 'Product needs changes', `“${row.name}” was not approved: ${b.rejectReason}. Edit it in Seller Hub to resubmit.`);
  res.json(row);
});

// ---- Orders ----

r.get('/orders', async (_req, res) => {
  const rows = await q(
    `SELECT oi.*, o.created_at, o.payment_method, o.payment_status, o.address, u.name AS buyer_name, u.phone AS buyer_phone, s.business_name AS seller_name
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN users u ON u.id = o.buyer_id
     JOIN sellers s ON s.user_id = oi.seller_id
     WHERE oi.status <> 'pending_payment'
     ORDER BY oi.id DESC LIMIT 500`,
  );
  res.json(rows);
});

/** Admin can refund any shipped/delivered/returned line (e.g. damaged item, dispute). */
r.post('/order-items/:id/refund', async (req, res) => {
  const it = await one('SELECT * FROM order_items WHERE id = $1', [Number(req.params.id)]);
  if (!it) throw new HttpError(404, 'Order item not found');
  if (['cancelled', 'refunded', 'pending_payment'].includes(it.status)) throw new HttpError(400, `Item is already ${it.status}`);
  await refundItem(it.id, {
    restock: it.status === 'placed' || it.status === 'return_approved',
    status: it.status === 'placed' ? 'cancelled' : 'refunded',
    note: 'Refunded by Meyra support.',
  });
  res.json({ok: true});
});

/** COD refunds are paid by hand (UPI/bank); record the reference once done. */
r.post('/order-items/:id/manual-refund-done', async (req, res) => {
  const {reference} = z.object({reference: z.string().trim().min(3, 'Enter the UPI/bank reference')}).parse(req.body);
  const it = await one(`UPDATE order_items SET refund_ref = $2 WHERE id = $1 AND refund_method = 'manual' RETURNING *`, [Number(req.params.id), reference]);
  if (!it) throw new HttpError(404, 'No pending manual refund for this item');
  await addTracking(it.id, it.status, `Refund paid (ref ${reference}).`);
  res.json({ok: true});
});

// ---- Account deletion requests (from the public web form) ----

r.get('/deletion-requests', async (_req, res) => {
  res.json(await q(`SELECT * FROM deletion_requests ORDER BY status, id DESC LIMIT 200`));
});

r.post('/deletion-requests/:id/done', async (req, res) => {
  await q(`UPDATE deletion_requests SET status = 'done', done_at = now() WHERE id = $1`, [Number(req.params.id)]);
  res.json({ok: true});
});

// ---- Integrations & outbox ----

r.get('/integrations', (_req, res) => {
  res.json([
    {key: 'payments', name: 'Razorpay payments', live: paymentsLive, env: 'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET'},
    {key: 'sms', name: fixedTestOtp ? `SMS & OTP (MSG91) — FIXED TEST OTP ${fixedTestOtp} ACTIVE` : 'SMS & OTP (MSG91)', live: smsLive, env: 'MSG91_AUTH_KEY, MSG91_OTP_TEMPLATE_ID, MSG91_FLOW_TEMPLATE_ID, FIXED_TEST_OTP'},
    {key: 'email', name: 'Email (SMTP)', live: emailLive, env: 'SMTP_URL, MAIL_FROM'},
    {key: 'gst', name: 'Live GSTIN lookup', live: gstLookupLive, env: 'GST_LOOKUP_URL, GST_LOOKUP_KEY'},
    {key: 'shipping', name: 'Shiprocket shipping', live: shiprocketLive, env: 'SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_PICKUP_LOCATION'},
    {key: 'storage', name: 'Cloud storage (S3/R2)', live: s3Live, env: 'S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY'},
  ]);
});

r.get('/notifications', async (_req, res) => {
  const rows = await q(
    `SELECT n.*, u.name AS user_name FROM notifications n LEFT JOIN users u ON u.id = n.user_id
     WHERE n.channel <> 'inapp' ORDER BY n.id DESC LIMIT 200`);
  res.json(rows);
});

// ---- Commission settings ----

r.get('/settings', async (_req, res) => {
  res.json({...(await getSettings()), categories: ALL_CATEGORIES});
});

r.put('/settings', async (req, res) => {
  const b = z
    .object({
      defaultCommissionPct: z.number().min(0).max(100),
      categoryCommission: z.record(z.string(), z.number().min(0).max(100)),
    })
    .parse(req.body);
  await q(`UPDATE settings SET value = $1 WHERE key = 'default_commission_pct'`, [JSON.stringify(b.defaultCommissionPct)]);
  await q(`UPDATE settings SET value = $1 WHERE key = 'category_commission'`, [JSON.stringify(b.categoryCommission)]);
  res.json(await getSettings());
});

// ---- Payouts ----

r.get('/payouts', async (_req, res) => {
  const rows = await q(
    `SELECT s.user_id AS seller_id, s.business_name, s.bank_account, s.bank_ifsc,
       COALESCE((SELECT SUM(seller_amt) FROM order_items WHERE seller_id = s.user_id AND status = 'delivered'), 0)::float AS earned,
       COALESCE((SELECT SUM(amount) FROM payouts WHERE seller_id = s.user_id), 0)::float AS paid
     FROM sellers s WHERE s.status = 'approved' ORDER BY s.business_name`,
  );
  const history = await q(
    `SELECT p.*, s.business_name FROM payouts p JOIN sellers s ON s.user_id = p.seller_id ORDER BY p.id DESC LIMIT 100`,
  );
  res.json({balances: rows.map(x => ({...x, balance: x.earned - x.paid})), history});
});

r.post('/payouts', async (req, res) => {
  const b = z
    .object({sellerId: z.number().int(), amount: z.number().positive(), reference: z.string().trim().optional()})
    .parse(req.body);
  const bal = await one(
    `SELECT COALESCE((SELECT SUM(seller_amt) FROM order_items WHERE seller_id = $1 AND status = 'delivered'), 0)::float
          - COALESCE((SELECT SUM(amount) FROM payouts WHERE seller_id = $1), 0)::float AS balance`,
    [b.sellerId],
  );
  if (b.amount > bal!.balance + 0.001)
    return res.status(400).json({error: `Amount exceeds balance of ₹${bal!.balance.toFixed(2)}`});
  const row = await one(`INSERT INTO payouts(seller_id, amount, reference) VALUES ($1,$2,$3) RETURNING *`, [
    b.sellerId, b.amount, b.reference ?? null,
  ]);
  res.status(201).json(row);
});

// ---- Review moderation ----

r.get('/reviews', async (_req, res) => {
  const rows = await q(
    `SELECT r.*, u.name AS user_name, p.name AS product_name FROM reviews r
     JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
     ORDER BY r.id DESC LIMIT 200`,
  );
  res.json(rows);
});

r.delete('/reviews/:id', async (req, res) => {
  await q('DELETE FROM reviews WHERE id = $1', [Number(req.params.id)]);
  res.json({ok: true});
});

// ---- Detail pages ----

const SALES = `SELECT COALESCE(SUM(qty) FILTER (WHERE status NOT IN ('cancelled','pending_payment','refunded')), 0)::int AS units,
  COALESCE(SUM(line_total) FILTER (WHERE status NOT IN ('cancelled','pending_payment','refunded')), 0) AS revenue,
  COALESCE(SUM(commission_amt) FILTER (WHERE status NOT IN ('cancelled','pending_payment','refunded')), 0) AS commission,
  COUNT(*) FILTER (WHERE status IN ('return_requested','return_approved','refunded'))::int AS returns
  FROM order_items`;

r.get('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const row = await one(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  if (!row) throw new HttpError(404, 'Product not found');
  const sales = await one(`${SALES} WHERE product_id = $1`, [id]);
  const reviews = await q(
    `SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = $1 ORDER BY r.id DESC LIMIT 50`, [id]);
  const orders = await q(
    `SELECT oi.id, oi.order_id, oi.qty, oi.line_total, oi.status, oi.option, oi.size, o.created_at, u.name AS buyer_name
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN users u ON u.id = o.buyer_id
     WHERE oi.product_id = $1 AND oi.status <> 'pending_payment' ORDER BY oi.id DESC LIMIT 20`, [id]);
  res.json({product: serializeProduct(row), sales, reviews, orders});
});

r.get('/sellers/:id', async (req, res) => {
  const id = Number(req.params.id);
  const seller = await one(
    `SELECT s.*, u.name, u.email, u.phone, u.created_at AS joined_at FROM sellers s JOIN users u ON u.id = s.user_id WHERE s.user_id = $1`, [id]);
  if (!seller) throw new HttpError(404, 'Seller not found');
  const sales = await one(`${SALES} WHERE seller_id = $1`, [id]);
  const money = await one(
    `SELECT COALESCE((SELECT SUM(seller_amt) FROM order_items WHERE seller_id = $1 AND status = 'delivered'), 0)::float AS earned,
            COALESCE((SELECT SUM(amount) FROM payouts WHERE seller_id = $1), 0)::float AS paid`, [id]);
  const products = await q(`${PRODUCT_SELECT} WHERE p.seller_id = $1 ORDER BY p.updated_at DESC`, [id]);
  const orders = await q(
    `SELECT oi.id, oi.order_id, oi.name, oi.image, oi.qty, oi.line_total, oi.status, o.created_at, u.name AS buyer_name
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN users u ON u.id = o.buyer_id
     WHERE oi.seller_id = $1 AND oi.status <> 'pending_payment' ORDER BY oi.id DESC LIMIT 20`, [id]);
  const payouts = await q(`SELECT * FROM payouts WHERE seller_id = $1 ORDER BY id DESC`, [id]);
  res.json({seller, sales, money: {...money, balance: money!.earned - money!.paid}, products: products.map(serializeProduct), orders, payouts});
});

r.get('/orders/:id', async (req, res) => {
  const id = Number(req.params.id);
  const order = await one(
    `SELECT o.*, u.name AS buyer_name, u.email AS buyer_email, u.phone AS buyer_phone
     FROM orders o JOIN users u ON u.id = o.buyer_id WHERE o.id = $1`, [id]);
  if (!order) throw new HttpError(404, 'Order not found');
  const items = await q(
    `SELECT oi.*, s.business_name AS seller_name FROM order_items oi JOIN sellers s ON s.user_id = oi.seller_id
     WHERE oi.order_id = $1 ORDER BY oi.id`, [id]);
  res.json({...order, items: items.map(i => ({...i, ...docLinks(i)}))});
});

// ---- Marketplace tax settings and monthly TCS / TDS report ----

r.get('/tax-settings', async (_req, res) => {
  const s = await getSettings();
  res.json({commissionGstPct: s.commissionGstPct, tcsPct: s.tcsPct, tdsPct: s.tdsPct, platform: s.platform});
});

r.put('/tax-settings', async (req, res) => {
  const b = z.object({
    commissionGstPct: z.number().min(0).max(28),
    tcsPct: z.number().min(0).max(5),
    tdsPct: z.number().min(0).max(5),
    platform: z.object({
      name: z.string().trim().min(2),
      gstin: z.string().trim().toUpperCase().refine(g => g === '' || !validateGstin(g), 'Invalid GSTIN'),
      address: z.string().trim(),
    }),
  }).parse(req.body);
  for (const [k, v] of [['commission_gst_pct', b.commissionGstPct], ['tcs_pct', b.tcsPct], ['tds_pct', b.tdsPct], ['platform', b.platform]] as const)
    await q(`INSERT INTO settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`, [k, JSON.stringify(v)]);
  res.json({ok: true});
});

/** Per-seller totals for one month: what to deposit as GST TCS (GSTR-8) and income-tax TDS (194-O), plus commission earned. */
r.get('/tax-report', async (req, res) => {
  const month = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM').parse(req.query.month);
  const rows = await q(
    `SELECT s.user_id AS seller_id, s.business_name, s.gstin, s.pan,
            COUNT(*)::int AS lines,
            SUM(oi.line_total)::float AS gross, SUM(oi.taxable_value)::float AS taxable,
            SUM(oi.cgst + oi.sgst + oi.igst)::float AS gst,
            SUM(oi.tcs_amt)::float AS tcs, SUM(oi.tds_amt)::float AS tds,
            SUM(oi.commission_amt)::float AS commission, SUM(oi.commission_gst)::float AS commission_gst
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN sellers s ON s.user_id = oi.seller_id
     WHERE oi.status NOT IN ('cancelled','pending_payment','refunded')
       AND date_trunc('month', o.created_at AT TIME ZONE 'Asia/Kolkata') = to_date($1, 'YYYY-MM')
     GROUP BY s.user_id ORDER BY s.business_name`, [month]);
  res.json({month, rows});
});

export default r;
