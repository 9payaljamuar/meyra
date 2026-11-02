import { useState } from 'react'
import { api, date, inr } from '../../api'
import { useNavigate } from 'react-router-dom'
import { Badge, Tabs, useLoad } from '../../ui'

type F = 'all' | 'placed' | 'shipped' | 'delivered' | 'returns' | 'refunds' | 'cancelled'

const match = (f: F, o: any) =>
  f === 'all' ||
  (f === 'returns' ? ['return_requested', 'return_approved'].includes(o.status)
    : f === 'refunds' ? !!o.refund_method
    : o.status === f)

export default function AdminOrders() {
  const nav = useNavigate()
  const { data } = useLoad<any[]>(() => api('/admin/orders'))
  const [f, setF] = useState<F>('all')
  const list = (data ?? []).filter(o => match(f, o))
  const live = (data ?? []).filter(o => !['cancelled', 'refunded'].includes(o.status))
  const totals = live.reduce((a, o) => ({ gmv: a.gmv + o.line_total, comm: a.comm + o.commission_amt }), { gmv: 0, comm: 0 })
  const manualDue = (data ?? []).filter(o => o.refund_method === 'manual' && !o.refund_ref).length

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p>Every order line across all sellers, with the commission deducted at checkout. Click a row for full details.</p>
        </div>
        <div className="muted">GMV <b style={{ color: 'var(--ink)' }}>{inr(totals.gmv)}</b> · Commission <b style={{ color: 'var(--ink)' }}>{inr(totals.comm)}</b></div>
      </div>
      {manualDue > 0 && (
        <div className="notice" style={{ marginBottom: 14 }}>
          {manualDue} cash-on-delivery refund{manualDue > 1 ? 's need' : ' needs'} to be paid manually (UPI/bank). Open it under “Refunds” to record the payment.
        </div>
      )}
      <Tabs value={f} onChange={setF} options={(['all', 'placed', 'shipped', 'delivered', 'returns', 'refunds', 'cancelled'] as F[]).map(s => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Item</th><th>Customer</th><th>Seller</th><th className="num">Amount</th><th className="num">Commission</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {list.map(o => (
              <tr key={o.id} className="click" onClick={() => nav(`/admin/orders/${o.order_id}`)}>
                <td><b>#{o.order_id}</b><div className="muted small">{date(o.created_at)}</div></td>
                <td><div className="cell-product">{o.image && <img className="thumb" src={o.image} alt="" />}<div><b>{o.name}</b><span className="muted small">Qty {o.qty}{o.option ? ` · ${o.option}` : ''}{o.size ? ` · ${o.size}` : ''}</span></div></div></td>
                <td className="small">{o.buyer_name}<br />{o.address.city}</td>
                <td>{o.seller_name}</td>
                <td className="num">{inr(o.line_total)}</td>
                <td className="num"><b>{inr(o.commission_amt)}</b><div className="muted small">{o.commission_pct}%</div></td>
                <td><span className={`badge ${o.payment_status === 'paid' ? 'b-approved' : 'b-pending'}`}>{o.payment_status === 'paid' ? 'Prepaid' : 'COD'}</span></td>
                <td>
                  <Badge status={o.status} />
                  {o.refund_method === 'manual' && !o.refund_ref && <div className="small" style={{ color: 'var(--red)' }}>Refund to pay</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !list.length && <div className="empty">No orders here.</div>}
      </div>
    </>
  )
}
