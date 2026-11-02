import { useState } from 'react'
import { api, date, inr, type Product } from '../../api'
import { useNavigate } from 'react-router-dom'
import { Badge, Tabs, useLoad } from '../../ui'

type F = 'pending' | 'approved' | 'rejected' | 'all'

export default function AdminProducts() {
  const nav = useNavigate()
  const [f, setF] = useState<F>('pending')
  const { data, reload } = useLoad<Product[]>(() => api(`/admin/products${f === 'all' ? '' : `?status=${f}`}`), [f])
  const [q, setQ] = useState('')

  const approve = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    await api(`/admin/products/${id}`, { method: 'PATCH', body: { status: 'approved' } })
    reload()
  }

  const list = (data ?? []).filter(p => !q || `${p.name} ${p.sellerName} ${p.category}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Product approvals</h1>
          <p>Only approved products appear in the customer app. Click a product to review it.</p>
        </div>
        <input placeholder="Search products or sellers" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 280 }} />
      </div>
      <Tabs value={f} onChange={setF} options={[
        { value: 'pending', label: 'Awaiting approval' }, { value: 'approved', label: 'Live' },
        { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' },
      ]} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Seller</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th>Updated</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="click" onClick={() => nav(`/admin/products/${p.id}`)}>
                <td><div className="cell-product"><img className="thumb" src={p.images[0]} alt="" /><b>{p.name}</b></div></td>
                <td>{p.sellerName}</td>
                <td>{p.category}</td>
                <td className="num"><b>{inr(p.price)}</b><div className="muted small">{p.discount}% off</div></td>
                <td className="num">{p.stock}</td>
                <td className="small">{date(p.updatedAt)}</td>
                <td><Badge status={p.status} />{p.featured && <div className="small" style={{ color: 'var(--gold-dark)', fontWeight: 700 }}>★ Featured</div>}</td>
                <td className="num">
                  {p.status === 'pending' && <button className="btn green sm" onClick={e => approve(e, p.id)}>Quick approve</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !list.length && <div className="empty">Nothing here. 🎉</div>}
      </div>
    </>
  )
}
