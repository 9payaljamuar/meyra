import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { upload } from './api'
import { useAuth } from './auth'

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  const reload = useCallback(() => {
    setError(null)
    return run().then(setData, e => setError(e.message))
  }, [run])
  useEffect(() => {
    reload()
  }, [reload])
  return { data, error, reload, setData }
}

const LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment', return_requested: 'Return requested', return_approved: 'Return approved',
}

export function Badge({ status }: { status: string }) {
  const label = LABELS[status] ?? status[0].toUpperCase() + status.slice(1)
  return <span className={`badge b-${status}`}>{label}</span>
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export function Tabs<T extends string>({ value, options, onChange }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="tabs">
      {options.map(o => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}

export function ImagePicker({ value, onChange, max = 8, accept = 'image/*' }: {
  value: string[]
  onChange: (v: string[]) => void
  max?: number
  accept?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setErr(null)
    try {
      const urls = await upload(Array.from(files).slice(0, max - value.length))
      onChange([...value, ...urls])
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }
  return (
    <div>
      <div className="images">
        {value.map((u, i) => (
          <div className="img" key={u}>
            {u.endsWith('.pdf') ? (
              <a href={u} target="_blank" className="add">PDF</a>
            ) : (
              <img src={u} alt="" />
            )}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        {value.length < max && (
          <label className="add">
            {busy ? 'Uploading…' : '+ Add'}
            <input ref={ref} type="file" accept={accept} multiple={max > 1} hidden onChange={e => pick(e.target.files)} />
          </label>
        )}
      </div>
      {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
    </div>
  )
}

export function Shell({ role, links }: { role: string; links: { to: string; label: string; count?: number }[] }) {
  const { me, logout } = useAuth()
  return (
    <div className="shell">
      <aside className="side">
        <img src="/logo.jpg" className="logo" alt="Meyra" />
        <div className="role">{role}</div>
        <nav>
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to.split('/').length <= 2}>
              {l.label}
              {!!l.count && <span className="count">{l.count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="foot">
          <b>{me?.seller?.business_name ?? me?.name}</b>
          <span className="muted small">{me?.email}</span>
          <div style={{ marginTop: 10 }}>
            <button className="btn ghost sm" onClick={logout}>Log out</button>
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

export const PRODUCT_REJECT_REASONS = [
  'Cover photo must have a plain white or light background',
  'Photos are blurry, dark or low quality',
  'Cover photo shows the product held in hand — please use a clean product shot',
  'Product name or description is incomplete',
  'Price or MRP looks incorrect',
  'Wrong category selected',
  'Duplicate listing',
  'Restricted or prohibited product',
]

export const KYC_REJECT_REASONS = [
  'GST certificate is missing or unreadable',
  'PAN card is missing or unreadable',
  'Bank account details are missing',
  'Business name does not match the GST registration',
  'Address does not match the GST registration',
]

/** Preset rejection reasons as chips; clicking one fills (or appends to) the free-text reason. */
export function ReasonPicker({ reasons, value, onChange, placeholder }: {
  reasons: string[]; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const toggle = (r: string) => {
    const parts = value.split('; ').filter(Boolean)
    onChange((parts.includes(r) ? parts.filter(p => p !== r) : [...parts, r]).join('; '))
  }
  return (
    <div className="form" style={{ gap: 8 }}>
      <div className="checks">
        {reasons.map(r => (
          <button type="button" key={r} className={`check ${value.split('; ').includes(r) ? 'on' : ''}`} onClick={() => toggle(r)}>{r}</button>
        ))}
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? 'Or write your own reason'} />
    </div>
  )
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="small back">← {label}</Link>
}

export function Gallery({ images }: { images: string[] }) {
  const [i, setI] = useState(0)
  if (!images.length) return <div className="empty">No photos</div>
  return (
    <div className="gallery">
      <img src={images[Math.min(i, images.length - 1)]} alt="" />
      {images.length > 1 && (
        <div className="mini">{images.map((u, n) => <img key={u + n} src={u} onClick={() => setI(n)} alt="" className={n === i ? 'on' : ''} />)}</div>
      )}
    </div>
  )
}

export function Doc({ url, label }: { url: string | null; label: string }) {
  if (!url) return <div className="doc missing">{label}<span>Not uploaded</span></div>
  return url.endsWith('.pdf')
    ? <a href={url} target="_blank" className="doc">{label}<span>PDF ↗</span></a>
    : <a href={url} target="_blank" className="doc"><img src={url} alt={label} />{label}</a>
}
