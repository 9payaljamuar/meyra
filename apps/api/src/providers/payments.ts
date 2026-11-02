// Razorpay via Payment Links: the app opens a hosted checkout page (UPI, cards, netbanking, wallets),
// so no native SDK is needed. Without keys we run in test mode and the app shows a simulated checkout.
import crypto from 'node:crypto';

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const BASE = 'https://api.razorpay.com/v1';

export const paymentsLive = !!(KEY_ID && SECRET);

async function rzp(path: string, body?: object) {
  const res = await fetch(BASE + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${KEY_ID}:${SECRET}`).toString('base64'),
      ...(body ? {'Content-Type': 'application/json'} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay: ${data?.error?.description ?? res.status}`);
  return data;
}

export type PaymentLink = {id: string; url: string | null; test: boolean};

export async function createPaymentLink(o: {
  orderId: number; amount: number; name: string; phone: string; email?: string; callbackUrl?: string;
}): Promise<PaymentLink> {
  if (!paymentsLive) return {id: `plink_test_${o.orderId}_${Date.now()}`, url: null, test: true};
  const link = await rzp('/payment_links', {
    amount: Math.round(o.amount * 100),
    currency: 'INR',
    reference_id: `meyra_${o.orderId}`,
    description: `Meyra order #${o.orderId}`,
    customer: {name: o.name, contact: `+91${o.phone}`, ...(o.email ? {email: o.email} : {})},
    notify: {sms: false, email: false},
    expire_by: Math.floor(Date.now() / 1000) + 30 * 60,
    ...(o.callbackUrl ? {callback_url: o.callbackUrl, callback_method: 'get'} : {}),
  });
  return {id: link.id, url: link.short_url, test: false};
}

/** Pull status from Razorpay (works even when the webhook can't reach a local machine). */
export async function fetchPaymentLink(id: string): Promise<{paid: boolean; failed: boolean; paymentId?: string}> {
  if (!paymentsLive || id.startsWith('plink_test_')) return {paid: false, failed: false};
  const l = await rzp(`/payment_links/${id}`);
  const p = (l.payments ?? []).find((x: any) => x.status === 'captured') ?? l.payments?.[0];
  return {paid: l.status === 'paid', failed: ['expired', 'cancelled'].includes(l.status), paymentId: p?.payment_id};
}

export function verifyWebhook(rawBody: Buffer, signature?: string) {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function refundPayment(paymentId: string, amount: number): Promise<string> {
  if (!paymentsLive || paymentId.startsWith('pay_test_')) return `rfnd_test_${Date.now()}`;
  const r = await rzp(`/payments/${paymentId}/refund`, {amount: Math.round(amount * 100), speed: 'normal'});
  return r.id;
}
