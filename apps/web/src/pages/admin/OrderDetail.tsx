import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, date, inr } from '../../api'
import { BackLink, Badge, useLoad } from '../../ui'
import { Timeline } from '../seller/Orders'

export default function AdminOrderDetail() {
  const { id } = useParams()
  const { data: o, reload, error } = useLoad<any>(() => api(`/admin/orders/${id}`), [id])
  const [refs, setRefs] = useState<Record<number, string>>({})
  const [err, setErr] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null)
    try {
      await fn()
      await reload()
    } catch (e: any) {
      setErr(e.message)
    }
  }

  if (error) return <div className="error">{error}</div>
  if (!o) return null
  const commission = o.items.reduce((s: number, i: any) => s + (['cancelled', 'refunded'].includes(i.status) ? 0 : i.commission_amt), 0)

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink to="/admin/orders" label="Orders" />
          <h1>Order #{o.id}</h1>
          <p>{date(o.created_at)} · {o.items.length} item{o.items.length > 1 ? 's' : ''} · {o.payment_method === 'COD' ? 'Cash on delivery' : `Online payment (${o.payment_status})`}</p>
        </div>
      </div>
      {err && <div className="error" style={{ marginBottom: 14 }}>{err}</div>}

      <div className="detail">
        <div className="grid">
          {o.items.map((it: any) => (
            <div className="card" key={it.id}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
                {it.image && <img src={it.image} alt="" style={{ width: 90, height: 112, objectFit: 'cover', borderRadius: 8 }} />}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="row"><Link to={`/admin/products/${it.product_id}`}><h3>{it.name}</h3></Link><Badge status={it.status} /></div>
                  <div className="muted small">{[`Qty ${it.qty}`, it.option, it.size && `Size ${it.size}`].filter(Boolean).join(' · ')} · sold by <Link to={`/admin/sellers/${it.seller_id}`}>{it.seller_name}</Link></div>
                  <dl className="kv" style={{ marginTop: 10 }}>
                    <dt>Amount</dt><dd>{inr(it.line_total)} · commission {inr(it.commission_amt)} ({it.commission_pct}%) · seller {inr(it.seller_amt)}</dd>
                    {it.awb && <><dt>Shipment</dt><dd>{it.courier} · <a href={it.tracking_url} target="_blank">{it.awb} ↗</a></dd></>}
                    {it.return_reason && <><dt>Return reason</dt><dd>{it.return_reason}</dd></>}
                    {it.return_note && <><dt>Seller note</dt><dd>{it.return_note}</dd></>}
                    {it.refund_method && <><dt>Refund</dt><dd>{inr(it.refund_amount)} · {it.refund_method === 'gateway' ? `Razorpay ${it.refund_ref}` : it.refund_ref ? `Paid manually (${it.refund_ref})` : <b style={{ color: 'var(--red)' }}>Manual — not paid yet</b>}</dd></>}
                  </dl>
                  {!!it.return_photos?.length && <div className="row" style={{ marginTop: 8 }}>{it.return_photos.map((p: string) => <a key={p} href={p} target="_blank"><img className="thumb" src={p} alt="" /></a>)}</div>}
                </div>
              </div>
              <Timeline events={it.tracking ?? []} />
              <div className="row">
                {it.refund_method === 'manual' && !it.refund_ref && (
                  <>
                    <input placeholder="UPI / UTR reference" value={refs[it.id] ?? ''} onChange={e => setRefs({ ...refs, [it.id]: e.target.value })} style={{ flex: 1, minWidth: 200, width: 'auto' }} />
                    <button className="btn" onClick={() => run(() => api(`/admin/order-items/${it.id}/manual-refund-done`, { body: { reference: refs[it.id] ?? '' } }))}>Mark COD refund paid</button>
                  </>
                )}
                <span className="spacer" />
                {!['cancelled', 'refunded', 'pending_payment'].includes(it.status) && (
                  <button className="btn red sm" onClick={() => confirm(`Refund ${inr(it.line_total)} to the customer?${o.payment_status === 'paid' ? ' It goes back to their card/UPI via Razorpay.' : ''}`) &&
                    run(() => api(`/admin/order-items/${it.id}/refund`, { body: {} }))}>
                    {it.status === 'placed' ? 'Cancel & refund' : 'Refund customer'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="side-col">
          <div className="card">
            <h2>Customer</h2>
            <dl className="kv" style={{ marginTop: 10, gridTemplateColumns: '80px 1fr' }}>
              <dt>Name</dt><dd>{o.buyer_name}</dd>
              <dt>Email</dt><dd>{o.buyer_email}</dd>
              <dt>Phone</dt><dd>{o.buyer_phone ?? o.address.phone}</dd>
            </dl>
            <h3 style={{ marginTop: 16 }}>Ship to</h3>
            <p className="small" style={{ margin: '6px 0 0' }}>{o.address.name} · {o.address.phone}<br />{o.address.line1}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p>
          </div>
          <div className="card">
            <h2>Payment</h2>
            <dl className="kv" style={{ marginTop: 10, gridTemplateColumns: '110px 1fr' }}>
              <dt>Subtotal</dt><dd>{inr(o.subtotal)}</dd>
              <dt>Delivery</dt><dd>{o.delivery_fee ? inr(o.delivery_fee) : 'Free'}</dd>
              <dt>Total</dt><dd><b>{inr(o.total)}</b></dd>
              <dt>Method</dt><dd>{o.payment_method === 'COD' ? 'Cash on delivery' : 'Online'}</dd>
              {o.gateway_payment_id && <><dt>Payment ID</dt><dd className="small">{o.gateway_payment_id}</dd></>}
              <dt>Commission</dt><dd>{inr(commission)}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  )
}
