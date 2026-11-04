// Resets the database and loads demo data: admin, sellers, the current catalog, buyers and reviews.
// Usage: npm run seed
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {migrate, one, pool, q} from './db.js';
import {withCheckDigit} from './providers/gst.js';
import {saveFile} from './providers/storage.js';
import {fyOf, splitTax, suggestedRate, TAX_DEFAULTS, variantKey} from './tax.js';
import {PRODUCTS} from './seed-data/products.js';
import {reviewsFor} from './seed-data/reviews.js';

const IMG_SRC = path.resolve('seed-images');
const UPLOAD_DIR = path.resolve('uploads');

const cloud = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.S3_BUCKET);
const uploaded = new Map<string, string>();

/** Demo photo URL: copied into local uploads/, or uploaded once to Blob/S3 when configured. */
async function img(key: string) {
  if (!uploaded.has(key)) {
    const file = path.join(IMG_SRC, `${key}.jpg`);
    if (cloud) {
      uploaded.set(key, await saveFile(fs.readFileSync(file), 'image/jpeg', 'seed'));
    } else {
      fs.mkdirSync(UPLOAD_DIR, {recursive: true});
      fs.copyFileSync(file, path.join(UPLOAD_DIR, `seed-${key}.jpg`));
      uploaded.set(key, `/uploads/seed-${key}.jpg`);
    }
  }
  return uploaded.get(key)!;
}

async function user(name: string, email: string, role: string, password: string, phone?: string) {
  const hash = await bcrypt.hash(password, 10);
  return (await one<{id: number}>(
    `INSERT INTO users(name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [name, email, phone ?? null, hash, role],
  ))!.id;
}

async function seller(name: string, email: string, business: string, gstin: string, status = 'approved') {
  const id = await user(name, email, 'seller', 'seller123', '9876543210');
  await q(
    `INSERT INTO sellers(user_id, business_name, gstin, pan, address, bank_account, bank_ifsc, status, reviewed_at, gst_check, agreed_at)
     VALUES ($1,$2,$3,$4,$7,'123456789012','HDFC0001234',$5, CASE WHEN $5 = 'approved' THEN now() END, $6, now())`,
    [id, business, gstin, gstin.slice(2, 12), status, JSON.stringify({checksum: true, checkedAt: new Date().toISOString()}),
      // Pickup address in the same state as the GSTIN.
      ({'27': 'Andheri East, Mumbai, Maharashtra 400069', '07': 'Lajpat Nagar, New Delhi 110024'} as Record<string, string>)[gstin.slice(0, 2)]
        ?? 'Indiranagar, Bengaluru, Karnataka 560038'],
  );
  return id;
}

async function main() {
  await q('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate();

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  await user('Meyra Admin', 'admin@meyra.app', 'admin', adminPassword);
  const sellers: Record<string, number> = {
    'Meyra Glory': await seller('Meyra Team', 'meyra@seller.app', 'Meyra Glory', withCheckDigit('29ABCDE1234F1Z')),
    'Silver Tales': await seller('Asha Rao', 'silvertales@seller.app', 'Silver Tales', withCheckDigit('29SILVR1234T1Z')),
    'Clip & Co': await seller('Neha Jain', 'clipco@seller.app', 'Clip & Co', withCheckDigit('29CLIPC1234C1Z')),
    'Urban Frock': await seller('Rahul Mehta', 'urbanfrock@seller.app', 'Urban Frock', withCheckDigit('27URBNF1234F1Z')),
  };
  // Sits in the admin KYC queue for the demo.
  await seller('Divya Kapoor', 'glowlab@seller.app', 'Glow Lab Cosmetics', withCheckDigit('07GLOWL1234G1Z'), 'pending');

  const buyers = [];
  for (const n of ['Ananya R.', 'Priya S.', 'Kavya M.', 'Sneha K.', 'Riya P.', 'Meera J.']) {
    buyers.push({name: n, id: await user(n, `${n.split(' ')[0].toLowerCase()}@buyer.app`, 'buyer', 'buyer123')});
  }
  await user('Demo Customer', 'customer@meyra.app', 'buyer', 'customer123', '9900000000');

  for (const p of PRODUCTS) {
    const images = await Promise.all(p.images.map(img));
    const options = await Promise.all((p.option?.values ?? []).map(async v => ({...v, images: v.images && (await Promise.all(v.images.map(img)))})));
    const ageDays = p.isNew ? 2 : 30;
    let stock = p.id === 'j6' || p.id === 'h2' ? 3 : 20 + (p.id.charCodeAt(1) % 30);
    // Sized / shaded products track stock per combination (one size left low to show "only N left").
    const variants: Record<string, number> = {};
    const opts = p.option?.values.map(v => v.name) ?? [null];
    for (const o of opts) for (const s of p.sizes ?? [null]) variants[variantKey(o, s)] = s === 'XL' ? 2 : 6;
    if (p.option || p.sizes?.length) stock = Object.values(variants).reduce((a, n) => a + n, 0);
    const row = await one(
      `INSERT INTO products(seller_id, name, description, grp, category, price, mrp, stock, images,
         skin_types, hair_types, sizes, option_label, options, status, featured, created_at, updated_at, hsn, gst_rate, variant_stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'approved',$15, now() - ($16 || ' days')::interval, now(), $17, $18, $19)
       RETURNING id`,
      [sellers[p.seller], p.name, p.desc, p.group, p.category, p.price, p.mrp, stock, JSON.stringify(images),
        JSON.stringify(p.skinTypes ?? []), JSON.stringify(p.hairTypes ?? []), JSON.stringify(p.sizes ?? []),
        p.option?.label ?? null, JSON.stringify(options), !!p.bestseller, String(ageDays),
        TAX_DEFAULTS[p.category]?.hsn ?? null, suggestedRate(p.category, p.price), JSON.stringify(p.option || p.sizes?.length ? variants : {})],
    );
    for (const r of reviewsFor(p)) {
      const b = buyers.find(x => x.name === r.name) ?? buyers[0];
      await q(
        `INSERT INTO reviews(product_id, user_id, rating, text, photos, verified) VALUES ($1,$2,$3,$4,$5,$6)`,
        [row.id, b.id, r.rating, r.text, JSON.stringify(r.photo ? [await img(r.photo)] : []), r.verified],
      );
    }
  }

  // One product waiting for admin approval.
  await q(
    `INSERT INTO products(seller_id, name, description, grp, category, price, mrp, stock, images, sizes, status)
     VALUES ($1,'Mustard Ruffle Dress','Bright mustard dress with a ruffled high-low hem.','Apparel','Dresses',
             949,1699,15,$2,$3,'pending')`,
    [sellers['Urban Frock'], JSON.stringify([await img('p26')]), JSON.stringify(['S', 'M', 'L'])],
  );

  // Demo orders from the customer account, one in each stage of the lifecycle.
  const customer = (await one(`SELECT id FROM users WHERE email = 'customer@meyra.app'`))!.id;
  const addr = {name: 'Demo Customer', phone: '9900000000', line1: '12, 4th Cross, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038'};
  const day = 864e5;
  const ev = (status: string, note: string, daysAgo: number) => ({status, note, at: new Date(Date.now() - daysAgo * day).toISOString()});
  const demo: {name: string; status: string; daysAgo: number; pay: 'COD' | 'ONLINE'; extra?: Record<string, unknown>; events: object[]}[] = [
    {name: 'Orange Cleansing Milk', status: 'placed', daysAgo: 0, pay: 'COD', events: [ev('placed', 'Order placed. Pay on delivery.', 0)]},
    {name: 'Hair Growth Solution', status: 'placed', daysAgo: 0, pay: 'ONLINE', events: [ev('pending_payment', 'Waiting for payment.', 0), ev('placed', 'Payment received. Order confirmed.', 0)]},
    {name: 'Oxidised Kundan Chandbali', status: 'shipped', daysAgo: 2, pay: 'ONLINE',
      extra: {courier: 'Delhivery', awb: '1490811234567', tracking_url: 'https://www.delhivery.com/track/package/1490811234567', shipped_at: new Date(Date.now() - day)},
      events: [ev('placed', 'Payment received. Order confirmed.', 2), ev('shipped', 'Shipped with Delhivery. AWB 1490811234567', 1)]},
    {name: 'Halter Floral Maxi Dress', status: 'delivered', daysAgo: 6, pay: 'COD', extra: {courier: 'Blue Dart', awb: '7788123456', delivered_at: new Date(Date.now() - 2 * day)},
      events: [ev('placed', 'Order placed. Pay on delivery.', 6), ev('shipped', 'Shipped with Blue Dart. AWB 7788123456', 5), ev('delivered', 'Delivered.', 2)]},
    {name: 'Gold Open-Heart Necklace', status: 'return_requested', daysAgo: 8, pay: 'ONLINE',
      extra: {courier: 'DTDC', awb: 'D12345678', delivered_at: new Date(Date.now() - 3 * day), return_reason: 'Chain is shorter than shown in photos'},
      events: [ev('placed', 'Payment received. Order confirmed.', 8), ev('shipped', 'Shipped with DTDC. AWB D12345678', 6), ev('delivered', 'Delivered.', 3), ev('return_requested', 'Return requested: Chain is shorter than shown in photos', 1)]},
    {name: 'Charcoal Facewash', status: 'refunded', daysAgo: 12, pay: 'COD',
      extra: {delivered_at: new Date(Date.now() - 9 * day), return_reason: 'Received a damaged bottle', refund_method: 'manual', refunded_at: new Date(Date.now() - day)},
      events: [ev('placed', 'Order placed. Pay on delivery.', 12), ev('delivered', 'Delivered.', 9), ev('return_requested', 'Return requested: Received a damaged bottle', 8), ev('refunded', 'Return received. Refund issued.', 1)]},
  ];
  for (const d of demo) {
    const p = (await one('SELECT * FROM products WHERE name = $1', [d.name]))!;
    const at = new Date(Date.now() - d.daysAgo * day);
    const paid = d.pay === 'ONLINE';
    const o = (await one(
      `INSERT INTO orders(buyer_id, address, payment_method, payment_status, gateway_payment_id, subtotal, delivery_fee, total, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [customer, JSON.stringify(addr), d.pay, paid ? 'paid' : 'cod', paid ? `pay_test_seed${p.id}` : null,
        p.price, p.price >= 499 ? 0 : 49, p.price + (p.price >= 499 ? 0 : 49), at],
    ))!;
    const commission = Math.round(p.price * 10) / 100;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const s = (await one('SELECT gstin FROM sellers WHERE user_id = $1', [p.seller_id]))!;
    const tax = splitTax(p.price, p.gst_rate, s.gstin.slice(0, 2), '29');
    const commissionGst = r2(commission * 0.18), tcs = r2(tax.taxable * 0.01), tds = r2(tax.taxable * 0.001);
    const invoiced = d.status !== 'placed';
    const invoiceNo = invoiced
      ? `MEY/S${p.seller_id}/${fyOf()}/${String((await one(
          `INSERT INTO invoice_counters(seller_id, fy, last) VALUES ($1, $2, 1)
           ON CONFLICT (seller_id, fy) DO UPDATE SET last = invoice_counters.last + 1 RETURNING last`, [p.seller_id, fyOf()]))!.last).padStart(4, '0')}`
      : null;
    const cols = {
      order_id: o.id, product_id: p.id, seller_id: p.seller_id, name: p.name, image: p.images[0], qty: 1,
      unit_price: p.price, line_total: p.price, commission_pct: 10, commission_amt: commission,
      seller_amt: r2(p.price - commission - commissionGst - tcs - tds),
      hsn: p.hsn, gst_rate: p.gst_rate, taxable_value: tax.taxable, cgst: tax.cgst, sgst: tax.sgst, igst: tax.igst,
      commission_gst: commissionGst, tcs_amt: tcs, tds_amt: tds, invoice_no: invoiceNo, invoiced_at: invoiced ? at : null,
      status: d.status, tracking: JSON.stringify(d.events), updated_at: at, ...(d.extra ?? {}),
      ...(d.status === 'refunded' ? {refund_amount: p.price} : {}),
    };
    const keys = Object.keys(cols);
    await q(`INSERT INTO order_items(${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})`, Object.values(cols));
  }

  console.log(`Seeded ${PRODUCTS.length + 1} products, ${demo.length} demo orders.
  Admin:    admin@meyra.app / ${adminPassword}
  Seller:   meyra@seller.app / seller123   (also silvertales@, clipco@, urbanfrock@ — pending: glowlab@)
  Customer: customer@meyra.app / customer123`);
  await pool.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
