import React, {createContext, useContext, useEffect, useMemo, useReducer, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api, Product, session, User} from './api';

// Cart lines carry a snapshot of the product so the bag renders without refetching.
export type CartLine = {
  key: string;
  productId: number;
  name: string;
  sellerName: string;
  image: string;
  price: number;
  mrp: number;
  option?: string;
  size?: string;
  qty: number;
};

type State = {cart: CartLine[]; wishlist: number[]; user: User | null; ready: boolean; onboarded: boolean};

type Action =
  | {type: 'hydrate'; state: Partial<State>}
  | {type: 'add'; line: Omit<CartLine, 'key' | 'qty'>}
  | {type: 'qty'; key: string; delta: number}
  | {type: 'remove'; key: string}
  | {type: 'clear'}
  | {type: 'wish'; id: number}
  | {type: 'user'; user: User | null}
  | {type: 'onboarded'};

const keyOf = (l: {productId: number; option?: string; size?: string}) =>
  [l.productId, l.option ?? '', l.size ?? ''].join('|');

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'hydrate':
      return {...s, ...a.state, ready: true};
    case 'add': {
      const key = keyOf(a.line);
      const hit = s.cart.find(l => l.key === key);
      return {
        ...s,
        cart: hit
          ? s.cart.map(l => (l.key === key ? {...l, qty: Math.min(l.qty + 1, 10)} : l))
          : [...s.cart, {...a.line, key, qty: 1}],
      };
    }
    case 'qty':
      return {
        ...s,
        cart: s.cart
          .map(l => (l.key === a.key ? {...l, qty: Math.min(l.qty + a.delta, 10)} : l))
          .filter(l => l.qty > 0),
      };
    case 'remove':
      return {...s, cart: s.cart.filter(l => l.key !== a.key)};
    case 'clear':
      return {...s, cart: []};
    case 'wish':
      return {
        ...s,
        wishlist: s.wishlist.includes(a.id) ? s.wishlist.filter(i => i !== a.id) : [...s.wishlist, a.id],
      };
    case 'user':
      return {...s, user: a.user};
    case 'onboarded':
      return {...s, onboarded: true};
  }
}

type Ctx = {
  ready: boolean;
  onboarded: boolean;
  finishOnboarding: () => void;
  user: User | null;
  cart: CartLine[];
  wishlist: number[];
  count: number;
  subtotal: number;
  mrpTotal: number;
  addToCart: (p: Product, option?: string, size?: string) => void;
  changeQty: (key: string, delta: number) => void;
  remove: (key: string) => void;
  clearCart: () => void;
  toggleWish: (id: number) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<string | undefined>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | undefined>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const StoreCtx = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(StoreCtx);

const PERSIST_KEY = 'meyra_store_v1';
const ONBOARD_KEY = 'meyra_onboarded';

export function StoreProvider({children}: {children: React.ReactNode}) {
  const [s, dispatch] = useReducer(reducer, {cart: [], wishlist: [], user: null, ready: false, onboarded: false});
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      let saved: Partial<State> = {};
      let user: User | null = null;
      let onboarded = false;
      try {
        onboarded = (await AsyncStorage.getItem(ONBOARD_KEY)) === '1';
        saved = JSON.parse((await AsyncStorage.getItem(PERSIST_KEY)) ?? '{}');
        if (await session.load()) user = await api<User>('/auth/me');
      } catch {
        // Offline or expired token: start logged out but keep the saved bag.
      }
      dispatch({type: 'hydrate', state: {cart: saved.cart ?? [], wishlist: saved.wishlist ?? [], user, onboarded}});
      hydrated.current = true;
    })();
  }, []);

  useEffect(() => {
    if (hydrated.current)
      AsyncStorage.setItem(PERSIST_KEY, JSON.stringify({cart: s.cart, wishlist: s.wishlist})).catch(() => {});
  }, [s.cart, s.wishlist]);

  const value = useMemo<Ctx>(() => {
    let subtotal = 0;
    let mrpTotal = 0;
    let count = 0;
    s.cart.forEach(l => {
      subtotal += l.price * l.qty;
      mrpTotal += l.mrp * l.qty;
      count += l.qty;
    });

    const signIn = async (path: string, body: object) => {
      const {token, user} = await api<{token: string; user: User}>(path, {body});
      if (user.role !== 'buyer') throw new Error('Seller and admin accounts sign in on the Meyra Partner website.');
      await session.set(token);
      dispatch({type: 'user', user});
    };

    return {
      ready: s.ready,
      onboarded: s.onboarded,
      finishOnboarding: () => {
        AsyncStorage.setItem(ONBOARD_KEY, '1').catch(() => {});
        dispatch({type: 'onboarded'});
      },
      user: s.user,
      cart: s.cart,
      wishlist: s.wishlist,
      count,
      subtotal,
      mrpTotal,
      addToCart: (p, option, size) => {
        const optImg = p.option?.values.find(v => v.name === option)?.images?.[0];
        dispatch({
          type: 'add',
          line: {
            productId: p.id, name: p.name, sellerName: p.sellerName, image: optImg ?? p.images[0],
            price: p.price, mrp: p.mrp, option, size,
          },
        });
      },
      changeQty: (key, delta) => dispatch({type: 'qty', key, delta}),
      remove: key => dispatch({type: 'remove', key}),
      clearCart: () => dispatch({type: 'clear'}),
      toggleWish: id => dispatch({type: 'wish', id}),
      login: (email, password) => signIn('/auth/login', {email, password}),
      register: (name, email, password, phone) =>
        signIn('/auth/register', {name, email, password, phone: phone || undefined}),
      sendOtp: async phone => (await api<{devCode?: string}>('/auth/otp/send', {body: {phone}})).devCode,
      verifyOtp: (phone, code) => signIn('/auth/otp/verify', {phone, code}),
      forgotPassword: async email => (await api<{devCode?: string}>('/auth/password/forgot', {body: {email}})).devCode,
      resetPassword: (email, code, password) => signIn('/auth/password/reset', {email, code, password}),
      deleteAccount: async () => {
        await api('/auth/me', {method: 'DELETE'});
        await session.set(null);
        dispatch({type: 'user', user: null});
        dispatch({type: 'clear'});
      },
      logout: async () => {
        await session.set(null);
        dispatch({type: 'user', user: null});
      },
    };
  }, [s]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
