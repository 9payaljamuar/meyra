import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, date, inr, type Product } from '../../api'
import { BackLink, Badge, Doc, KYC_REJECT_REASONS, ReasonPicker, useLoad } from '../../ui'

type Data = { seller: any; sales: any; money: any; products: Product[]; orders: any[]; payouts: any[] }

export default function AdminSellerDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, reload, error, setData } = useLoad<Data>(() => api(`/admin/sellers/${id}`), [id])
  const [reason, setReason] = useState('')
  const [pct, setPct] = useState('')
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!data) return
    setReason(data.seller.reject_reason ?? '')
    setPct(data.seller.commission_pct != null ? String(data.seller.commission_pct) : '')
  }, [data?.seller.user_id, data?.seller.status])

  const act = async (body: object, ok: string) => {
    setMsg({})
    setBusy(true)
    try {
      await api(`/admin/sellers/${id}`, { method: 'PATCH', body })
      await reload()
      setMsg({ ok })
    } catch (e: any) {
      setMsg({ err: e.message })
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="error">{error}</div>
  if (!data) return null
  const { seller: s, sales, money, products, orders, payouts } = data
  const g = s.gst_check

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink to="/admin/sellers" label="Sellers & KYC" />
          <div className="row"><h1>{s.business_name}</h1><Badge status={s.status} /></div>
          <p>{s.name} · {s.email} · {s.phone} · joined {date(s.joined_at)}</p>
        </div>
      </div>
      {msg.ok && <div className="ok" style={{ marginBottom: 14 }}>{msg.ok}</div>}
      {msg.err && <div className="error" style={{ marginBottom: 14 }}>{msg.err}</div>}

      <div className="detail">
        <div className="grid">
          <div className="card">
            <h2>KYC</h2>
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>GSTIN</dt><dd><b>{s.gstin}</b> <a href="https://services.gst.gov.in/services/searchtp" target="_blank" className="small">Verify on GST portal ↗</a></dd>
              <dt>GST check</dt>
              <dd>
                {g?.checksum ? <span className="badge b-approved">Checksum valid</span> : <span className="badge b-rejected">Checksum failed</span>}{' '}
                {g?.live && (g.live.ok
                  ? <span className="small"><b>{g.live.legalName ?? '—'}</b>{g.live.tradeName ? ` (${g.live.tradeName})` : ''} · {g.live.status ?? 'status unknown'}</span>
                  : <span className="small" style={{ color: 'var(--red)' }}>Live lookup failed{g.live.error ? `: ${g.live.error}` : ''}</span>)}
                {' '}<button className="btn ghost sm" onClick={async () => { const c = await api(`/admin/sellers/${id}/gst-check`, { body: {} }); setData({ ...data, seller: { ...s, gst_check: c } }) }}>Re-check</button>
              </dd>
              <dt>PAN</dt><dd>{s.pan}</dd>
              <dt>Pickup address</dt><dd>{s.address ?? '—'}</dd>
              <dt>Bank</dt><dd>{s.bank_account ? `${s.bank_account} · ${s.bank_ifsc}` : <span style={{ color: 'var(--red)' }}>Not added</span>}</dd>
              {s.reviewed_at && <><dt>Reviewed</dt><dd>{date(s.reviewed_at)}</dd></>}
            </dl>
            <div className="row" style={{ marginTop: 16, alignItems: 'flex-start', gap: 12 }}>
              <Doc url={s.gst_doc} label="GST certificate" />
              <Doc url={s.pan_doc} label="PAN card" />
            </div>
          </div>

          <div className="card">
            <h2>Business</h2>
            <div className="mini-stats" style={{ marginTop: 12 }}>
              <div><b>{products.filter(p => p.status === 'approved').length}</b><span>Live products</span></div>
              <div><b>{sales.units}</b><span>Units sold</span></div>
              <div><b>{inr(sales.revenue)}</b><span>Gross sales</span></div>
              <div><b>{inr(sales.commission)}</b><span>Commission earned</span></div>
              <div><b>{inr(money.balance)}</b><span>Payout due</span></div>
              <div><b>{sales.returns}</b><span>Returns</span></div>
            </div>
          </div>

          <h2 className="section-title">Products ({products.length})</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th>Status</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="click" onClick={() => nav(`/admin/products/${p.id}`)}>
                    <td><div className="cell-product"><img className="thumb" src={p.images[0]} alt="" /><b>{p.name}</b></div></td>
                    <td>{p.category}</td>
                    <td className="num">{inr(p.price)}</td>
                    <td className="num">{p.stock}</td>
                    <td><Badge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!products.length && <div className="empty">No products yet.</div>}
          </div>

          <h2 className="section-title">Recent orders</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Item</th><th>Customer</th><th className="num">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="click" onClick={() => nav(`/admin/orders/${o.order_id}`)}>
                    <td><b>#{o.order_id}</b><div className="muted small">{date(o.created_at)}</div></td>
                    <td><div className="cell-product">{o.image && <img className="thumb" src={o.image} alt="" />}{o.qty} × {o.name}</div></td>
                    <td>{o.buyer_name}</td>
                    <td className="num">{inr(o.line_total)}</td>
                    <td><Badge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length && <div className="empty">No orders yet.</div>}
          </div>

          {!!payouts.length && (
            <>
              <h2 className="section-title">Payouts</h2>
              <div className="table-wrap">
                <table>
                  <tbody>
                    {payouts.map(p => <tr key={p.id}><td>{date(p.created_at)}</td><td>{p.reference ?? '—'}</td><td className="num"><b>{inr(p.amount)}</b></td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="side-col">
          <div className="card form">
            <h2>KYC decision</h2>
            {s.status === 'rejected' && <div className="error">Rejected: {s.reject_reason}</div>}
            {s.status !== 'approved' && (
              <button className="btn green" disabled={busy} onClick={() => act({ status: 'approved' }, 'Seller approved and notified.')}>Approve seller</button>
            )}
            <label className="field">Reject with reason <span className="hint">The seller sees this and can resubmit</span></label>
            <ReasonPicker reasons={KYC_REJECT_REASONS} value={reason} onChange={setReason} />
            <button className="btn red" disabled={busy || !reason.trim()} onClick={() => act({ status: 'rejected', rejectReason: reason }, 'Seller rejected and notified.')}>
              {s.status === 'approved' ? 'Suspend & reject' : 'Reject'}
            </button>
          </div>
          <div className="card form">
            <h2>Commission</h2>
            <label className="field">Override (%) <span className="hint">Empty = category/default rate</span>
              <input type="number" min="0" max="100" step="0.5" value={pct} onChange={e => setPct(e.target.value)} />
            </label>
            <button className="btn ghost" disabled={busy} onClick={() => act({ commissionPct: pct === '' ? null : Number(pct) }, 'Commission saved.')}>Save rate</button>
          </div>
        </div>
      </div>
    </>
  )
}
