import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, {NextFunction, Request, Response, Router} from 'express';
import multer from 'multer';
import {ZodError} from 'zod';
import {migrate, one} from './db.js';
import {requireAuth} from './auth.js';
import {expireStalePayments, HttpError, markPaid, markPaymentFailed} from './lifecycle.js';
import {verifyWebhook} from './providers/payments.js';
import {saveFile, UPLOAD_DIR} from './providers/storage.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import sellerRoutes from './routes/seller.js';
import adminRoutes from './routes/admin.js';
import documentRoutes from './documents.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 8 * 1024 * 1024, files: 8},
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.includes(file.mimetype)),
});

const api = Router();
api.use('/uploads', express.static(UPLOAD_DIR, {maxAge: '7d'}));
api.get('/health', (_req, res) => res.json({ok: true}));
api.post('/upload', requireAuth(), upload.array('files', 8), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) return res.status(400).json({error: 'Only JPG, PNG, WEBP or PDF up to 8 MB'});
  res.json({urls: await Promise.all(files.map(f => saveFile(f.buffer, f.mimetype)))});
});

// Razorpay calls this when a payment link is paid/expired. Needs the raw body for the signature check.
api.post('/webhooks/razorpay', express.raw({type: '*/*'}), async (req, res) => {
  if (!verifyWebhook(req.body, req.header('x-razorpay-signature'))) return res.status(400).json({error: 'Bad signature'});
  const evt = JSON.parse(req.body.toString());
  const link = evt.payload?.payment_link?.entity;
  const order = link && (await one('SELECT id FROM orders WHERE gateway_order_id = $1', [link.id]));
  if (order) {
    if (evt.event === 'payment_link.paid') await markPaid(order.id, evt.payload.payment?.entity?.id ?? 'unknown');
    if (['payment_link.expired', 'payment_link.cancelled'].includes(evt.event)) await markPaymentFailed(order.id);
  }
  res.json({ok: true});
});

// Vercel Cron (see vercel.json) or any scheduler: housekeeping. Protected by CRON_SECRET when set.
api.get('/cron/expire-payments', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.header('authorization') !== `Bearer ${secret}`) return res.status(401).json({error: 'Unauthorized'});
  res.json({expired: await expireStalePayments()});
});

api.use(express.json({limit: '1mb'}));
api.use('/auth', authRoutes);
api.use('/orders', orderRoutes);
api.use('/seller', sellerRoutes);
api.use('/admin', adminRoutes);
api.use('/documents', documentRoutes);
api.use('/', catalogRoutes);

const app = express();
app.use(cors());

// Serverless (Vercel) has no startup hook, so run the idempotent migration once per instance on first request.
let migrated: Promise<void> | null = null;
app.use((_req, _res, next) => {
  migrated ??= migrate().catch(e => {
    migrated = null;
    throw e;
  });
  migrated.then(() => next(), next);
});

// The API lives under /api. In development (no web build to serve) it is also mounted at the root so
// older app builds pointing at http://host:4000 keep working.
const WEB_DIST = path.resolve(process.env.WEB_DIST ?? '../web/dist');
const serveWeb = process.env.NODE_ENV === 'production' && fs.existsSync(WEB_DIST);
app.use('/api', api);

// Razorpay redirects the buyer here after paying; the app is polling the order meanwhile.
app.get('/payment-done', (_req, res) => {
  res.send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
    <body style="font-family:Georgia,serif;background:#FAF7F2;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
    <div><h1 style="color:#B8862B;font-weight:600">Thank you</h1><p style="font-family:Arial">Payment received. Return to the Meyra app.</p></div>`);
});

if (serveWeb) {
  app.use('/uploads', express.static(UPLOAD_DIR, {maxAge: '7d'}));
  app.use(express.static(WEB_DIST, {maxAge: '1h', index: false}));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));
} else {
  app.use('/', api);
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.join('.');
    // Custom messages are already user-facing; prefix zod's generic ones with the field name.
    const generic = first?.code !== 'custom' && !/^(Enter|Invalid|Add|Pick|Give|Tell|Please|Choose|Use)/.test(first?.message ?? '');
    const label = String(first?.path.at(-1) ?? '').replace(/([A-Z])/g, ' $1').toLowerCase();
    const msg = generic && label ? `${label[0].toUpperCase()}${label.slice(1)}: ${first.message.toLowerCase()}` : first?.message;
    return res.status(400).json({error: msg ?? 'Invalid input', field});
  }
  if (err instanceof HttpError) return res.status(err.status).json({error: err.message});
  console.error(err);
  res.status(500).json({error: err?.message?.startsWith('Shiprocket') || err?.message?.startsWith('Razorpay') ? err.message : 'Something went wrong'});
});

export {serveWeb};
export default app;
