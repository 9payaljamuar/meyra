import crypto from 'node:crypto';
import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {one, q, tx} from '../db.js';
import {validateGstin, verifyGstin} from '../providers/gst.js';
import {notifyLater, sendOtpSms, smsLive} from '../providers/messaging.js';
import {AuthUser, requireAuth, sign} from '../auth.js';

const r = Router();

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

const Account = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile').optional(),
});

const SellerReg = Account.extend({
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile'),
  businessName: z.string().trim().min(2),
  gstin: z.string().trim().toUpperCase().regex(GSTIN_RE, 'Invalid GSTIN'),
  pan: z.string().trim().toUpperCase().regex(PAN_RE, 'Invalid PAN'),
  address: z.string().trim().optional(),
});

async function emailTaken(email: string) {
  return !!(await one('SELECT 1 FROM users WHERE email = $1', [email]));
}

function session(u: AuthUser) {
  return {token: sign(u), user: u};
}

r.post('/register', async (req, res) => {
  const b = Account.parse(req.body);
  if (await emailTaken(b.email)) return res.status(409).json({error: 'Email already registered'});
  const hash = await bcrypt.hash(b.password, 10);
  const u = await one<AuthUser>(
    `INSERT INTO users(name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,'buyer')
     RETURNING id, name, email, role`,
    [b.name, b.email, b.phone ?? null, hash],
  );
  res.status(201).json(session(u!));
});

r.post('/register-seller', async (req, res) => {
  const b = SellerReg.parse(req.body);
  if (await emailTaken(b.email)) return res.status(409).json({error: 'Email already registered'});
  if (await one('SELECT 1 FROM sellers WHERE gstin = $1', [b.gstin]))
    return res.status(409).json({error: 'This GSTIN is already registered'});
  const gstErr = validateGstin(b.gstin);
  if (gstErr) return res.status(400).json({error: gstErr, field: 'gstin'});
  // GSTIN chars 3-12 are the PAN; catches typos early.
  if (b.gstin.slice(2, 12) !== b.pan)
    return res.status(400).json({error: 'PAN does not match the PAN inside the GSTIN'});
  const gstCheck = await verifyGstin(b.gstin);

  const hash = await bcrypt.hash(b.password, 10);
  const u = await tx(async c => {
    const {rows} = await c.query(
      `INSERT INTO users(name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,'seller')
       RETURNING id, name, email, role`,
      [b.name, b.email, b.phone, hash],
    );
    await c.query(
      `INSERT INTO sellers(user_id, business_name, gstin, pan, address, gst_check) VALUES ($1,$2,$3,$4,$5,$6)`,
      [rows[0].id, b.businessName, b.gstin, b.pan, b.address ?? null, JSON.stringify(gstCheck)],
    );
    return rows[0] as AuthUser;
  });
  notifyLater(u.id, 'Welcome to Meyra Partner Hub',
    `Hi ${b.name}, your seller account for ${b.businessName} is created. Upload your GST certificate, PAN and bank details so we can verify your KYC.`);
  res.status(201).json(session(u));
});

r.post('/login', async (req, res) => {
  const b = z.object({email: z.string().trim().toLowerCase(), password: z.string()}).parse(req.body);
  const row = await one('SELECT * FROM users WHERE email = $1', [b.email]);
  if (!row || !(await bcrypt.compare(b.password, row.password_hash)))
    return res.status(401).json({error: 'Wrong email or password'});
  res.json(session({id: row.id, name: row.name, email: row.email, role: row.role}));
});

r.get('/me', requireAuth(), async (req, res) => {
  const u = await one('SELECT id, name, email, phone, role FROM users WHERE id = $1', [req.user!.id]);
  if (!u) return res.status(401).json({error: 'Account not found'});
  const seller =
    u.role === 'seller'
      ? await one('SELECT business_name, status, reject_reason FROM sellers WHERE user_id = $1', [u.id])
      : null;
  res.json({...u, seller});
});

// ---- Phone OTP login (customers) ----

const OTP_TTL_MIN = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_SEC = 30;
const hashOtp = (phone: string, code: string) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret').update(`${phone}:${code}`).digest('hex');
const Phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

r.post('/otp/send', async (req, res) => {
  const phone = Phone.parse(req.body.phone);
  const prev = await one('SELECT sent_at FROM otp_codes WHERE phone = $1', [phone]);
  if (prev && Date.now() - new Date(prev.sent_at).getTime() < OTP_RESEND_SEC * 1000)
    return res.status(429).json({error: `Please wait ${OTP_RESEND_SEC} seconds before requesting another code`});
  const code = String(crypto.randomInt(100000, 1000000));
  await q(
    `INSERT INTO otp_codes(phone, code_hash, expires_at, attempts, sent_at)
     VALUES ($1, $2, now() + interval '${OTP_TTL_MIN} minutes', 0, now())
     ON CONFLICT (phone) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, sent_at = now()`,
    [phone, hashOtp(phone, code)],
  );
  await sendOtpSms(phone, code);
  // Without an SMS provider, hand the code back so dev and test builds can log in.
  res.json({ok: true, ...(smsLive || process.env.NODE_ENV === 'production' ? {} : {devCode: code})});
});

r.post('/otp/verify', async (req, res) => {
  const b = z.object({phone: Phone, code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'), name: z.string().trim().optional()}).parse(req.body);
  const row = await one('SELECT * FROM otp_codes WHERE phone = $1', [b.phone]);
  if (!row || new Date(row.expires_at) < new Date()) return res.status(400).json({error: 'Code expired. Please request a new one.'});
  if (row.attempts >= OTP_MAX_ATTEMPTS) return res.status(429).json({error: 'Too many attempts. Please request a new code.'});
  if (row.code_hash !== hashOtp(b.phone, b.code)) {
    await q('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = $1', [b.phone]);
    return res.status(400).json({error: 'Incorrect code'});
  }
  await q('DELETE FROM otp_codes WHERE phone = $1', [b.phone]);

  let u = await one<AuthUser & {role: string}>(
    `SELECT id, name, email, role FROM users WHERE phone = $1 ORDER BY (role = 'buyer') DESC, id LIMIT 1`, [b.phone]);
  if (u && u.role !== 'buyer') return res.status(403).json({error: 'This number belongs to a seller account. Please use the Partner Hub.'});
  if (!u) {
    const hash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    u = await one<AuthUser & {role: string}>(
      `INSERT INTO users(name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,'buyer') RETURNING id, name, email, role`,
      [b.name || 'Meyra Shopper', `${b.phone}@phone.meyra.app`, b.phone, hash],
    );
  }
  res.json(session(u!));
});

export default r;
