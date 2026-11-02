import { Link } from 'react-router-dom'
import { api, inr } from '../../api'
import { useAuth } from '../../auth'
import { Stat, useLoad } from '../../ui'

export function KycNotice() {
  const { me } = useAuth()
  const s = me?.seller
  if (!s || s.status === 'approved') return null
  return (
    <div className={s.status === 'rejected' ? 'error' : 'notice'} style={{ marginBottom: 20 }}>
      {s.status === 'pending' ? (
        <>Your KYC is <b>under review</b>. You can list products once an admin approves it. Make sure your documents and bank details are uploaded in <Link to="/seller/profile">Business &amp; KYC</Link>.</>
      ) : (
        <>Your KYC was <b>rejected</b>: {s.reject_reason}. Update your details in <Link to="/seller/profile">Business &amp; KYC</Link> to resubmit.</>
      )}
    </div>
  )
}

export default function SellerDashboard() {
  const { me } = useAuth()
  const { data: stats } = useLoad(() => api('/seller/stats'))
  const { data: earn } = useLoad(() => api('/seller/earnings'))
  const { data: notes, reload: reloadNotes } = useLoad<any[]>(() => api('/seller/notifications'))
  const p = stats?.products ?? {}
  const o = stats?.orders ?? {}

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Welcome, {me?.seller?.business_name}</h1>
          <p>Here’s how your store is doing.</p>
        </div>
        {me?.seller?.status === 'approved' && <Link className="btn" to="/seller/products/new">+ Add product</Link>}
      </div>
      <KycNotice />
      <div className="grid stats">
        <Stat label="Live products" value={p.approved ?? 0} sub={`${p.pending ?? 0} awaiting approval · ${p.rejected ?? 0} rejected`} />
        <Stat label="To ship" value={o.placed ?? 0} sub={`${o.shipped ?? 0} in transit · ${o.return_requested ?? 0} return requests`} />
        <Stat label="Gross sales" value={inr(earn?.gross ?? 0)} sub={`Commission ${inr(earn?.commission ?? 0)}`} />
        <Stat label="Payout balance" value={inr(earn?.balance ?? 0)} sub={`${inr(earn?.pending ?? 0)} pending delivery`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 20, alignItems: 'start' }}>
        <div className="card">
          <div className="row">
            <h2>Notifications</h2><span className="spacer" />
            {notes?.some(x => !x.read_at) && <button className="btn ghost sm" onClick={() => api('/seller/notifications/read', { body: {} }).then(reloadNotes)}>Mark all read</button>}
          </div>
          <div className="bell">
            {notes?.map(x => (
              <div key={x.id} className={`n ${x.read_at ? '' : 'unread'}`}>
                <b>{x.title}</b>
                <span className="small">{x.body}</span>
                <span className="muted small">{new Date(x.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
            {notes && !notes.length && <div className="empty">You’re all caught up.</div>}
          </div>
        </div>
        {!!stats?.lowStock?.length && (
        <div className="card">
          <h2>Low stock</h2>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {stats.lowStock.map((x: any) => (
                <tr key={x.id}>
                  <td>{x.name}</td>
                  <td className="num"><b style={{ color: x.stock ? 'var(--amber)' : 'var(--red)' }}>{x.stock} left</b></td>
                  <td className="num"><Link to={`/seller/products/${x.id}`}>Restock</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </>
  )
}
