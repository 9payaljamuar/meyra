// GST helpers for a marketplace (e-commerce operator) in India.
// Prices on Meyra are GST-inclusive; tax is backed out of the selling price.
import type pg from 'pg';
import {one} from './db.js';

export const GST_RATES = [0, 3, 5, 12, 18, 28];

/** Suggested HSN + GST rate per category. Sellers confirm or change these on each product. */
export const TAX_DEFAULTS: Record<string, {hsn: string; rate: number}> = {
  Skincare: {hsn: '3304', rate: 18},
  Haircare: {hsn: '3305', rate: 18},
  Makeup: {hsn: '3304', rate: 18},
  Fragrance: {hsn: '3303', rate: 18},
  Dresses: {hsn: '6204', rate: 5},
  Tops: {hsn: '6206', rate: 5},
  Kurtas: {hsn: '6211', rate: 5},
  Bottoms: {hsn: '6204', rate: 5},
  Earrings: {hsn: '7117', rate: 3},
  Necklaces: {hsn: '7117', rate: 3},
  'Hair Accessories': {hsn: '9615', rate: 18},
  Bags: {hsn: '4202', rate: 18},
};

/** Apparel above ₹2,500 per piece moves from 5% to 18% GST. */
export function suggestedRate(category: string, unitPrice: number) {
  const d = TAX_DEFAULTS[category];
  if (!d) return 18;
  if (d.rate === 5 && unitPrice > 2500) return 18;
  return d.rate;
}

const STATES: Record<string, string> = {
  'jammu and kashmir': '01', 'jammu & kashmir': '01', 'himachal pradesh': '02', punjab: '03', chandigarh: '04',
  uttarakhand: '05', haryana: '06', delhi: '07', 'new delhi': '07', rajasthan: '08', 'uttar pradesh': '09', up: '09',
  bihar: '10', sikkim: '11', 'arunachal pradesh': '12', nagaland: '13', manipur: '14', mizoram: '15', tripura: '16',
  meghalaya: '17', assam: '18', 'west bengal': '19', wb: '19', jharkhand: '20', odisha: '21', orissa: '21',
  chhattisgarh: '22', 'madhya pradesh': '23', mp: '23', gujarat: '24', 'dadra and nagar haveli and daman and diu': '26',
  'daman and diu': '26', 'dadra and nagar haveli': '26', maharashtra: '27', mh: '27', karnataka: '29', ka: '29', goa: '30',
  lakshadweep: '31', kerala: '32', 'tamil nadu': '33', tn: '33', puducherry: '34', pondicherry: '34',
  'andaman and nicobar islands': '35', telangana: '36', 'andhra pradesh': '37', ap: '37', ladakh: '38',
};

export const stateCodeOf = (stateName: string) => STATES[stateName.trim().toLowerCase().replace(/\s+/g, ' ')] ?? null;

export const STATE_NAMES = Object.entries(STATES)
  .filter(([n]) => n.length > 3 && !['new delhi', 'orissa', 'pondicherry', 'jammu & kashmir', 'daman and diu', 'dadra and nagar haveli'].includes(n))
  .map(([n, c]) => ({name: n.replace(/\b\w/g, ch => ch.toUpperCase()).replace(' And ', ' and '), code: c}))
  .sort((a, b) => a.name.localeCompare(b.name));

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Split a GST-inclusive line total into taxable value and CGST/SGST (same state) or IGST (inter-state). */
export function splitTax(lineTotal: number, rate: number, sellerState: string | null, buyerState: string | null) {
  const taxable = round2(lineTotal / (1 + rate / 100));
  const tax = round2(lineTotal - taxable);
  const intra = !!sellerState && sellerState === buyerState;
  return {
    taxable,
    cgst: intra ? round2(tax / 2) : 0,
    sgst: intra ? round2(tax - round2(tax / 2)) : 0,
    igst: intra ? 0 : tax,
  };
}

/** Indian financial year label, e.g. "2627" for Apr 2026 – Mar 2027. */
export function fyOf(d = new Date()) {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(y).slice(2)}${String(y + 1).slice(2)}`;
}

/** Next sequential invoice number for a seller in the current FY: MEY/S{seller}/{FY}/{0001}. */
export async function nextInvoiceNo(c: pg.PoolClient | null, sellerId: number) {
  const fy = fyOf();
  const sql = `INSERT INTO invoice_counters(seller_id, fy, last) VALUES ($1, $2, 1)
               ON CONFLICT (seller_id, fy) DO UPDATE SET last = invoice_counters.last + 1 RETURNING last`;
  const row = c ? (await c.query(sql, [sellerId, fy])).rows[0] : await one(sql, [sellerId, fy]);
  return `MEY/S${sellerId}/${fy}/${String(row.last).padStart(4, '0')}`;
}

/** Variant stock key for a product with shades/colours and/or sizes. */
export const variantKey = (option?: string | null, size?: string | null) => `${option ?? ''}|${size ?? ''}`;
