// Printable order documents (GST tax invoice, packing slip + shipping label).
// Links carry an HMAC signature so they open in any browser tab or from the app without a login header.
import crypto from 'node:crypto';
import {Router} from 'express';
import {one} from './db.js';
import {getSettings} from './commission.js';
import {HttpError} from './lifecycle.js';
import {STATE_NAMES} from './tax.js';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const sign = (itemId: number) => crypto.createHmac('sha256', SECRET).update(`doc:${itemId}`).digest('hex').slice(0, 32);

/** Web paths for an order line's documents (the web app renders them for printing / saving as PDF). */
export function docLinks(it: {id: number; invoice_no?: string | null; status?: string}) {
  const t = sign(it.id);
  return {
    invoice_url: it.invoice_no ? `/doc/${it.id}?kind=invoice&t=${t}` : null,
    label_url: ['placed', 'shipped'].includes(String(it.status)) ? `/doc/${it.id}?kind=label&t=${t}` : null,
  };
}

const stateName = (code: string) => STATE_NAMES.find(s => s.code === code)?.name ?? code;

const r = Router();

r.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const t = String(req.query.t ?? '');
  const expected = sign(id);
  if (t.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(expected)))
    throw new HttpError(403, 'This document link is not valid');
  const it = await one(
    `SELECT oi.*, o.address, o.payment_method, o.payment_status, o.created_at AS order_date, o.delivery_fee, o.id AS order_no,
            s.business_name, s.gstin, s.pan, s.address AS seller_address, u.name AS buyer_name, u.email AS buyer_email,
            (SELECT MIN(x.id) FROM order_items x WHERE x.order_id = o.id AND x.status <> 'cancelled') AS first_item
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN sellers s ON s.user_id = oi.seller_id JOIN users u ON u.id = o.buyer_id
     WHERE oi.id = $1`, [id]);
  if (!it) throw new HttpError(404, 'Not found');
  const {platform} = await getSettings();
  res.json({
    item: {
      id: it.id, name: it.name, option: it.option, size: it.size, qty: it.qty, hsn: it.hsn, gstRate: it.gst_rate,
      unitPrice: it.unit_price, lineTotal: it.line_total, taxable: it.taxable_value, cgst: it.cgst, sgst: it.sgst, igst: it.igst,
      status: it.status, invoiceNo: it.invoice_no, invoicedAt: it.invoiced_at, courier: it.courier, awb: it.awb,
    },
    order: {
      no: it.order_no, date: it.order_date, paymentMethod: it.payment_method, paid: it.payment_status === 'paid',
      // Cash to collect for this parcel: the item, plus the order's delivery fee on the first parcel only.
      codAmount: it.payment_method === 'COD' ? Number(it.line_total) + (it.first_item === it.id ? Number(it.delivery_fee) : 0) : 0,
    },
    seller: {name: it.business_name, gstin: it.gstin, address: it.seller_address, state: stateName(it.gstin.slice(0, 2)), stateCode: it.gstin.slice(0, 2)},
    buyer: {...it.address, email: it.buyer_email},
    platform,
  });
});

export default r;
