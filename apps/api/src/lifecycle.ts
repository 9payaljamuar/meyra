// Order state transitions shared by buyer, seller, admin and webhook routes.
import {one, q, tx} from './db.js';
import {notifyLater} from './providers/messaging.js';
import {refundPayment} from './providers/payments.js';

export const RETURN_WINDOW_DAYS = 7;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export async function addTracking(itemId: number, status: string, note: string) {
  await q(
    `UPDATE order_items SET tracking = tracking || $2::jsonb, updated_at = now() WHERE id = $1`,
    [itemId, JSON.stringify([{status, note, at: new Date().toISOString()}])],
  );
}

/** Tell the buyer and every seller in the order that it's confirmed. */
export async function announceOrder(orderId: number) {
  const o = await one('SELECT * FROM orders WHERE id = $1', [orderId]);
  const items = await q('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
  notifyLater(o.buyer_id, `Order #${orderId} confirmed`,
    `Thank you for shopping with Meyra! Your order #${orderId} of ${inr(o.total)} is confirmed` +
    `${o.payment_method === 'COD' ? ' (pay on delivery)' : ''}. We’ll let you know when it ships.`, {sms: true});
  const bySeller = new Map<number, any[]>();
  items.forEach(i => bySeller.set(i.seller_id, [...(bySeller.get(i.seller_id) ?? []), i]));
  for (const [sellerId, list] of bySeller) {
    notifyLater(sellerId, `New order #${orderId}`,
      `You have a new order: ${list.map(i => `${i.qty} × ${i.name}`).join(', ')}. Please ship within 2 days from your Seller Hub.`, {sms: true});
  }
}

export async function markPaid(orderId: number, paymentId: string) {
  const done = await tx(async c => {
    const {rows} = await c.query(
      `UPDATE orders SET payment_status = 'paid', gateway_payment_id = $2 WHERE id = $1 AND payment_status = 'pending' RETURNING id`,
      [orderId, paymentId],
    );
    if (!rows[0]) return false;
    await c.query(`UPDATE order_items SET status = 'placed', updated_at = now() WHERE order_id = $1 AND status = 'pending_payment'`, [orderId]);
    return true;
  });
  if (!done) return;
  const items = await q('SELECT id FROM order_items WHERE order_id = $1', [orderId]);
  for (const i of items) await addTracking(i.id, 'placed', 'Payment received. Order confirmed.');
  await announceOrder(orderId);
}

const PAYMENT_TIMEOUT_MIN = 30;

/** Online orders left unpaid (buyer closed the app mid-payment) give their stock back after 30 minutes. */
export async function expireStalePayments() {
  const stale = await q(
    `SELECT id FROM orders WHERE payment_status = 'pending' AND created_at < now() - interval '${PAYMENT_TIMEOUT_MIN} minutes' LIMIT 50`);
  for (const o of stale) await markPaymentFailed(o.id);
  return stale.length;
}

/** Payment abandoned or failed: release stock and cancel the order. */
export async function markPaymentFailed(orderId: number) {
  await tx(async c => {
    const {rows} = await c.query(
      `UPDATE orders SET payment_status = 'failed' WHERE id = $1 AND payment_status = 'pending' RETURNING id`, [orderId]);
    if (!rows[0]) return;
    const items = await c.query(
      `UPDATE order_items SET status = 'cancelled', updated_at = now() WHERE order_id = $1 AND status = 'pending_payment'
       RETURNING product_id, qty`, [orderId]);
    for (const i of items.rows) await c.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [i.qty, i.product_id]);
  });
}

/**
 * Refund one order line. Online payments go back through Razorpay automatically;
 * COD refunds are recorded as 'manual' for the admin to pay by UPI/bank.
 */
export async function refundItem(itemId: number, opts: {restock: boolean; status: 'refunded' | 'cancelled'; note: string}) {
  const it = await one(
    `SELECT oi.*, o.payment_method, o.payment_status, o.gateway_payment_id, o.buyer_id
     FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.id = $1`, [itemId]);
  if (!it) throw new HttpError(404, 'Order item not found');
  const paidOnline = it.payment_status === 'paid' && it.gateway_payment_id;
  let ref: string | null = null;
  let method: string | null = null;
  if (paidOnline) {
    ref = await refundPayment(it.gateway_payment_id, it.line_total);
    method = 'gateway';
  } else if (opts.status === 'refunded') {
    method = 'manual';
  }
  await q(
    `UPDATE order_items SET status = $2, refund_amount = $3, refund_method = $4, refund_ref = $5,
       refunded_at = CASE WHEN $4::text IS NOT NULL THEN now() END, updated_at = now()
     WHERE id = $1`,
    [itemId, opts.status, method ? it.line_total : null, method, ref],
  );
  if (opts.restock) await q('UPDATE products SET stock = stock + $1 WHERE id = $2', [it.qty, it.product_id]);
  await addTracking(itemId, opts.status, opts.note);
  if (method) {
    notifyLater(it.buyer_id, `Refund of ${inr(it.line_total)} initiated`,
      method === 'gateway'
        ? `Your refund of ${inr(it.line_total)} for ${it.name} has been sent to your original payment method. It usually reflects in 5–7 working days.`
        : `Your refund of ${inr(it.line_total)} for ${it.name} is being processed. Our team will contact you for your UPI/bank details.`,
      {sms: true});
  }
}
