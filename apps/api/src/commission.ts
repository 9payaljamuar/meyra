import {one} from './db.js';

export async function getSettings() {
  const d = await one(`SELECT value FROM settings WHERE key = 'default_commission_pct'`);
  const c = await one(`SELECT value FROM settings WHERE key = 'category_commission'`);
  return {
    defaultCommissionPct: Number(d?.value ?? 10),
    categoryCommission: (c?.value ?? {}) as Record<string, number>,
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
