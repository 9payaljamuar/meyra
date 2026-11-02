import {Router} from 'express';
import {z} from 'zod';
import {one, q} from '../db.js';
import {requireAuth} from '../auth.js';
import {ALL_CATEGORIES, CATEGORIES, GROUPS} from '../catalog.js';
import {PRODUCT_SELECT, serializeProduct} from '../products.js';
import {addTracking, HttpError, refundItem} from '../lifecycle.js';
import {notifyLater} from '../providers/messaging.js';
import {bookShiprocket, COURIERS, shiprocketLive, trackingUrl} from '../providers/shipping.js';

const r = Router();
r.use(requireAuth('seller'));

async function seller(userId: number) {
  return one('SELECT * FROM sellers WHERE user_id = $1', [userId]);
}

r.get('/profile', async (req, res) => {
  const s = await seller(req.user!.id);
  const u = await one('SELECT name, email, phone FROM users WHERE id = $1', [req.user!.id]);
  res.json({...u, ...s});
});

r.patch('/profile', async (req, res) => {
  const b = z
    .object({
      businessName: z.string().trim().min(2).optional(),
      address: z.string().trim().optional(),
      bankAccount: z.string().trim().regex(/^\d{9,18}$/, 'Invalid account number').optional(),
      bankIfsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC').optional(),
      gstDoc: z.string().optional(),
      panDoc: z.string().optional(),
    })
    .parse(req.body);
  // Rejected sellers who update their KYC go back into the review queue.
  const row = await one(
    `UPDATE sellers SET
       business_name = COALESCE($2, business_name), address = COALESCE($3, address),
       bank_account = COALESCE($4, bank_account), bank_ifsc = COALESCE($5, bank_ifsc),
       gst_doc = COALESCE($6, gst_doc), pan_doc = COALESCE($7, pan_doc),
       status = CASE WHEN status = 'rejected' THEN 'pending' ELSE status END,
       reject_reason = CASE WHEN status = 'rejected' THEN NULL ELSE reject_reason END
     WHERE user_id = $1 RETURNING *`,
    [req.user!.id, b.businessName, b.address, b.bankAccount, b.bankIfsc, b.gstDoc, b.panDoc],
  );
  res.json(row);
});

const OptionValue = z.object({
  name: z.string().trim().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  images: z.array(z.string()).optional(),
});

const ProductBody = z
  .object({
    name: z.string().trim().min(3),
    description: z.string().trim().default(''),
    group: z.enum(GROUPS),
    category: z.string().refine(c => ALL_CATEGORIES.includes(c), 'Unknown category'),
    price: z.number().positive(),
    mrp: z.number().positive(),
    stock: z.number().int().min(0),
    images: z.array(z.string()).min(1, 'Add at least one image').max(8),
    skinTypes: z.array(z.string()).default([]),
    hairTypes: z.array(z.string()).default([]),
    sizes: z.array(z.string()).default([]),
    option: z.object({label: z.enum(['Shade', 'Colour']), values: z.array(OptionValue).min(1)}).nullable().default(null),
  })
  .refine(b => b.price <= b.mrp, {message: 'Selling price cannot be above MRP', path: ['price']})
  .refine(b => CATEGORIES[b.group].includes(b.category), {message: 'Category does not belong to group', path: ['category']});

async function requireApproved(userId: number) {
  const s = await seller(userId);
  return s?.status === 'approved';
}

r.get('/products', async (req, res) => {
  const rows = await q(`${PRODUCT_SELECT} WHERE p.seller_id = $1 ORDER BY p.updated_at DESC`, [req.user!.id]);
  res.json(rows.map(serializeProduct));
});

r.post('/products', async (req, res) => {
  if (!(await requireApproved(req.user!.id)))
    return res.status(403).json({error: 'Your KYC must be approved before you can list products'});
  const b = ProductBody.parse(req.body);
  const row = await one(
    `INSERT INTO products(seller_id, name, description, grp, category, price, mrp, stock, images,
       skin_types, hair_types, sizes, option_label, options)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [req.user!.id, b.name, b.description, b.group, b.category, b.price, b.mrp, b.stock,
      JSON.stringify(b.images), JSON.stringify(b.skinTypes), JSON.stringify(b.hairTypes),
      JSON.stringify(b.sizes), b.option?.label ?? null, JSON.stringify(b.option?.values ?? [])],
  );
  res.status(201).json(row);
});

// Any content edit sends the product back for admin approval; stock-only edits don't.
r.put('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const cur = await one('SELECT * FROM products WHERE id = $1 AND seller_id = $2', [id, req.user!.id]);
  if (!cur) return res.status(404).json({error: 'Product not found'});
  const b = ProductBody.parse(req.body);
  const contentChanged =
    cur.name !== b.name || cur.description !== b.description || cur.grp !== b.group ||
    cur.category !== b.category || cur.price !== b.price || cur.mrp !== b.mrp ||
    JSON.stringify(cur.images) !== JSON.stringify(b.images) ||
    JSON.stringify(cur.options) !== JSON.stringify(b.option?.values ?? []) ||
    JSON.stringify(cur.skin_types) !== JSON.stringify(b.skinTypes) ||
    JSON.stringify(cur.hair_types) !== JSON.stringify(b.hairTypes) ||
    JSON.stringify(cur.sizes) !== JSON.stringify(b.sizes);
  await q(
    `UPDATE products SET name=$3, description=$4, grp=$5, category=$6, price=$7, mrp=$8, stock=$9, images=$10,
       skin_types=$11, hair_types=$12, sizes=$13, option_label=$14, options=$15, updated_at=now(),
       status = CASE WHEN $16 THEN 'pending' ELSE status END,
       reject_reason = CASE WHEN $16 THEN NULL ELSE reject_reason END
     WHERE id = $1 AND seller_id = $2`,
    [id, req.user!.id, b.name, b.description, b.group, b.category, b.price, b.mrp, b.stock,
      JSON.stringify(b.images), JSON.stringify(b.skinTypes), JSON.stringify(b.hairTypes),
      JSON.stringify(b.sizes), b.option?.label ?? null, JSON.stringify(b.option?.values ?? []), contentChanged],
  );
  res.json({ok: true, resubmitted: contentChanged});
});

r.delete('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const sold = await one('SELECT 1 FROM order_items WHERE product_id = $1', [id]);
  if (sold) {
    // Keep history intact; just take it off sale.
    await q(`UPDATE products SET stock = 0 WHERE id = $1 AND seller_id = $2`, [id, req.user!.id]);
    return res.json({ok: true, archived: true});
  }
  await q('DELETE FROM products WHERE id = $1 AND seller_id = $2', [id, req.user!.id]);
  res.json({ok: true});
});

r.get('/orders', async (req, res) => {
  const rows = await q(
    `SELECT oi.*, o.address, o.payment_method, o.payment_status, o.created_at, u.name AS buyer_name
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN users u ON u.id = o.buyer_id
     WHERE oi.seller_id = $1 AND oi.status <> 'pending_payment' ORDER BY oi.id DESC`,
    [req.user!.id],
  );
  res.json(rows);
});

r.get('/shipping-options', (_req, res) => {
  res.json({couriers: Object.keys(COURIERS), shiprocket: shiprocketLive});
});

const ItemAction = z.discriminatedUnion('status', [
  z.object({status: z.literal('shipped'), courier: z.string().optional(), awb: z.string().trim().optional(), shiprocket: z.boolean().optional()}),
  z.object({status: z.literal('delivered')}),
  z.object({status: z.literal('cancelled'), note: z.string().optional()}),
  z.object({status: z.literal('return_approved'), note: z.string().optional()}),
  z.object({status: z.literal('return_rejected'), note: z.string().trim().min(3, 'Give the customer a reason')}),
  z.object({status: z.literal('refunded')}),
]);

r.patch('/order-items/:id', async (req, res) => {
  const b = ItemAction.parse(req.body);
  const it = await one(
    `SELECT oi.*, o.address, o.created_at AS order_date, o.payment_status, o.buyer_id, u.email AS buyer_email
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN users u ON u.id = o.buyer_id
     WHERE oi.id = $1 AND oi.seller_id = $2`,
    [Number(req.params.id), req.user!.id],
  );
  if (!it) return res.status(404).json({error: 'Order item not found'});
  const need = (from: string) => {
    if (it.status !== from) throw new HttpError(400, `This item is ${it.status.replace('_', ' ')} — that action isn't available`);
  };

  switch (b.status) {
    case 'shipped': {
      need('placed');
      let ship: {courier: string; awb: string; trackingUrl: string};
      if (b.shiprocket) {
        ship = await bookShiprocket({
          itemId: it.id, orderDate: new Date(it.order_date), name: it.name, sku: `P${it.product_id}`, qty: it.qty,
          price: Number(it.unit_price), prepaid: it.payment_status === 'paid', address: it.address, email: it.buyer_email,
        });
      } else {
        if (!b.courier || !b.awb) throw new HttpError(400, 'Enter the courier and AWB / tracking number');
        ship = {courier: b.courier, awb: b.awb, trackingUrl: trackingUrl(b.courier, b.awb)};
      }
      await q(
        `UPDATE order_items SET status = 'shipped', courier = $2, awb = $3, tracking_url = $4, shipped_at = now(), updated_at = now() WHERE id = $1`,
        [it.id, ship.courier, ship.awb, ship.trackingUrl],
      );
      await addTracking(it.id, 'shipped', `Shipped with ${ship.courier}. AWB ${ship.awb}`);
      notifyLater(it.buyer_id, `Your order #${it.order_id} has shipped`,
        `${it.name} is on its way with ${ship.courier} (AWB ${ship.awb}). Track it here: ${ship.trackingUrl}`, {sms: true});
      break;
    }
    case 'delivered':
      need('shipped');
      await q(`UPDATE order_items SET status = 'delivered', delivered_at = now(), updated_at = now() WHERE id = $1`, [it.id]);
      await addTracking(it.id, 'delivered', 'Delivered.');
      notifyLater(it.buyer_id, `Delivered: ${it.name}`,
        `Your order #${it.order_id} was delivered. Loved it? Leave a review in the Meyra app. Not right? You can return it within 7 days.`);
      break;
    case 'cancelled':
      need('placed');
      await refundItem(it.id, {restock: true, status: 'cancelled', note: b.note ? `Cancelled by seller: ${b.note}` : 'Cancelled by seller.'});
      notifyLater(it.buyer_id, `Order #${it.order_id}: item cancelled`,
        `Sorry — the seller couldn’t fulfil ${it.name}${b.note ? ` (${b.note})` : ''}. Any payment for it will be refunded.`, {sms: true});
      break;
    case 'return_approved':
      need('return_requested');
      await q(`UPDATE order_items SET status = 'return_approved', return_note = $2, updated_at = now() WHERE id = $1`, [it.id, b.note ?? null]);
      await addTracking(it.id, 'return_approved', 'Return approved. Pickup will be arranged.');
      notifyLater(it.buyer_id, 'Return approved',
        `Your return for ${it.name} is approved. Please keep it packed with tags — pickup will be arranged shortly. Your refund is issued once it reaches the seller.`, {sms: true});
      break;
    case 'return_rejected':
      need('return_requested');
      await q(`UPDATE order_items SET status = 'delivered', return_note = $2, updated_at = now() WHERE id = $1`, [it.id, b.note]);
      await addTracking(it.id, 'return_rejected', `Return declined: ${b.note}`);
      notifyLater(it.buyer_id, 'Return request declined',
        `Your return for ${it.name} was declined: “${b.note}”. Contact support@meyraglory.com if you need help.`);
      break;
    case 'refunded':
      need('return_approved');
      await refundItem(it.id, {restock: true, status: 'refunded', note: 'Return received. Refund issued.'});
      break;
  }
  res.json({ok: true});
});

r.get('/earnings', async (req, res) => {
  const id = req.user!.id;
  const sum = await one(
    `SELECT
       COALESCE(SUM(line_total) FILTER (WHERE status NOT IN ('cancelled','pending_payment','refunded')), 0) AS gross,
       COALESCE(SUM(commission_amt) FILTER (WHERE status NOT IN ('cancelled','pending_payment','refunded')), 0) AS commission,
       COALESCE(SUM(seller_amt) FILTER (WHERE status = 'delivered'), 0) AS earned,
       COALESCE(SUM(seller_amt) FILTER (WHERE status IN ('placed','shipped','return_requested','return_approved')), 0) AS pending,
       COALESCE(SUM(line_total) FILTER (WHERE status = 'refunded'), 0) AS refunded
     FROM order_items WHERE seller_id = $1`,
    [id],
  );
  const paid = await one(`SELECT COALESCE(SUM(amount), 0)::float AS paid FROM payouts WHERE seller_id = $1`, [id]);
  const payouts = await q(`SELECT * FROM payouts WHERE seller_id = $1 ORDER BY id DESC`, [id]);
  res.json({...sum, paid: paid!.paid, balance: sum!.earned - paid!.paid, payouts});
});

r.get('/notifications', async (req, res) => {
  const rows = await q(
    `SELECT id, title, body, read_at, created_at FROM notifications
     WHERE user_id = $1 AND channel = 'inapp' ORDER BY id DESC LIMIT 30`, [req.user!.id]);
  res.json(rows);
});

r.post('/notifications/read', async (req, res) => {
  await q(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [req.user!.id]);
  res.json({ok: true});
});

r.get('/stats', async (req, res) => {
  const id = req.user!.id;
  const products = await q(`SELECT status, COUNT(*)::int AS n FROM products WHERE seller_id = $1 GROUP BY status`, [id]);
  const orders = await q(`SELECT status, COUNT(*)::int AS n FROM order_items WHERE seller_id = $1 AND status <> 'pending_payment' GROUP BY status`, [id]);
  const lowStock = await q(
    `SELECT id, name, stock FROM products WHERE seller_id = $1 AND status = 'approved' AND stock < 5 ORDER BY stock`,
    [id],
  );
  res.json({
    products: Object.fromEntries(products.map(x => [x.status, x.n])),
    orders: Object.fromEntries(orders.map(x => [x.status, x.n])),
    lowStock,
  });
});

// ---- Detail pages ----

r.get('/order-items/:id', async (req, res) => {
  const it = await one(
    `SELECT oi.*, o.address, o.payment_method, o.payment_status, o.created_at, o.total AS order_total, u.name AS buyer_name
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN users u ON u.id = o.buyer_id
     WHERE oi.id = $1 AND oi.seller_id = $2 AND oi.status <> 'pending_payment'`,
    [Number(req.params.id), req.user!.id]);
  if (!it) throw new HttpError(404, 'Order not found');
  res.json(it);
});

r.get('/products/:id/overview', async (req, res) => {
  const id = Number(req.params.id);
  const row = await one(`${PRODUCT_SELECT} WHERE p.id = $1 AND p.seller_id = $2`, [id, req.user!.id]);
  if (!row) throw new HttpError(404, 'Product not found');
  const sales = await one(
    `SELECT COALESCE(SUM(qty) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::int AS units,
            COALESCE(SUM(seller_amt) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0) AS earnings,
            COUNT(*) FILTER (WHERE status IN ('return_requested','return_approved','refunded'))::int AS returns
     FROM order_items WHERE product_id = $1 AND status <> 'pending_payment'`, [id]);
  const reviews = await q(
    `SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = $1 ORDER BY r.id DESC LIMIT 30`, [id]);
  const orders = await q(
    `SELECT oi.id, oi.order_id, oi.qty, oi.seller_amt, oi.status, oi.option, oi.size, o.created_at
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id = $1 AND oi.status <> 'pending_payment' ORDER BY oi.id DESC LIMIT 20`, [id]);
  res.json({product: serializeProduct(row), sales, reviews, orders});
});

export default r;
