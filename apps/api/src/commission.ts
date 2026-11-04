import {q} from './db.js';

export type Platform = {name: string; gstin: string; address: string};

export async function getSettings() {
  const rows = await q(`SELECT key, value FROM settings`);
  const v = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    defaultCommissionPct: Number(v.default_commission_pct ?? 10),
    categoryCommission: (v.category_commission ?? {}) as Record<string, number>,
    // Marketplace deductions on every sale (GST on Meyra's commission, GST TCS u/s 52, income-tax TDS u/s 194-O).
    commissionGstPct: Number(v.commission_gst_pct ?? 18),
    tcsPct: Number(v.tcs_pct ?? 1),
    tdsPct: Number(v.tds_pct ?? 0.1),
    platform: (v.platform ?? {name: 'Meyra', gstin: '', address: ''}) as Platform,
  };
}

/** Seller override wins, then category rate, then the platform default. */
export function commissionPct(
  settings: Awaited<ReturnType<typeof getSettings>>,
  sellerPct: number | null,
  category: string,
) {
  if (sellerPct != null) return sellerPct;
  return settings.categoryCommission[category] ?? settings.defaultCommissionPct;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
