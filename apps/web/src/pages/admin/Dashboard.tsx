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
            <a href="#deletion" className="row card" style={{ padding: 14 }}>
              <span>Account deletion requests</span><span className="spacer" />
              <b style={{ fontSize: 20, color: s.deletion_requests ? 'var(--red)' : 'var(--muted)' }}>{s.deletion_requests}</b>
            </a>
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
      <DeletionRequests />
    </>
  )
}

function DeletionRequests() {
  const { data, reload } = useLoad<any[]>(() => api('/admin/deletion-requests'))
  if (!data?.length) return null
  return (
    <div id="deletion" style={{ marginTop: 20 }}>
      <h2 className="section-title">Account deletion requests</h2>
      <p className="muted small">From the public /delete-account page. Verify it’s the account owner (reply from their email / call their number), delete or anonymise the customer, then mark done. Google Play expects this within a reasonable time.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Received</th><th>Contact</th><th>Reason</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id}>
                <td className="small">{new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td><b>{r.contact}</b></td>
                <td className="small">{r.reason ?? '—'}</td>
                <td><span className={`badge ${r.status === 'done' ? 'b-approved' : 'b-pending'}`}>{r.status}</span></td>
                <td className="num">{r.status === 'open' && <button className="btn sm" onClick={() => api(`/admin/deletion-requests/${r.id}/done`, { body: {} }).then(reload)}>Mark done</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
