// GSTIN verification: offline checksum (catches typos and made-up numbers) plus an optional live
// lookup through any GST data provider (GSP/aggregator) configured via env.

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STATE_CODES = new Set([...Array.from({length: 38}, (_, i) => String(i + 1).padStart(2, '0')), '97', '99']);

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** The 15th character of a GSTIN is a mod-36 check digit over the first 14. */
export function checkDigit(first14: string) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(v / 36) + (v % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export const withCheckDigit = (first14: string) => first14 + checkDigit(first14);

export function validateGstin(gstin: string): string | null {
  if (!GSTIN_RE.test(gstin)) return 'Invalid GSTIN format';
  if (!STATE_CODES.has(gstin.slice(0, 2))) return 'Invalid state code in GSTIN';
  if (checkDigit(gstin.slice(0, 14)) !== gstin[14]) return 'GSTIN check digit does not match — please re-check the number';
  return null;
}

const LOOKUP_URL = process.env.GST_LOOKUP_URL; // e.g. https://provider.example/gstin/  (GSTIN is appended)
const LOOKUP_KEY = process.env.GST_LOOKUP_KEY;
const LOOKUP_HEADER = process.env.GST_LOOKUP_HEADER ?? 'x-api-key';

export const gstLookupLive = !!LOOKUP_URL;

export type GstCheck = {checksum: boolean; checkedAt: string; live?: {ok: boolean; legalName?: string; tradeName?: string; status?: string; raw?: unknown; error?: string}};

export async function verifyGstin(gstin: string): Promise<GstCheck> {
  const out: GstCheck = {checksum: !validateGstin(gstin), checkedAt: new Date().toISOString()};
  if (!LOOKUP_URL) return out;
  try {
    const res = await fetch(LOOKUP_URL + encodeURIComponent(gstin), {headers: LOOKUP_KEY ? {[LOOKUP_HEADER]: LOOKUP_KEY} : {}});
    const raw: any = await res.json().catch(() => ({}));
    // Field names differ by provider; pick the common ones.
    const d = raw.data ?? raw.result ?? raw;
    out.live = {
      ok: res.ok,
      legalName: d.lgnm ?? d.legal_name ?? d.legalName,
      tradeName: d.tradeNam ?? d.trade_name ?? d.tradeName,
      status: d.sts ?? d.status,
      raw: d,
    };
  } catch (e: any) {
    out.live = {ok: false, error: e.message};
  }
  return out;
}
