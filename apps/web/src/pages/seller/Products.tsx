import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, inr, type Product } from '../../api'
import { useAuth } from '../../auth'
import { Badge, Tabs, useLoad } from '../../ui'
import { KycNotice } from './Dashboard'

type F = 'all' | 'approved' | 'pending' | 'rejected'

export default function SellerProducts() {
  const { me } = useAuth()
  const nav = useNavigate()
  const { data, reload } = useLoad<Product[]>(() => api('/seller/products'))
  const [f, setF] = useState<F>('all')
  const list = (data ?? []).filter(p => f === 'all' || p.status === f)
  const n = (s: F) => (data ?? []).filter(p => s === 'all' || p.status === s).length

  const del = async (p: Product) => {
    if (!confirm(`Delete “${p.name}”?`)) return
    const r = await api(`/seller/products/${p.id}`, { method: 'DELETE' })
    if (r.archived) alert('This product has orders, so it was taken off sale (stock set to 0) instead of deleted.')
    reload()
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>New products and edits go to the Meyra team for approval before they appear in the app.</p>
        </div>
        {me?.seller?.status === 'approved' && <Link className="btn" to="/seller/products/new">+ Add product</Link>}
      </div>
      <KycNotice />
      <Tabs value={f} onChange={setF} options={[
        { value: 'all', label: `All (${n('all')})` },
        { value: 'approved', label: `Live (${n('approved')})` },
        { value: 'pending', label: `Awaiting approval (${n('pending')})` },
        { value: 'rejected', label: `Rejected (${n('rejected')})` },
      ]} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th className="num">Rating</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="click" onClick={() => nav(`/seller/products/${p.id}/view`)}>
                <td>
                  <div className="cell-product">
                    <img className="thumb" src={p.images[0]} alt="" />
                    <div>
                      <b>{p.name}</b>
                      {p.status === 'rejected' && <span className="small" style={{ color: 'var(--red)' }}>Reason: {p.rejectReason}</span>}
                    </div>
                  </div>
                </td>
                <td>{p.category}<div className="muted small">{p.group}</div></td>
                <td className="num"><b>{inr(p.price)}</b><div className="muted small"><s>{inr(p.mrp)}</s> {p.discount}% off</div></td>
                <td className="num" style={{ color: p.stock < 5 ? 'var(--red)' : undefined }}>{p.stock}</td>
                <td className="num">{p.reviewCount ? `★ ${p.rating} (${p.reviewCount})` : '—'}</td>
                <td><Badge status={p.status} /></td>
                <td className="num" onClick={e => e.stopPropagation()}>
                  <div className="row" style={{ justifyContent: 'flex-end' }}>
                    <Link className="btn ghost sm" to={`/seller/products/${p.id}`}>Edit</Link>
                    <button className="btn red sm" onClick={() => del(p)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !list.length && <div className="empty">No products here yet.</div>}
      </div>
    </>
  )
}
