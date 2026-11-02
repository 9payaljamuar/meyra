import { useState } from 'react'
import { api, date } from '../../api'
import { useNavigate } from 'react-router-dom'
import { Badge, Tabs, useLoad } from '../../ui'

type F = 'pending' | 'approved' | 'rejected' | 'all'

export default function AdminSellers() {
  const nav = useNavigate()
  const [f, setF] = useState<F>('pending')
  const { data } = useLoad<any[]>(() => api(`/admin/sellers${f === 'all' ? '' : `?status=${f}`}`), [f])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sellers &amp; KYC</h1>
          <p>Verify GST and KYC documents before a seller can list products. Click a seller to review.</p>
        </div>
      </div>
      <Tabs value={f} onChange={setF} options={[
        { value: 'pending', label: 'Pending KYC' }, { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' },
      ]} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Business</th><th>GSTIN</th><th>Contact</th><th>Docs</th><th className="num">Products</th><th className="num">Commission</th><th>Status</th></tr></thead>
          <tbody>
            {data?.map(s => (
              <tr key={s.user_id} className="click" onClick={() => nav(`/admin/sellers/${s.user_id}`)}>
                <td><b>{s.business_name}</b><div className="muted small">Joined {date(s.created_at)}</div></td>
                <td>{s.gstin}{s.gst_check && !s.gst_check.checksum && <div className="small" style={{ color: 'var(--red)' }}>Checksum failed</div>}</td>
                <td className="small">{s.name}<br />{s.email} · {s.phone}</td>
                <td className="small">{[s.gst_doc && 'GST', s.pan_doc && 'PAN', s.bank_account && 'Bank'].filter(Boolean).join(', ') || <span style={{ color: 'var(--red)' }}>Missing</span>}</td>
                <td className="num">{s.product_count}</td>
                <td className="num">{s.commission_pct != null ? `${s.commission_pct}%` : <span className="muted">Default</span>}</td>
                <td><Badge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.length && <div className="empty">No sellers here.</div>}
      </div>
    </>
  )
}
