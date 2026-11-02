// Shipping: sellers either enter the courier + AWB they booked themselves, or (when configured)
// book through Shiprocket, which assigns a courier and AWB automatically.

const SR_EMAIL = process.env.SHIPROCKET_EMAIL;
const SR_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const SR_PICKUP = process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary';
const SR_BASE = 'https://apiv2.shiprocket.in/v1/external';

export const shiprocketLive = !!(SR_EMAIL && SR_PASSWORD);

export const COURIERS: Record<string, (awb: string) => string> = {
  Delhivery: awb => `https://www.delhivery.com/track/package/${awb}`,
  'Blue Dart': awb => `https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&trackNo=${awb}`,
  DTDC: awb => `https://www.dtdc.in/trace.asp?strCnno=${awb}`,
  'Ecom Express': awb => `https://ecomexpress.in/tracking/?awb_field=${awb}`,
  Xpressbees: awb => `https://www.xpressbees.com/shipment/tracking?awbNo=${awb}`,
  'India Post': () => 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
  'Shadowfax': awb => `https://tracker.shadowfax.in/#/track/${awb}`,
  Other: awb => `https://shiprocket.co/tracking/${awb}`,
};

export const trackingUrl = (courier: string, awb: string) => (COURIERS[courier] ?? COURIERS.Other)(awb);

let token: {value: string; exp: number} | null = null;

async function sr(path: string, body?: object) {
  if (!token || token.exp < Date.now()) {
    const res = await fetch(`${SR_BASE}/auth/login`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: SR_EMAIL, password: SR_PASSWORD}),
    });
    const d: any = await res.json();
    if (!d.token) throw new Error('Shiprocket login failed');
    token = {value: d.token, exp: Date.now() + 8 * 864e5};
  }
  const res = await fetch(SR_BASE + path, {
    method: body ? 'POST' : 'GET',
    headers: {Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/json'},
    body: body ? JSON.stringify(body) : undefined,
  });
  const d: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Shiprocket: ${d.message ?? res.status}`);
  return d;
}

export type ShipmentInput = {
  itemId: number; orderDate: Date; name: string; sku: string; qty: number; price: number; prepaid: boolean;
  address: {name: string; phone: string; line1: string; city: string; state: string; pincode: string};
  email: string; weightKg?: number;
};

export async function bookShiprocket(s: ShipmentInput): Promise<{courier: string; awb: string; trackingUrl: string}> {
  if (!shiprocketLive) throw new Error('Shiprocket is not configured');
  const order = await sr('/orders/create/adhoc', {
    order_id: `MEYRA-${s.itemId}`,
    order_date: s.orderDate.toISOString().slice(0, 16).replace('T', ' '),
    pickup_location: SR_PICKUP,
    billing_customer_name: s.address.name,
    billing_last_name: '',
    billing_address: s.address.line1,
    billing_city: s.address.city,
    billing_pincode: s.address.pincode,
    billing_state: s.address.state,
    billing_country: 'India',
    billing_email: s.email,
    billing_phone: s.address.phone,
    shipping_is_billing: true,
    order_items: [{name: s.name, sku: s.sku, units: s.qty, selling_price: s.price}],
    payment_method: s.prepaid ? 'Prepaid' : 'COD',
    sub_total: s.price * s.qty,
    length: 20, breadth: 15, height: 8, weight: s.weightKg ?? 0.5,
  });
  const awb = await sr('/courier/assign/awb', {shipment_id: order.shipment_id});
  const data = awb?.response?.data;
  if (!data?.awb_code) throw new Error('Shiprocket could not assign a courier for this pincode');
  return {courier: data.courier_name, awb: data.awb_code, trackingUrl: `https://shiprocket.co/tracking/${data.awb_code}`};
}
