import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useState} from 'react';
import {ImageSourcePropType} from 'react-native';
import {API_URL, USE_MOCK} from './config';
import {IMG} from './images';
import {mockApi} from './mock/server';

export type OptionValue = {name: string; hex: string; images?: string[]};

export type Product = {
  id: number;
  name: string;
  description: string;
  group: 'Cosmetics' | 'Apparel' | 'Accessories';
  category: string;
  price: number;
  mrp: number;
  discount: number;
  stock: number;
  images: string[];
  skinTypes: string[];
  hairTypes: string[];
  sizes: string[];
  option: {label: 'Shade' | 'Colour'; values: OptionValue[]} | null;
  featured: boolean;
  isNew: boolean;
  sellerId: number;
  sellerName: string;
  rating: number;
  reviewCount: number;
};

export type Review = {
  id: number;
  name: string;
  rating: number;
  text: string;
  photos: string[];
  verified: boolean;
  createdAt: string;
};

export type Meta = {
  groups: string[];
  categories: Record<string, string[]>;
  skinTypes: string[];
  hairTypes: string[];
};

export type User = {id: number; name: string; email: string; role: 'buyer' | 'seller' | 'admin'};

const TOKEN_KEY = 'meyra_token';
let token: string | null = null;

export const session = {
  async load() {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    return token;
  },
  async set(t: string | null) {
    token = t;
    if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  },
};

export function imageUrl(path?: string): ImageSourcePropType | undefined {
  if (!path) return undefined;
  if (path.startsWith('asset:')) return IMG[path.slice(6)];
  if (/^(https?|file|content):/.test(path)) return {uri: path};
  return {uri: API_URL + path};
}

export async function api<T = any>(path: string, opts: {method?: string; body?: unknown} = {}): Promise<T> {
  if (USE_MOCK) return mockApi(path, opts.method ?? (opts.body ? 'POST' : 'GET'), opts.body, token);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: {
        ...(opts.body ? {'Content-Type': 'application/json'} : {}),
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach Meyra. Check your internet connection.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
  return data;
}

export async function uploadImages(files: {uri: string; type?: string; fileName?: string}[]): Promise<string[]> {
  if (USE_MOCK) return files.map(f => f.uri);
  const fd = new FormData();
  files.forEach((f, i) =>
    fd.append('files', {uri: f.uri, type: f.type ?? 'image/jpeg', name: f.fileName ?? `photo-${i}.jpg`} as any),
  );
  const res = await fetch(API_URL + '/upload', {
    method: 'POST',
    headers: token ? {Authorization: `Bearer ${token}`} : {},
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return data.urls;
}

export const qs = (o: Record<string, unknown>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : String(v))}`)
    .join('&');

/** Fetches on mount and whenever `key` changes. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(path));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return {data, error, loading, reload: load};
}
