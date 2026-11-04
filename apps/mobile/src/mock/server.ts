// Offline stand-in for the Meyra API, used when USE_MOCK is on (preview builds).
// Mirrors the real endpoints' request/response shapes so screens don't care which one they talk to.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {HAIR_TYPES, PRODUCTS, SKIN_TYPES} from './catalog';
import {reviewsFor} from './reviews';

const CATEGORIES: Record<string, string[]> = {
  Cosmetics: ['Skincare', 'Haircare', 'Makeup', 'Fragrance'],
  Apparel: ['Dresses', 'Tops', 'Kurtas', 'Bottoms'],
  Accessories: ['Earrings', 'Necklaces', 'Hair Accessories', 'Bags'],
};

const asset = (k: string) => `asset:${k}`;

const CATALOG = PRODUCTS.map((p, i) => ({
  id: i + 1,
  name: p.name,
  description: p.desc,
  group: p.group,
  category: p.category,
  price: p.price,
  mrp: p.mrp,
  discount: Math.round(((p.mrp - p.price) / p.mrp) * 100),
  stock: p.id === 'j6' || p.id === 'h2' ? 3 : 25,
  images: p.images.map(asset),
  skinTypes: p.skinTypes ?? [],
  hairTypes: p.hairTypes ?? [],
  sizes: p.sizes ?? [],
  option: p.option
    ? {label: p.option.label, values: p.option.values.map(v => ({...v, images: v.images?.map(asset)}))}
    : null,
  featured: !!p.bestseller,
  isNew: !!p.isNew,
  sellerId: 1,
  sellerName: p.seller,
  rating: p.rating,
  reviewCount: p.reviewCount,
  _key: p.id,
}));

type MockUser = {id: number; name: string; email: string; phone?: string; password: string};

const K = {users: 'mock_users', orders: 'mock_orders', reviews: 'mock_reviews', stock: 'mock_stock'};

async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
const save = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v));

const DEMO_USER: MockUser = {id: 1, name: 'Ananya', email: 'customer@meyra.app', phone: '9900000000', password: 'customer123'};

async function users() {
  const list = await load<MockUser[]>(K.users, []);
  return list.length ? list : [DEMO_USER];
}

const publicUser = (u: MockUser) => ({id: u.id, name: u.name, email: u.email, role: 'buyer' as const});
const session = (u: MockUser) => ({token: `mock:${u.id}`, user: publicUser(u)});

class MockError extends Error {}
const fail = (msg: string): never => {
  throw new MockError(msg);
};

async function me(token: string | null) {
  const id = Number(token?.replace('mock:', ''));
  const u = (await users()).find(x => x.id === id);
  if (!u) fail('Please log in');
  return u!;
}

// Orders move forward on their own so the full journey can be demoed:
// placed → shipped (1 min) → delivered (3 min); returns: requested → approved (1 min) → refunded (2 min).
const MIN = 60_000;
const COURIER = 'Delhivery';

/** Derive an item's current state and tracking timeline from the timestamps stored on it. */
function present(item: any, order: any) {
  const ev: {status: string; note: string; at: string}[] = [];
  const at = (t: number) => new Date(t).toISOString();
  const now = Date.now();
  if (order.payment_method === 'ONLINE') ev.push({status: 'pending_payment', note: 'Waiting for payment.', at: order.created_at});
  if (order.payment_status === 'pending') return {...item, status: 'pending_payment', tracking: ev, can_return: false};
  const placed = new Date(item.placedAt ?? order.created_at).getTime();
  ev.push({status: 'placed', note: order.payment_method === 'COD' ? 'Order placed. Pay on delivery.' : 'Payment received. Order confirmed.', at: at(placed)});
  if (item.cancelledAt) {
    ev.push({status: 'cancelled', note: 'Cancelled by you.', at: item.cancelledAt});
    return {...item, status: 'cancelled', tracking: ev, can_return: false,
      refund_amount: order.payment_status === 'paid' ? item.line_total : null, refund_method: order.payment_status === 'paid' ? 'gateway' : null};
  }
  const awb = `14908${String(item.id).slice(-7)}`;
  const ship = {courier: COURIER, awb, tracking_url: `https://www.delhivery.com/track/package/${awb}`};
  if (now - placed < MIN) return {...item, status: 'placed', tracking: ev, can_return: false};
  ev.push({status: 'shipped', note: `Shipped with ${COURIER}. AWB ${awb}`, at: at(placed + MIN)});
  if (now - placed < 3 * MIN) return {...item, ...ship, status: 'shipped', tracking: ev, can_return: false};
  const delivered = placed + 3 * MIN;
  ev.push({status: 'delivered', note: 'Delivered.', at: at(delivered)});
  if (!item.returnAt) {
    return {...item, ...ship, status: 'delivered', delivered_at: at(delivered), tracking: ev, can_return: now - delivered < 7 * 864e5};
  }
  const r = new Date(item.returnAt).getTime();
  ev.push({status: 'return_requested', note: `Return requested: ${item.return_reason}`, at: item.returnAt});
  if (now - r < MIN) return {...item, ...ship, status: 'return_requested', tracking: ev, can_return: false};
  ev.push({status: 'return_approved', note: 'Return approved. Pickup will be arranged.', at: at(r + MIN)});
  if (now - r < 2 * MIN) return {...item, ...ship, status: 'return_approved', tracking: ev, can_return: false};
  ev.push({status: 'refunded', note: 'Return received. Refund issued.', at: at(r + 2 * MIN)});
  return {...item, ...ship, status: 'refunded', tracking: ev, can_return: false, refund_amount: item.line_total,
    refund_method: order.payment_status === 'paid' ? 'gateway' : 'manual', refunded_at: at(r + 2 * MIN)};
}

async function stockOf() {
  return load<Record<number, number>>(K.stock, {});
}

async function products() {
  const stock = await stockOf();
  const extra = await load<any[]>(K.reviews, []);
  return CATALOG.map(p => {
    const mine = extra.filter(r => r.productId === p.id);
    const total = p.rating * p.reviewCount + mine.reduce((s, r) => s + r.rating, 0);
    const count = p.reviewCount + mine.length;
    return {...p, stock: stock[p.id] ?? p.stock, reviewCount: count, rating: count ? Math.round((total / count) * 10) / 10 : 0};
  });
}

export async function mockApi(path: string, method: string, body: any, token: string | null): Promise<any> {
  await new Promise<void>(r => setTimeout(r, 250 + Math.random() * 250));
  const [route, query = ''] = path.split('?');
  const Q = Object.fromEntries(query.split('&').filter(Boolean).map(kv => {
    const [k, v = ''] = kv.split('=');
    return [k, decodeURIComponent(v)];
  }));
  const list = (v?: string) => (v ? v.split(',').filter(Boolean) : []);
  let m: RegExpMatchArray | null;

  if (route === '/meta') return {groups: Object.keys(CATEGORIES), categories: CATEGORIES, skinTypes: SKIN_TYPES, hairTypes: HAIR_TYPES};

  // ---- catalog ----
  if (route === '/products' && method === 'GET') {
    const q = (Q.q ?? '').toLowerCase();
    const skin = list(Q.skin);
    const hair = list(Q.hair);
    const ids = list(Q.ids).map(Number);
    let out = (await products()).filter(p =>
      (!q || `${p.name} ${p.category} ${p.group} ${p.sellerName}`.toLowerCase().includes(q)) &&
      (!Q.group || p.group === Q.group) &&
      (!Q.category || p.category === Q.category) &&
      (!skin.length || p.skinTypes.some(t => skin.includes(t))) &&
      (!hair.length || p.hairTypes.some(t => hair.includes(t))) &&
      (!Q.minPrice || p.price >= Number(Q.minPrice)) &&
      (!Q.maxPrice || p.price < Number(Q.maxPrice)) &&
      (!Q.minDiscount || p.discount >= Number(Q.minDiscount)) &&
      (!Q.featured || p.featured) &&
      (!ids.length || ids.includes(p.id)),
    );
    const sorts: Record<string, (a: any, b: any) => number> = {
      popular: (a, b) => b.reviewCount - a.reviewCount,
      newest: (a, b) => Number(b.isNew) - Number(a.isNew) || b.id - a.id,
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      discount: (a, b) => b.discount - a.discount,
      rating: (a, b) => b.rating - a.rating,
    };
    out = [...out].sort(sorts[Q.sort] ?? sorts.popular);
    return out.slice(0, Number(Q.limit) || 200);
  }

  if ((m = route.match(/^\/products\/(\d+)$/))) {
    const p = (await products()).find(x => x.id === Number(m![1]));
    return p ?? fail('Product not found');
  }

  if ((m = route.match(/^\/products\/(\d+)\/reviews$/))) {
    const id = Number(m[1]);
    const extra = await load<any[]>(K.reviews, []);
    if (method === 'POST') {
      const u = await me(token);
      if (!body?.rating) fail('Please choose a star rating');
      const orders = await load<any[]>(K.orders, []);
      const bought = orders.some(o => o.buyerId === u.id && o.items.some((i: any) => i.product_id === id));
      const r = {id: Date.now(), productId: id, name: u.name, rating: body.rating, text: body.text ?? '', photos: body.photos ?? [], verified: bought, createdAt: new Date(Date.now()).toISOString()};
      await save(K.reviews, [r, ...extra]);
      return r;
    }
    const p = CATALOG.find(x => x.id === id);
    if (!p) fail('Product not found');
    const seeded = reviewsFor(PRODUCTS.find(x => x.id === p!._key)!).map((r, n) => ({
      id: n + 1, name: r.name, rating: r.rating, text: r.text, verified: r.verified,
      photos: r.photo ? [asset(r.photo)] : [],
      createdAt: new Date(Date.now() - (n + 1) * 6 * 864e5).toISOString(),
    }));
    return [...extra.filter(r => r.productId === id), ...seeded];
  }

  // ---- auth ----
  if (route === '/auth/login') {
    const u = (await users()).find(x => x.email.toLowerCase() === String(body.email).toLowerCase());
    if (!u || u.password !== body.password) fail('Wrong email or password');
    return session(u!);
  }
  if (route === '/auth/register') {
    const all = await users();
    if (String(body.name ?? '').trim().length < 2) fail('Please enter your name');
    if (!/^\S+@\S+\.\S+$/.test(body.email ?? '')) fail('Please enter a valid email');
    if (String(body.password ?? '').length < 6) fail('Password must be at least 6 characters');
    if (all.some(x => x.email.toLowerCase() === body.email.toLowerCase())) fail('Email already registered');
    const u: MockUser = {id: Math.max(...all.map(x => x.id)) + 1, name: body.name.trim(), email: body.email.trim(), phone: body.phone, password: body.password};
    await save(K.users, [...all, u]);
    return session(u);
  }
  if (route === '/auth/otp/send') {
    if (!/^[6-9]\d{9}$/.test(body.phone ?? '')) fail('Enter a valid 10-digit mobile number');
    return {ok: true, devCode: '123456'};
  }
  if (route === '/auth/otp/verify') {
    if (body.code !== '123456') fail('Incorrect code. (Preview code: 123456)');
    const all = await users();
    let u = all.find(x => x.phone === body.phone);
    if (!u) {
      u = {id: Math.max(...all.map(x => x.id)) + 1, name: body.name || 'Meyra Shopper', email: `${body.phone}@phone.meyra`, phone: body.phone, password: ''};
      await save(K.users, [...all, u]);
    }
    return session(u);
  }
  if (route === '/auth/me' && method === 'DELETE') {
    const u = await me(token);
    await save(K.users, (await users()).filter(x => x.id !== u.id));
    return {ok: true};
  }
  if (route === '/auth/me') return publicUser(await me(token));
  if (route === '/auth/password/forgot') {
    if (!/^\S+@\S+\.\S+$/.test(body?.email ?? '')) fail('Enter a valid email');
    return {ok: true, devCode: '123456'};
  }
  if (route === '/auth/password/reset') {
    if (body.code !== '123456') fail('Incorrect code. (Preview code: 123456)');
    if (String(body.password ?? '').length < 6) fail('Password must be at least 6 characters');
    const all = await users();
    const u = all.find(x => x.email.toLowerCase() === String(body.email).toLowerCase());
    if (!u) fail('Account not found');
    u!.password = body.password;
    await save(K.users, all);
    return session(u!);
  }
  if (route === '/auth/register-seller') {
    if (!body?.gstin) fail('Enter your GSTIN');
    return session({id: 999, name: body.name, email: body.email, password: ''});
  }

  // ---- orders ----
  if (route === '/orders' && method === 'POST') {
    const u = await me(token);
    const all = await products();
    const stock = await stockOf();
    const a = body.address ?? {};
    if (String(a.name ?? '').trim().length < 2) fail('Please enter the full name');
    if (!/^[6-9]\d{9}$/.test(a.phone ?? '')) fail('Enter a valid 10-digit mobile');
    if (String(a.line1 ?? '').trim().length < 3) fail('Please enter your address');
    if (!/^\d{6}$/.test(a.pincode ?? '')) fail('Enter a valid 6-digit pincode');
    if (!a.city || !a.state) fail('Please enter city and state');
    const items = body.items.map((it: any, n: number) => {
      const p = all.find(x => x.id === it.productId);
      if (!p) fail('A product in your bag is no longer available');
      if (p!.stock < it.qty) fail(`Only ${p!.stock} left of ${p!.name}`);
      if (p!.sizes.length && !it.size) fail(`Pick a size for ${p!.name}`);
      const img = p!.option?.values.find(v => v.name === it.option)?.images?.[0] ?? p!.images[0];
      return {
        id: Date.now() + n, product_id: p!.id, name: p!.name, image: img, option: it.option, size: it.size,
        qty: it.qty, unit_price: p!.price, line_total: p!.price * it.qty, seller_name: p!.sellerName,
      };
    });
    items.forEach((i: any) => { stock[i.product_id] = (stock[i.product_id] ?? CATALOG.find(p => p.id === i.product_id)!.stock) - i.qty; });
    const subtotal = items.reduce((s: number, i: any) => s + i.line_total, 0);
    const delivery = subtotal >= 499 ? 0 : 49;
    const online = body.paymentMethod === 'ONLINE';
    const orders = await load<any[]>(K.orders, []);
    const order = {
      id: 1000 + orders.length + 1, buyerId: u.id, address: a, payment_method: online ? 'ONLINE' : 'COD',
      payment_status: online ? 'pending' : 'cod', subtotal, delivery_fee: delivery, total: subtotal + delivery,
      created_at: new Date(Date.now()).toISOString(), items,
    };
    await save(K.orders, [order, ...orders]);
    await save(K.stock, stock);
    return online ? {...order, payment: {url: null, test: true}} : order;
  }

  const withOrder = async (id: number, fn: (o: any, all: any[]) => void | Promise<void>) => {
    const u = await me(token);
    const orders = await load<any[]>(K.orders, []);
    const o = orders.find(x => x.id === id && x.buyerId === u.id);
    if (!o) fail('Order not found');
    await fn(o, orders);
    await save(K.orders, orders);
    return o;
  };
  const restock = async (items: any[]) => {
    const stock = await stockOf();
    items.forEach(i => { stock[i.product_id] = (stock[i.product_id] ?? CATALOG.find(p => p.id === i.product_id)!.stock) + i.qty; });
    await save(K.stock, stock);
  };

  if ((m = route.match(/^\/orders\/(\d+)\/payment\/test$/))) {
    await withOrder(Number(m[1]), async o => {
      if (o.payment_status !== 'pending') return;
      if (body.outcome === 'success') {
        o.payment_status = 'paid';
        o.items.forEach((i: any) => { i.placedAt = new Date(Date.now()).toISOString(); });
      } else {
        o.payment_status = 'failed';
        await restock(o.items);
      }
    });
    return {ok: true};
  }
  if ((m = route.match(/^\/orders\/(\d+)\/payment\/cancel$/))) {
    await withOrder(Number(m[1]), async o => {
      if (o.payment_status !== 'pending') return;
      o.payment_status = 'failed';
      await restock(o.items);
    });
    return {ok: true};
  }
  if ((m = route.match(/^\/orders\/(\d+)\/payment$/))) {
    const o = await withOrder(Number(m[1]), () => {});
    return {status: o.payment_status, url: null, total: o.total, test: true};
  }
  if (route === '/orders') {
    const u = await me(token);
    const orders = await load<any[]>(K.orders, []);
    return orders
      .filter(o => o.buyerId === u.id && o.payment_status !== 'failed')
      .map(o => ({...o, items: o.items.map((i: any) => present(i, o))}));
  }
  if ((m = route.match(/^\/orders\/items\/(\d+)\/(cancel|return)$/))) {
    const id = Number(m[1]);
    const action = m[2];
    const u = await me(token);
    const orders = await load<any[]>(K.orders, []);
    const o = orders.find(x => x.buyerId === u.id && x.items.some((i: any) => i.id === id));
    if (!o) fail('Order not found');
    const raw = o.items.find((i: any) => i.id === id);
    const cur = present(raw, o);
    if (action === 'cancel') {
      if (cur.status !== 'placed') fail('This item can no longer be cancelled');
      raw.cancelledAt = new Date(Date.now()).toISOString();
      await restock([raw]);
    } else {
      if (cur.status !== 'delivered') fail('Only delivered items can be returned');
      if (String(body?.reason ?? '').trim().length < 3) fail('Tell us why you want to return it');
      raw.returnAt = new Date(Date.now()).toISOString();
      raw.return_reason = body.reason.trim();
      raw.return_photos = body.photos ?? [];
    }
    await save(K.orders, orders);
    return {ok: true};
  }

  fail(`Not available in preview: ${route}`);
}
