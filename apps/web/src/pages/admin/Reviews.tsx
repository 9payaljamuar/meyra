import { api, date } from '../../api'
import { useNavigate } from 'react-router-dom'
import { useLoad } from '../../ui'

export default function AdminReviews() {
  const nav = useNavigate()
  const { data, reload } = useLoad<any[]>(() => api('/admin/reviews'))
  const del = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Remove this review from the app?')) return
    await api(`/admin/reviews/${id}`, { method: 'DELETE' })
    reload()
  }
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reviews</h1>
          <p>Customer ratings, reviews and photos. Remove anything abusive or fake.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Photos</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {data?.map(r => (
              <tr key={r.id} className="click" onClick={() => nav(`/admin/products/${r.product_id}`)}>
                <td><b>{r.product_name}</b></td>
                <td>{r.user_name}{r.verified && <div className="small" style={{ color: 'var(--green)' }}>✓ Verified buyer</div>}</td>
                <td style={{ color: 'var(--amber)', whiteSpace: 'nowrap' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                <td style={{ maxWidth: 360 }}>{r.text}</td>
                <td><div className="row">{r.photos.map((p: string) => <a key={p} href={p} target="_blank" onClick={e => e.stopPropagation()}><img className="thumb" src={p} alt="" /></a>)}</div></td>
                <td className="small">{date(r.created_at)}</td>
                <td className="num"><button className="btn red sm" onClick={e => del(e, r.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
