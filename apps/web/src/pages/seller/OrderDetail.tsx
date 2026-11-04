import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, date, inr } from '../../api'
import { BackLink, Badge, useLoad } from '../../ui'
import { Timeline } from './Orders'

export default function SellerOrderDetail() {
  const { id } = useParams()
  const { data: o, reload, error } = useLoad<any>(() => api(`/seller/order-items/${id}`), [id])
  const { data: ship } = useLoad<{ couriers: string[]; shiprocket: boolean }>(() => api('/seller/shipping-options'))
  const [courier, setCourier] = useState('Delhivery')
  const [awb, setAwb] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({})
  const [busy, setBusy] = useState(false)

  const act = async (body: object, ok: string, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return
    setMsg({})
    setBusy(true)
    try {
      await api(`/seller/order-items/${id}`, { method: 'PATCH', body })
      await reload()
      setMsg({ ok })
    } catch (e: any) {
      setMsg({ err: e.message })
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="error">{error}</div>
  if (!o) return null

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink to="/seller/orders" label="Orders" />
          <div className="row"><h1>Order #{o.order_id}</h1><Badge status={o.status} /></div>
          <p>{date(o.created_at)} · {o.payment_method === 'COD' ? 'Cash on delivery — collect on delivery' : 'Prepaid online'}</p>
        </div>
      </div>
      {msg.ok && <div className="ok" style={{ marginBottom: 14 }}>{msg.ok}</div>}
      {msg.err && <div className="error" style={{ marginBottom: 14 }}>{msg.err}</div>}

      <div className="detail">
        <div className="grid">
          <div className="card">
            <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
              {o.image && <img src={o.image} alt="" style={{ width: 110, height: 138, objectFit: 'cover', borderRadius: 8 }} />}
              <div style={{ flex: 1 }}>
                <Link to={`/seller/products/${o.product_id}/view`}><h2>{o.name}</h2></Link>
                <div className="muted">{[`Qty ${o.qty}`, o.option, o.size && `Size ${o.size}`].filter(Boolean).join(' · ')}</div>
                <div className="mini-stats" style={{ marginTop: 14 }}>
                  <div><b>{inr(o.line_total)}</b><span>Customer paid</span></div>
                  <div><b>−{inr(o.commission_amt + o.commission_gst)}</b><span>Commission {o.commission_pct}% + GST</span></div>
                  <div><b>−{inr(o.tcs_amt + o.tds_amt)}</b><span>TCS + TDS</span></div>
                  <div><b>{inr(o.seller_amt)}</b><span>You receive</span></div>
                </div>
              </div>
            </div>
          </div>

          {o.return_reason && (
            <div className="card">
              <h2>Return request</h2>
              <div className="notice" style={{ marginTop: 10 }}>“{o.return_reason}”</div>
              {!!o.return_photos?.length && (
                <div className="row" style={{ marginTop: 12 }}>
                  {o.return_photos.map((p: string) => <a key={p} href={p} target="_blank"><img src={p} alt="" style={{ width: 100, height: 120, objectFit: 'cover', borderRadius: 8 }} /></a>)}
                </div>
              )}
              {o.return_note && <p className="small">Your note: {o.return_note}</p>}
            </div>
          )}

          <div className="card">
            <h2>Tracking</h2>
            {o.awb && <p className="small" style={{ margin: '8px 0 0' }}>{o.courier} · AWB <a href={o.tracking_url} target="_blank">{o.awb} ↗</a></p>}
            <Timeline events={o.tracking ?? []} />
          </div>
        </div>

        <div className="side-col">
          {o.status === 'placed' && (
            <div className="card form">
              <h2>Ship this order</h2>
              {ship?.shiprocket && (
                <>
                  <button className="btn" disabled={busy} onClick={() => act({ status: 'shipped', shiprocket: true }, 'Pickup booked with Shiprocket. The customer has been notified.')}>Book pickup with Shiprocket</button>
                  <p className="muted small" style={{ margin: 0 }}>…or enter your own courier:</p>
                </>
              )}
              <label className="field">Courier
                <select value={courier} onChange={e => setCourier(e.target.value)}>{(ship?.couriers ?? []).map(c => <option key={c}>{c}</option>)}</select>
              </label>
              <label className="field">AWB / tracking number<input value={awb} onChange={e => setAwb(e.target.value)} /></label>
              <button className="btn" disabled={busy || !awb.trim()} onClick={() => act({ status: 'shipped', courier, awb }, 'Marked as shipped. The customer got the tracking link.')}>Mark shipped</button>
              <button className="btn red" disabled={busy} onClick={() => act({ status: 'cancelled' }, 'Item cancelled.', 'Cancel this item? Stock is added back and any payment refunded.')}>Cancel item</button>
            </div>
          )}
          {o.status === 'shipped' && (
            <div className="card form">
              <h2>In transit</h2>
              <p className="small" style={{ margin: 0 }}>Mark delivered once the courier confirms delivery. Your payout is released for delivered items.</p>
              <button className="btn green" disabled={busy} onClick={() => act({ status: 'delivered' }, 'Marked as delivered.')}>Mark delivered</button>
            </div>
          )}
          {o.status === 'return_requested' && (
            <div className="card form">
              <h2>Review return</h2>
              <label className="field">Note to customer <span className="hint">Required when declining</span>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Item shows signs of use" />
              </label>
              <button className="btn green" disabled={busy} onClick={() => act({ status: 'return_approved', note: note || undefined }, 'Return approved. The customer has been notified.')}>Approve return</button>
              <button className="btn red" disabled={busy} onClick={() => act({ status: 'return_rejected', note }, 'Return declined.')}>Decline</button>
            </div>
          )}
          {o.status === 'return_approved' && (
            <div className="card form">
              <h2>Waiting for the item</h2>
              <p className="small" style={{ margin: 0 }}>Once you receive it back in good condition, confirm to refund {inr(o.line_total)} to the customer.</p>
              <button className="btn green" disabled={busy} onClick={() => act({ status: 'refunded' }, 'Refund issued.', `Confirm you received ${o.name} back?`)}>Received · Refund customer</button>
            </div>
          )}
          <div className="card form">
            <h2>Documents</h2>
            {o.label_url && <a className="btn ghost" href={o.label_url} target="_blank">Print packing slip &amp; label</a>}
            {o.invoice_url
              ? <a className="btn ghost" href={o.invoice_url} target="_blank">GST invoice {o.invoice_no}</a>
              : <span className="muted small">The GST invoice is created when you mark the order shipped.</span>}
          </div>
          <div className="card">
            <h2>Ship to</h2>
            <p style={{ margin: '8px 0 0' }}><b>{o.address.name}</b> · {o.address.phone}<br />{o.address.line1}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p>
          </div>
        </div>
      </div>
    </>
  )
}
