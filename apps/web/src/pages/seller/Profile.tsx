import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { Badge, ChangePassword, ImagePicker } from '../../ui'
import { KycNotice } from './Dashboard'

export default function SellerProfile() {
  const { refresh } = useAuth()
  const [params] = useSearchParams()
  const [p, setP] = useState<any>(null)
  const [f, setF] = useState({ businessName: '', address: '', bankAccount: '', bankIfsc: '', gstDoc: [] as string[], panDoc: [] as string[] })
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({})
  const [busy, setBusy] = useState(false)

  const load = () =>
    api('/seller/profile').then(d => {
      setP(d)
      setF({
        businessName: d.business_name ?? '', address: d.address ?? '', bankAccount: d.bank_account ?? '', bankIfsc: d.bank_ifsc ?? '',
        gstDoc: d.gst_doc ? [d.gst_doc] : [], panDoc: d.pan_doc ? [d.pan_doc] : [],
      })
    })
  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg({})
    try {
      await api('/seller/profile', {
        method: 'PATCH',
        body: {
          businessName: f.businessName, address: f.address || undefined,
          bankAccount: f.bankAccount || undefined, bankIfsc: f.bankIfsc || undefined,
          gstDoc: f.gstDoc[0], panDoc: f.panDoc[0],
        },
      })
      await Promise.all([load(), refresh()])
      setMsg({ ok: 'Saved.' })
    } catch (e: any) {
      setMsg({ err: e.message })
    } finally {
      setBusy(false)
    }
  }

  if (!p) return null
  const missing = !f.gstDoc.length || !f.panDoc.length || !f.bankAccount
  return (
    <>
    <form onSubmit={save}>
      <div className="page-head">
        <div>
          <h1>Business &amp; KYC</h1>
          <p>KYC status: <Badge status={p.status} /></p>
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
      {params.get('welcome') && missing && (
        <div className="ok" style={{ marginBottom: 16 }}>Account created! Step 2 of 2: upload your GST certificate, PAN card and bank details, then save.</div>
      )}
      <KycNotice />
      {msg.ok && <div className="ok" style={{ marginBottom: 16 }}>{msg.ok}</div>}
      {msg.err && <div className="error" style={{ marginBottom: 16 }}>{msg.err}</div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <div className="card form">
          <h2>Business</h2>
          <dl className="kv">
            <dt>GSTIN</dt><dd><b>{p.gstin}</b></dd>
            <dt>PAN</dt><dd>{p.pan}</dd>
            <dt>Contact</dt><dd>{p.name} · {p.phone}</dd>
            <dt>Email</dt><dd>{p.email}</dd>
            <dt>Commission</dt><dd>{p.commission_pct != null ? `${p.commission_pct}% (custom)` : 'Standard rate'}</dd>
          </dl>
          <label className="field">Business name<input value={f.businessName} onChange={e => setF({ ...f, businessName: e.target.value })} /></label>
          <label className="field">Pickup address<textarea value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></label>
        </div>
        <div className="grid">
          <div className="card form">
            <h2>KYC documents</h2>
            <label className="field">GST certificate <span className="hint">JPG, PNG or PDF</span>
              <ImagePicker value={f.gstDoc} onChange={v => setF({ ...f, gstDoc: v })} max={1} accept="image/*,application/pdf" />
            </label>
            <label className="field">PAN card
              <ImagePicker value={f.panDoc} onChange={v => setF({ ...f, panDoc: v })} max={1} accept="image/*,application/pdf" />
            </label>
          </div>
          <div className="card form">
            <h2>Bank account for payouts</h2>
            <label className="field">Account number<input value={f.bankAccount} onChange={e => setF({ ...f, bankAccount: e.target.value.replace(/\D/g, '') })} /></label>
            <label className="field">IFSC<input value={f.bankIfsc} onChange={e => setF({ ...f, bankIfsc: e.target.value.toUpperCase() })} maxLength={11} /></label>
          </div>
        </div>
      </div>
    </form>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 16, alignItems: 'start' }}>
      <div className="card form">
        <h2>Holiday mode</h2>
        <p className="small" style={{ margin: 0 }}>
          {p.on_holiday
            ? 'Your store is paused: your products are hidden from customers and can’t be ordered.'
            : 'Going away? Pause your store so customers can’t order until you’re back. Orders already placed still need shipping.'}
        </p>
        <button type="button" className={`btn ${p.on_holiday ? 'green' : 'ghost'}`} onClick={async () => {
          await api('/seller/profile', { method: 'PATCH', body: { onHoliday: !p.on_holiday } })
          await load()
        }}>{p.on_holiday ? 'Reopen my store' : 'Pause my store'}</button>
      </div>
      <ChangePassword />
    </div>
    </>
  )
}
