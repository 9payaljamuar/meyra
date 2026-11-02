import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, date, inr } from '../../api'
import { Badge, Modal, Tabs, useLoad } from '../../ui'

type F = 'placed' | 'shipped' | 'delivered' | 'returns' | 'closed' | 'all'

const RETURNS = ['return_requested', 'return_approved']
const CLOSED = ['cancelled', 'refunded']

const match = (f: F, s: string) =>
  f === 'all' || (f === 'returns' ? RETURNS.includes(s) : f === 'closed' ? CLOSED.includes(s) : s === f)

export function Timeline({ events }: { events: { status: string; note: string; at: string }[] }) {
  return (
    <ol className="timeline">
      {events.map((e, i) => (
        <li key={i}>
          <b>{e.note}</b>
          <span className="muted small">{new Date(e.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </li>
      ))}
    </ol>
  )
}

export default function SellerOrders() {
  const nav = useNavigate()
  const { data, reload } = useLoad<any[]>(() => api('/seller/orders'))
  const { data: ship } = useLoad<{ couriers: string[]; shiprocket: boolean }>(() => api('/seller/shipping-options'))
  const [f, setF] = useState<F>('placed')
  const [err, setErr] = useState<string | null>(null)
  const [shipping, setShipping] = useState<any>(null)
  const [courier, setCourier] = useState('Delhivery')
  const [awb, setAwb] = useState('')
  const [reviewing, setReviewing] = useState<any>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const list = (data ?? []).filter(o => match(f, o.status))
  const n = (s: F) => (data ?? []).filter(o => match(s, o.status)).length

  const act = async (id: number, body: object, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return false
    setErr(null)
    setBusy(true)
    try {
      await api(`/seller/order-items/${id}`, { method: 'PATCH', body })
      await reload()
      return true
    } catch (e: any) {
      setErr(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p>Ship new orders with a tracking number, then mark them delivered. Payouts are released for delivered items.</p>
        </div>
      </div>
      {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}
      <Tabs value={f} onChange={setF} options={[
        { value: 'placed', label: `To ship (${n('placed')})` },
        { value: 'shipped', label: `In transit (${n('shipped')})` },
        { value: 'delivered', label: `Delivered (${n('delivered')})` },
        { value: 'returns', label: `Returns (${n('returns')})` },
        { value: 'closed', label: `Cancelled / refunded (${n('closed')})` },
        { value: 'all', label: 'All' },
      ]} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Order</th><th>Item</th><th>Ship to</th><th className="num">Amount</th><th className="num">You get</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {list.map(o => (
              <tr key={o.id} className="click" onClick={() => nav(`/seller/orders/${o.id}`)}>
                <td>
                  <b>#{o.order_id}</b>
                  <div className="muted small">{date(o.created_at)}</div>
                  <span className={`badge ${o.payment_method === 'COD' ? 'b-pending' : 'b-approved'}`}>{o.payment_method === 'COD' ? 'COD' : 'Prepaid'}</span>
                </td>
                <td>
                  <div className="cell-product">
                    {o.image && <img className="thumb" src={o.image} alt="" />}
                    <div>
                      <b>{o.name}</b>
                      <span className="muted small">Qty {o.qty}{o.option ? ` · ${o.option}` : ''}{o.size ? ` · Size ${o.size}` : ''}</span>
                      {o.awb && (
                        <div className="small">
                          {o.courier} · <a href={o.tracking_url} target="_blank" onClick={e => e.stopPropagation()}>{o.awb} ↗</a>
                        </div>
                      )}
                      {o.return_reason && <div className="small" style={{ color: 'var(--red)' }}>Return: “{o.return_reason}”</div>}
                    </div>
                  </div>
                </td>
                <td className="small">
                  <b>{o.address.name}</b> · {o.address.phone}<br />
                  {o.address.line1}, {o.address.city}, {o.address.state} {o.address.pincode}
                </td>
                <td className="num">{inr(o.line_total)}<div className="muted small">−{inr(o.commission_amt)} ({o.commission_pct}%)</div></td>
                <td className="num"><b>{inr(o.seller_amt)}</b></td>
                <td><Badge status={o.status} />{o.refund_method && <div className="muted small">{o.refund_method === 'gateway' ? 'Refunded to card/UPI' : 'Manual refund'}</div>}</td>
                <td className="num" onClick={e => e.stopPropagation()}>
                  <div className="row" style={{ justifyContent: 'flex-end' }}>
                    {o.status === 'placed' && <button className="btn sm" onClick={() => { setShipping(o); setAwb('') }}>Ship</button>}
                    {o.status === 'shipped' && <button className="btn green sm" disabled={busy} onClick={() => act(o.id, { status: 'delivered' })}>Mark delivered</button>}
                    {o.status === 'return_requested' && <button className="btn sm" onClick={() => { setReviewing(o); setNote('') }}>Review return</button>}
                    {o.status === 'return_approved' && (
                      <button className="btn green sm" disabled={busy} onClick={() => act(o.id, { status: 'refunded' }, `Confirm you received ${o.name} back? The customer will be refunded ${inr(o.line_total)}.`)}>
                        Received · Refund
                      </button>
                    )}
                    {o.status === 'placed' && (
                      <button className="btn red sm" onClick={() => act(o.id, { status: 'cancelled' }, 'Cancel this item? Stock will be added back and any payment refunded.')}>Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !list.length && <div className="empty">No orders here.</div>}
      </div>

      {shipping && (
        <Modal onClose={() => setShipping(null)}>
          <h2>Ship order #{shipping.order_id}</h2>
          <p className="muted">{shipping.qty} × {shipping.name} → {shipping.address.name}, {shipping.address.city} {shipping.address.pincode}</p>
          {err && <div className="error">{err}</div>}
          {ship?.shiprocket && (
            <div className="card" style={{ marginTop: 12 }}>
              <h3>Book with Shiprocket</h3>
              <p className="muted small">Shiprocket picks the best courier for this pincode and assigns the AWB automatically.</p>
              <button className="btn" disabled={busy} onClick={async () => { if (await act(shipping.id, { status: 'shipped', shiprocket: true })) setShipping(null) }}>
                {busy ? 'Booking…' : 'Book pickup'}
              </button>
            </div>
          )}
          <div className="form" style={{ marginTop: 16 }}>
            <h3>{ship?.shiprocket ? '…or enter your own courier' : 'Courier & tracking'}</h3>
            <div className="form-grid">
              <label className="field">Courier
                <select value={courier} onChange={e => setCourier(e.target.value)}>
                  {(ship?.couriers ?? []).map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="field">AWB / tracking number<input value={awb} onChange={e => setAwb(e.target.value)} autoFocus /></label>
            </div>
            <p className="muted small">The customer gets an SMS and email with the tracking link.</p>
            <div className="row">
              <span className="spacer" />
              <button className="btn ghost" onClick={() => setShipping(null)}>Cancel</button>
              <button className="btn" disabled={busy || !awb.trim()} onClick={async () => { if (await act(shipping.id, { status: 'shipped', courier, awb })) setShipping(null) }}>
                Mark shipped
              </button>
            </div>
          </div>
        </Modal>
      )}

      {reviewing && (
        <Modal onClose={() => setReviewing(null)}>
          <h2>Return request — order #{reviewing.order_id}</h2>
          <p><b>{reviewing.name}</b> · {inr(reviewing.line_total)} · {reviewing.payment_method === 'COD' ? 'paid in cash' : 'paid online'}</p>
          <div className="notice">“{reviewing.return_reason}”</div>
          {!!reviewing.return_photos?.length && (
            <div className="row" style={{ marginTop: 12 }}>
              {reviewing.return_photos.map((p: string) => <a key={p} href={p} target="_blank"><img className="thumb" src={p} alt="" style={{ width: 90, height: 110 }} /></a>)}
            </div>
          )}
          <Timeline events={reviewing.tracking} />
          {err && <div className="error">{err}</div>}
          <div className="form" style={{ marginTop: 12 }}>
            <label className="field">Note to customer <span className="hint">Required when declining</span>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Item shows signs of use" />
            </label>
            <div className="row">
              <button className="btn red" disabled={busy} onClick={async () => { if (await act(reviewing.id, { status: 'return_rejected', note })) setReviewing(null) }}>Decline</button>
              <span className="spacer" />
              <button className="btn green" disabled={busy} onClick={async () => { if (await act(reviewing.id, { status: 'return_approved', note: note || undefined })) setReviewing(null) }}>Approve return</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
