import { Link } from 'react-router-dom'
import { api, inr } from '../../api'
import { Stat, useLoad } from '../../ui'

export default function AdminDashboard() {
  const { data: s } = useLoad(() => api('/admin/stats'))
  if (!s) return null
  const max = Math.max(1, ...s.daily.map((d: any) => d.gmv))
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Marketplace overview</h1>
          <p>Sales, commission and what needs your attention.</p>
        </div>
      </div>
      <div className="grid stats">
        <Stat label="Gross sales (GMV)" value={inr(s.gmv)} sub={`${s.orders} orders`} />
        <Stat label="Commission earned" value={inr(s.commission)} />
        <Stat label="Live products" value={s.live_products} />
        <Stat label="Approved sellers" value={s.approved_sellers} />
        <Stat label="Customers" value={s.buyers} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginTop: 20 }}>
        <div className="card">
          <h2>Needs attention</h2>
          <div className="grid" style={{ marginTop: 12, gap: 10 }}>
            <Link to="/admin/sellers" className="row card" style={{ padding: 14 }}>
              <span>Seller KYC waiting for review</span><span className="spacer" />
              <b style={{ fontSize: 20, color: s.pending_sellers ? 'var(--amber)' : 'var(--muted)' }}>{s.pending_sellers}</b>
            </Link>
            <Link to="/admin/products" className="row card" style={{ padding: 14 }}>
              <span>Products waiting for approval</span><span className="spacer" />
              <b style={{ fontSize: 20, color: s.pending_products ? 'var(--amber)' : 'var(--muted)' }}>{s.pending_products}</b>
            </Link>
            <Link to="/admin/orders" className="row card" style={{ padding: 14 }}>
              <span>Open return requests</span><span className="spacer" />
              <b style={{ fontSize: 20, color: s.open_returns ? 'var(--amber)' : 'var(--muted)' }}>{s.open_returns}</b>
            </Link>
            <Link to="/admin/orders" className="row card" style={{ padding: 14 }}>
              <span>COD refunds to pay manually</span><span className="spacer" />
              <b style={{ fontSize: 20, color: s.manual_refunds ? 'var(--red)' : 'var(--muted)' }}>{s.manual_refunds}</b>
            </Link>
          </div>
        </div>
        <div className="card">
          <h2>Sales — last 14 days</h2>
          {s.daily.length ? (
            <div className="bars">
              {s.daily.map((d: any) => (
                <div className="bar" key={d.day} title={`${d.day}: ${inr(d.gmv)} GMV, ${inr(d.commission)} commission`}>
                  <div style={{ height: `${(d.gmv / max) * 100}%` }} />
                  <span>{d.day}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No sales yet.</div>
          )}
        </div>
      </div>
    </>
  )
}
