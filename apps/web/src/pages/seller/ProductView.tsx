import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, date, inr, type Product } from '../../api'
import { BackLink, Badge, Gallery, useLoad } from '../../ui'

type Data = { product: Product; sales: any; reviews: any[]; orders: any[] }

export default function SellerProductView() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, error } = useLoad<Data>(() => api(`/seller/products/${id}/overview`), [id])
  if (error) return <div className="error">{error}</div>
  if (!data) return null
  const { product: p, sales, reviews, orders } = data
  const gallery = [...p.images, ...(p.option?.values.flatMap(v => v.images ?? []) ?? [])]

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink to="/seller/products" label="Products" />
          <div className="row"><h1>{p.name}</h1><Badge status={p.status} />{p.featured && <span className="badge b-shipped">★ Featured by Meyra</span>}</div>
          <p>{p.group} › {p.category} · updated {date(p.updatedAt)}</p>
        </div>
        <Link className="btn" to={`/seller/products/${p.id}`}>Edit product</Link>
      </div>
      {p.status === 'rejected' && <div className="error" style={{ marginBottom: 14 }}>Not approved: {p.rejectReason}. Edit the product to fix it and resubmit.</div>}
      {p.status === 'pending' && <div className="notice" style={{ marginBottom: 14 }}>Waiting for Meyra to approve. It will appear in the app once approved.</div>}

      <div className="detail">
        <div className="grid">
          <div className="card product-top">
            <Gallery images={gallery} />
            <div>
              <div><span className="price-big">{inr(p.price)}</span> <s className="muted">{inr(p.mrp)}</s> <b style={{ color: 'var(--green)' }}>{p.discount}% off</b></div>
              <p>{p.description || <span className="muted">No description</span>}</p>
              <dl className="kv">
                <dt>Stock</dt><dd style={{ color: p.stock < 5 ? 'var(--red)' : undefined }}>{p.stock}{p.stock < 5 && ' — running low'}</dd>
                {!!p.skinTypes.length && <><dt>Skin types</dt><dd>{p.skinTypes.join(', ')}</dd></>}
                {!!p.hairTypes.length && <><dt>Hair types</dt><dd>{p.hairTypes.join(', ')}</dd></>}
                {!!p.sizes.length && <><dt>Sizes</dt><dd>{p.sizes.join(', ')}</dd></>}
                {p.option && <><dt>{p.option.label}s</dt><dd className="row">{p.option.values.map(v => <span key={v.name} className="row" style={{ gap: 4 }}><i className="swatch" style={{ background: v.hex }} />{v.name}</span>)}</dd></>}
              </dl>
            </div>
          </div>

          <h2 className="section-title">Orders</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Variant</th><th className="num">You get</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="click" onClick={() => nav(`/seller/orders/${o.id}`)}>
                    <td><b>#{o.order_id}</b><div className="muted small">{date(o.created_at)}</div></td>
                    <td className="small">{[`Qty ${o.qty}`, o.option, o.size].filter(Boolean).join(' · ')}</td>
                    <td className="num">{inr(o.seller_amt)}</td>
                    <td><Badge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length && <div className="empty">No orders yet.</div>}
          </div>

          <h2 className="section-title">Customer reviews</h2>
          <div className="card bell">
            {reviews.map(r => (
              <div className="n" key={r.id}>
                <b><span style={{ color: 'var(--amber)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span> {r.user_name}{r.verified && <span className="small" style={{ color: 'var(--green)' }}> · Verified buyer</span>}</b>
                <span className="small">{r.text}</span>
                {!!r.photos.length && <div className="row">{r.photos.map((ph: string) => <img key={ph} className="thumb" src={ph} alt="" />)}</div>}
                <span className="muted small">{date(r.created_at)}</span>
              </div>
            ))}
            {!reviews.length && <div className="empty">No reviews yet.</div>}
          </div>
        </div>

        <div className="side-col">
          <div className="card">
            <h2>Performance</h2>
            <div className="mini-stats" style={{ marginTop: 12, gridTemplateColumns: '1fr 1fr' }}>
              <div><b>{sales.units}</b><span>Units sold</span></div>
              <div><b>{inr(sales.earnings)}</b><span>Your earnings</span></div>
              <div><b>{p.reviewCount ? `★ ${p.rating}` : '—'}</b><span>{p.reviewCount} reviews</span></div>
              <div><b>{sales.returns}</b><span>Returns</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
