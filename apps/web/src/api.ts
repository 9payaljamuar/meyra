const BASE = '/api'
const TOKEN_KEY = 'meyra_token'

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  field?: string
  constructor(message: string, status: number, field?: string) {
    super(message)
    this.status = status
    this.field = field
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const t = token.get()
  const res = await fetch(BASE + path, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  // A stored token that the server no longer accepts (expired, password changed): sign out cleanly.
  if (res.status === 401 && t && !path.startsWith('/auth/')) {
    token.clear()
    window.location.assign('/login?expired=1')
  }
  if (!res.ok) throw new ApiError(data.error ?? 'Request failed', res.status, data.field)
  return data
}

export async function upload(files: FileList | File[]): Promise<string[]> {
  const fd = new FormData()
  Array.from(files).forEach(f => fd.append('files', f))
  const res = await fetch(BASE + '/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.get()}` },
    body: fd,
  })
  const data = await res.json()
  if (!res.ok) throw new ApiError(data.error ?? 'Upload failed', res.status)
  return data.urls
}

export const inr = (n: number) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 })

export const date = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export type Product = {
  id: number
  name: string
  description: string
  group: string
  category: string
  price: number
  mrp: number
  discount: number
  stock: number
  images: string[]
  skinTypes: string[]
  hairTypes: string[]
  sizes: string[]
  option: { label: 'Shade' | 'Colour'; values: { name: string; hex: string; images?: string[] }[] } | null
  status: 'pending' | 'approved' | 'rejected'
  rejectReason: string | null
  featured: boolean
  sellerId: number
  sellerName: string
  rating: number
  reviewCount: number
  updatedAt: string
}

export type Meta = {
  groups: string[]
  categories: Record<string, string[]>
  skinTypes: string[]
  hairTypes: string[]
  sizes: string[]
}
