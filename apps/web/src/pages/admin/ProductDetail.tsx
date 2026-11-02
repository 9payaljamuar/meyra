import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, date, inr, type Product } from '../../api'
import { BackLink, Badge, Gallery, PRODUCT_REJECT_REASONS, ReasonPicker, useLoad } from '../../ui'

type Data = { product: Product; sales: any; reviews: any[]; orders: any[] }

export default function AdminProductDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, reload, error } = useLoad<Data>(() => api(`/admin/products/${id}`), [id])
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setReason(data?.product.rejectReason ?? '') }, [data?.product.rejectReason])

  const act = async (body: object) => {
    setErr(null)
    setBusy(true)
    try {
      await api(`/admin/products/${id}`, { method: 'PATCH', body })
      await reload()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="error">{error}</div>
  if (!data) return null
  const { product: p, sales, reviews, orders } = data
  const gallery = [...p.images, ...(p.option?.values.flatMap(v => v.images ?? []) ?? [])]

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink to="/admin/products" label="Product approvals" />
          <div className="row"><h1>{p.name}</h1><Badge status={p.status} />{p.featured && <span className="badge b-shipped">★ Featured</span>}</div>
          <p>by <Link to={`/admin/sellers/${p.sellerId}`}><b>{p.sellerName}</b></Link> · updated {date(p.updatedAt)}</p>
        </div>
      </div>
      {err && <div className="error" style={{ marginBottom: 14 }}>{err}</div>}

      <div className="detail">
        <div className="grid">
          <div className="card product-top">
            <Gallery images={gallery} />
            <div>
              <div><span className="price-big">{inr(p.price)}</span> <s className="muted">{inr(p.mrp)}</s> <b style={{ color: 'var(--green)' }}>{p.discount}% off</b></div>
              <p>{p.description || <span className="muted">No description</span>}</p>
              <dl className="kv">
                <dt>Category</dt><dd>{p.group} › {p.category}</dd>
                <dt>Stock</dt><dd style={{ color: p.stock < 5 ? 'var(--red)' : undefined }}>{p.stock}</dd>
                {!!p.skinTypes.length && <><dt>Skin types</dt><dd>{p.skinTypes.join(', ')}</dd></>}
                {!!p.hairTypes.length && <><dt>Hair types</dt><dd>{p.hairTypes.join(', ')}</dd></>}
                {!!p.sizes.length && <><dt>Sizes</dt><dd>{p.sizes.join(', ')}</dd></>}
                {p.option && <><dt>{p.option.label}s</dt><dd className="row">{p.option.values.map(v => <span key={v.name} className="row" style={{ gap: 4 }}><i className="swatch" style={{ background: v.hex }} />{v.name}</span>)}</dd></>}
                <dt>Rating</dt><dd>{p.reviewCount ? `★ ${p.rating} from ${p.reviewCount} reviews` : 'No reviews yet'}</dd>
              </dl>
            </div>
          </div>

          <div className="card">
            <h2>Sales</h2>
            <div className="mini-stats" style={{ marginTop: 12 }}>
              <div><b>{sales.units}</b><span>Units sold</span></div>
              <div><b>{inr(sales.revenue)}</b><span>Revenue</span></div>
              <div><b>{inr(sales.commission)}</b><span>Commission earned</span></div>
              <div><b>{sales.returns}</b><span>Returns</span></div>
            </div>
          </div>

          <h2 className="section-title">Recent orders</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Variant</th><th className="num">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="click" onClick={() => nav(`/admin/orders/${o.order_id}`)}>
                    <td><b>#{o.order_id}</b><div className="muted small">{date(o.created_at)}</div></td>
                    <td>{o.buyer_name}</td>
                    <td className="small">{[`Qty ${o.qty}`, o.option, o.size].filter(Boolean).join(' · ')}</td>
                    <td className="num">{inr(o.line_total)}</td>
                    <td><Badge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length && <div className="empty">No orders yet.</div>}
          </div>

          <h2 className="section-title">Reviews</h2>
          <div className="card bell">
            {reviews.map(r => (
              <div className="n" key={r.id}>
                <b><span style={{ color: 'var(--amber)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span> {r.user_name}{r.verified && <span className="small" style={{ color: 'var(--green)' }}> · Verified buyer</span>}</b>
                <span className="small">{r.text}</span>
                {!!r.photos.length && <div className="row">{r.photos.map((ph: string) => <img key={ph} className="thumb" src={ph} alt="" />)}</div>}
              </div>
            ))}
            {!reviews.length && <div className="empty">No reviews yet.</div>}
          </div>
        </div>

        <div className="side-col">
          <div className="card form">
            <h2>Decision</h2>
            {p.status === 'rejected' && <div className="error">Rejected: {p.rejectReason}</div>}
            {p.status !== 'approved' && (
              <button className="btn green" disabled={busy} onClick={() => act({ status: 'approved' })}>Approve &amp; publish</button>
            )}
            <label className="field">Reject with reason <span className="hint">Shown to the seller — pick one or more, or write your own</span></label>
            <ReasonPicker reasons={PRODUCT_REJECT_REASONS} value={reason} onChange={setReason} />
            <button className="btn red" disabled={busy || !reason.trim()} onClick={() => act({ status: 'rejected', rejectReason: reason })}>
              {p.status === 'approved' ? 'Unpublish & reject' : 'Reject'}
            </button>
          </div>
          <div className="card form">
            <h2>Merchandising</h2>
            <p className="muted small" style={{ margin: 0 }}>Featured products show as Bestsellers on the app home screen.</p>
            <button className="btn ghost" disabled={busy} onClick={() => act({ featured: !p.featured })}>{p.featured ? 'Remove from featured' : '★ Feature this product'}</button>
          </div>
        </div>
      </div>
    </>
  )
}
