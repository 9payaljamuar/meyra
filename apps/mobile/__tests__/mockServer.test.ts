jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: async (k: string) => store[k] ?? null,
      setItem: async (k: string, v: string) => { store[k] = v; },
      removeItem: async (k: string) => { delete store[k]; },
    },
  };
});
jest.mock('../src/images', () => ({IMG: {}}));

import {mockApi} from '../src/mock/server';

const call = (path: string, body?: any, token: string | null = null, method?: string) =>
  mockApi(path, method ?? (body ? 'POST' : 'GET'), body, token);

const addr = {name: 'Test', phone: '9876543210', line1: '12 MG Road', city: 'Pune', state: 'MH', pincode: '411001'};

test('catalog filters and sorts', async () => {
  const all = await call('/products?limit=200');
  expect(all.length).toBe(31);
  const oily = await call('/products?skin=Oily&minDiscount=25');
  expect(oily.map((p: any) => p.name)).toEqual(['Neem Facewash']);
  const cheap = await call('/products?category=Dresses&sort=price_asc');
  expect(cheap[0].price).toBeLessThanOrEqual(cheap[1].price);
  const p = await call(`/products/${all[0].id}`);
  expect(p.images[0]).toMatch(/^asset:/);
  const reviews = await call(`/products/${all[0].id}/reviews`);
  expect(reviews.length).toBeGreaterThan(0);
});

test('auth: register, login, otp, me', async () => {
  await expect(call('/auth/login', {email: 'customer@meyra.app', password: 'nope'})).rejects.toThrow('Wrong email');
  const demo = await call('/auth/login', {email: 'customer@meyra.app', password: 'customer123'});
  expect(demo.user.role).toBe('buyer');
  const reg = await call('/auth/register', {name: 'Riya', email: 'riya@x.com', password: 'secret1'});
  expect((await call('/auth/me', undefined, reg.token)).name).toBe('Riya');
  await expect(call('/auth/register', {name: 'Riya', email: 'riya@x.com', password: 'secret1'})).rejects.toThrow('already');
  await call('/auth/otp/send', {phone: '9811122233'});
  await expect(call('/auth/otp/verify', {phone: '9811122233', code: '000000'})).rejects.toThrow('Incorrect');
  const otp = await call('/auth/otp/verify', {phone: '9811122233', code: '123456'});
  expect(otp.user.name).toBe('Meyra Shopper');
});

test('orders: size required, stock, cancel, review verified', async () => {
  const {token} = await call('/auth/login', {email: 'customer@meyra.app', password: 'customer123'});
  const dress = (await call('/products?category=Dresses')).find((p: any) => p.option);
  await expect(call('/orders', {items: [{productId: dress.id, qty: 1}], address: addr}, token)).rejects.toThrow('Pick a size');
  const order = await call('/orders', {items: [{productId: dress.id, qty: 2, option: 'Mustard', size: 'M'}], address: addr}, token);
  expect(order.items[0].image).toBe('asset:p26');
  expect(order.total).toBe(dress.price * 2);
  expect((await call(`/products/${dress.id}`)).stock).toBe(dress.stock - 2);
  const mine = await call('/orders', undefined, token);
  expect(mine[0].items[0].status).toBe('placed');
  await call(`/orders/items/${mine[0].items[0].id}/cancel`, {}, token);
  expect((await call(`/products/${dress.id}`)).stock).toBe(dress.stock);
  const r = await call(`/products/${dress.id}/reviews`, {rating: 5, text: 'Love it'}, token);
  expect(r.verified).toBe(true);
  expect((await call(`/products/${dress.id}`)).reviewCount).toBe(dress.reviewCount + 1);
});

test('online payment, failed payment restock, timed shipping, return → refund', async () => {
  const {token} = await call('/auth/login', {email: 'customer@meyra.app', password: 'customer123'});
  const p = (await call('/products?category=Haircare'))[0];
  const before = (await call(`/products/${p.id}`)).stock;

  const failed = await call('/orders', {items: [{productId: p.id, qty: 1}], address: addr, paymentMethod: 'ONLINE'}, token);
  expect(failed.payment.test).toBe(true);
  expect((await call(`/products/${p.id}`)).stock).toBe(before - 1);
  await call(`/orders/${failed.id}/payment/test`, {outcome: 'failure'}, token);
  expect((await call(`/products/${p.id}`)).stock).toBe(before);

  const o = await call('/orders', {items: [{productId: p.id, qty: 1}], address: addr, paymentMethod: 'ONLINE'}, token);
  let mine = await call('/orders', undefined, token);
  expect(mine.find((x: any) => x.id === o.id).items[0].status).toBe('pending_payment');
  await call(`/orders/${o.id}/payment/test`, {outcome: 'success'}, token);
  expect((await call(`/orders/${o.id}/payment`, undefined, token)).status).toBe('paid');

  const t0 = Date.now();
  const at = (min: number) => jest.spyOn(Date, 'now').mockReturnValue(t0 + min * 60_000);
  const item = async () => (await call('/orders', undefined, token)).find((x: any) => x.id === o.id).items[0];
  expect((await item()).status).toBe('placed');
  at(2);
  expect((await item()).status).toBe('shipped');
  expect((await item()).awb).toBeTruthy();
  at(4);
  const delivered = await item();
  expect(delivered.status).toBe('delivered');
  expect(delivered.can_return).toBe(true);
  await call(`/orders/items/${delivered.id}/return`, {reason: 'Too small'}, token);
  expect((await item()).status).toBe('return_requested');
  at(5.5);
  expect((await item()).status).toBe('return_approved');
  at(6.5);
  const refunded = await item();
  expect(refunded.status).toBe('refunded');
  expect(refunded.refund_method).toBe('gateway');
  expect(refunded.tracking.map((e: any) => e.status)).toEqual(
    ['pending_payment', 'placed', 'shipped', 'delivered', 'return_requested', 'return_approved', 'refunded']);
  (Date.now as jest.Mock).mockRestore();
}, 30_000);
