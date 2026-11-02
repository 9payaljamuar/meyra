import {Router} from 'express';
import {z} from 'zod';
import {one, q, tx} from '../db.js';
import {requireAuth} from '../auth.js';
import {commissionPct, getSettings, round2} from '../commission.js';
import {addTracking, announceOrder, HttpError, markPaid, markPaymentFailed, refundItem, RETURN_WINDOW_DAYS} from '../lifecycle.js';
import {createPaymentLink, fetchPaymentLink, paymentsLive} from '../providers/payments.js';
import {notifyLater} from '../providers/messaging.js';

export {HttpError};

const r = Router();
r.use(requireAuth('buyer'));

const FREE_DELIVERY_ABOVE = 499;
const DELIVERY_FEE = 49;

const OrderBody = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int(),
        qty: z.number().int().min(1).max(10),
        option: z.string().optional(),
        size: z.string().optional(),
      }),
    )
    .min(1),
  address: z.object({
    name: z.string().trim().min(2),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile'),
    line1: z.string().trim().min(3),
    city: z.string().trim().min(2),
    state: z.string().trim().min(2),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  }),
  paymentMethod: z.enum(['COD', 'ONLINE']).default('COD'),
});

r.post('/', async (req, res) => {
  const b = OrderBody.parse(req.body);
  const settings = await getSettings();
  const online = b.paymentMethod === 'ONLINE';

  const order = await tx(async c => {
    const lines = [];
    for (const it of b.items) {
      // Lock the row so two buyers can't oversell the last unit.
      const {rows} = await c.query(
        `SELECT p.*, s.commission_pct AS seller_pct FROM products p
         JOIN sellers s ON s.user_id = p.seller_id
         WHERE p.id = $1 AND p.status = 'approved' AND s.status = 'approved' FOR UPDATE OF p`,
        [it.productId],
      );
      const p = rows[0];
      if (!p) throw new HttpError(400, 'A product in your bag is no longer available');
      if (p.stock < it.qty) throw new HttpError(400, `Only ${p.stock} left of ${p.name}`);
      if (p.sizes.length && !p.sizes.includes(it.size)) throw new HttpError(400, `Pick a size for ${p.name}`);

      const pct = commissionPct(settings, p.seller_pct, p.category);
      const lineTotal = round2(p.price * it.qty);
      const commission = round2((lineTotal * pct) / 100);
      const optImg = p.options.find((o: any) => o.name === it.option)?.images?.[0];
      lines.push({
        p, it, pct, lineTotal, commission,
        sellerAmt: round2(lineTotal - commission),
        image: optImg ?? p.images[0] ?? null,
      });
      await c.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [it.qty, p.id]);
    }

    const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
    const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    const {rows} = await c.query(
      `INSERT INTO orders(buyer_id, address, payment_method, payment_status, subtotal, delivery_fee, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user!.id, JSON.stringify(b.address), b.paymentMethod, online ? 'pending' : 'cod', subtotal, delivery, subtotal + delivery],
    );
    const firstEvent = JSON.stringify([{
      status: online ? 'pending_payment' : 'placed',
      note: online ? 'Waiting for payment.' : 'Order placed. Pay on delivery.',
      at: new Date().toISOString(),
    }]);
    for (const l of lines) {
      await c.query(
        `INSERT INTO order_items(order_id, product_id, seller_id, name, image, option, size, qty,
           unit_price, line_total, commission_pct, commission_amt, seller_amt, status, tracking)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [rows[0].id, l.p.id, l.p.seller_id, l.p.name, l.image, l.it.option ?? null, l.it.size ?? null,
          l.it.qty, l.p.price, l.lineTotal, l.pct, l.commission, l.sellerAmt,
          online ? 'pending_payment' : 'placed', firstEvent],
      );
    }
    return rows[0];
  });

  if (!online) {
    await announceOrder(order.id);
    return res.status(201).json(order);
  }
  try {
    const link = await createPaymentLink({
      orderId: order.id, amount: order.total, name: b.address.name, phone: b.address.phone, email: req.user!.email,
      callbackUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/payment-done` : undefined,
    });
    await q('UPDATE orders SET gateway_order_id = $2, payment_url = $3 WHERE id = $1', [order.id, link.id, link.url]);
    res.status(201).json({...order, payment: {url: link.url, test: link.test}});
  } catch (e: any) {
    await markPaymentFailed(order.id);
    throw new HttpError(502, 'Could not start payment. Please try again or choose Cash on Delivery.');
  }
});

async function myOrder(orderId: number, userId: number) {
  const o = await one('SELECT * FROM orders WHERE id = $1 AND buyer_id = $2', [orderId, userId]);
  if (!o) throw new HttpError(404, 'Order not found');
  return o;
}

/** Polled by the app while the buyer is on the payment page. */
r.get('/:id/payment', async (req, res) => {
  const o = await myOrder(Number(req.params.id), req.user!.id);
  if (o.payment_status === 'pending' && o.gateway_order_id) {
    const s = await fetchPaymentLink(o.gateway_order_id);
    if (s.paid && s.paymentId) await markPaid(o.id, s.paymentId);
    else if (s.failed) await markPaymentFailed(o.id);
  }
  const fresh = await one('SELECT payment_status, payment_url, total FROM orders WHERE id = $1', [o.id]);
  res.json({status: fresh.payment_status, url: fresh.payment_url, total: fresh.total, test: !paymentsLive});
});

/** Test mode only: the app's simulated checkout reports the outcome here. */
r.post('/:id/payment/test', async (req, res) => {
  if (paymentsLive) throw new HttpError(403, 'Test payments are disabled');
  const {outcome} = z.object({outcome: z.enum(['success', 'failure'])}).parse(req.body);
  const o = await myOrder(Number(req.params.id), req.user!.id);
  if (outcome === 'success') await markPaid(o.id, `pay_test_${Date.now()}`);
  else await markPaymentFailed(o.id);
  res.json({ok: true});
});

r.post('/:id/payment/cancel', async (req, res) => {
  const o = await myOrder(Number(req.params.id), req.user!.id);
  await markPaymentFailed(o.id);
  res.json({ok: true});
});

r.get('/', async (req, res) => {
  const orders = await q(
    `SELECT * FROM orders WHERE buyer_id = $1 AND payment_status <> 'failed' ORDER BY id DESC`, [req.user!.id]);
  const items = await q(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.name, oi.image, oi.option, oi.size, oi.qty,
            oi.unit_price, oi.line_total, oi.status, oi.courier, oi.awb, oi.tracking_url, oi.tracking,
            oi.delivered_at, oi.return_reason, oi.return_note, oi.refund_amount, oi.refund_method, oi.refunded_at,
            s.business_name AS seller_name,
            (oi.status = 'delivered' AND oi.delivered_at > now() - interval '${RETURN_WINDOW_DAYS} days') AS can_return
     FROM order_items oi JOIN sellers s ON s.user_id = oi.seller_id
     WHERE oi.order_id = ANY($1::int[]) ORDER BY oi.id`,
    [orders.map(o => o.id)],
  );
  res.json(orders.map(o => ({...o, items: items.filter(i => i.order_id === o.id)})));
});

r.post('/items/:itemId/cancel', async (req, res) => {
  const it = await one(
    `SELECT oi.* FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.id = $1 AND o.buyer_id = $2`, [Number(req.params.itemId), req.user!.id]);
  if (!it || it.status !== 'placed') throw new HttpError(400, 'This item can no longer be cancelled');
  await refundItem(it.id, {restock: true, status: 'cancelled', note: 'Cancelled by customer.'});
  notifyLater(it.seller_id, `Order #${it.order_id} item cancelled`, `The customer cancelled ${it.qty} × ${it.name}. No need to ship it.`);
  res.json({ok: true});
});

r.post('/items/:itemId/return', async (req, res) => {
  const b = z.object({
    reason: z.string().trim().min(3, 'Tell us why you want to return it'),
    photos: z.array(z.string()).max(5).default([]),
  }).parse(req.body);
  const it = await one(
    `SELECT oi.* FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.id = $1 AND o.buyer_id = $2`, [Number(req.params.itemId), req.user!.id]);
  if (!it || it.status !== 'delivered') throw new HttpError(400, 'Only delivered items can be returned');
  if (Date.now() - new Date(it.delivered_at).getTime() > RETURN_WINDOW_DAYS * 864e5)
    throw new HttpError(400, `The ${RETURN_WINDOW_DAYS}-day return window has closed`);
  await q(
    `UPDATE order_items SET status = 'return_requested', return_reason = $2, return_photos = $3, updated_at = now() WHERE id = $1`,
    [it.id, b.reason, JSON.stringify(b.photos)],
  );
  await addTracking(it.id, 'return_requested', `Return requested: ${b.reason}`);
  notifyLater(it.seller_id, `Return requested — order #${it.order_id}`,
    `The customer wants to return ${it.name}. Reason: “${b.reason}”. Please review it in your Seller Hub.`, {sms: true});
  res.json({ok: true});
});

export default r;
