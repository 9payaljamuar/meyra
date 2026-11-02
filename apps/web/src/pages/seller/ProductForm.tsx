import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, inr, type Meta, type Product } from '../../api'
import { ImagePicker, useLoad } from '../../ui'

type OptValue = { name: string; hex: string; images: string[] }

const EMPTY = {
  name: '', description: '', group: 'Cosmetics', category: 'Skincare',
  price: '', mrp: '', stock: '10',
  images: [] as string[], skinTypes: [] as string[], hairTypes: [] as string[], sizes: [] as string[],
  optionLabel: '' as '' | 'Shade' | 'Colour', optionValues: [] as OptValue[],
}

function Checks({ all, value, onChange }: { all: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="checks">
      {all.map(t => {
        const on = value.includes(t)
        return (
          <label key={t} className={`check ${on ? 'on' : ''}`}>
            <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter(x => x !== t) : [...value, t])} />
            {t}
          </label>
        )
      })}
    </div>
  )
}

function PhotoGuide() {
  return (
    <div className="guide">
      <b>Cover photo rules — products that follow these get approved faster</b>
      <ul>
        <li><b>Plain white or very light background</b> — no bathroom, table or outdoor scenes on the cover</li>
        <li>Only the product, centred and in focus — not held in a hand</li>
        <li>Portrait (3:4), at least 1000 × 1333 px, bright natural light, true colours</li>
        <li>Photos 2–8 can show the product in use: on a model, texture swatches, shade close-ups, ingredients</li>
        <li>No watermarks, text, logos or prices on the image</li>
      </ul>
      <div className="examples">
        <div className="ex good"><img src="/guide/p25.jpg" alt="" /><p>✓ Plain background, full product</p></div>
        <div className="ex good"><img src="/guide/p07.jpg" alt="" /><p>✓ Clean, centred, in focus</p></div>
        <div className="ex bad"><img src="/guide/p02.jpg" alt="" /><p>✗ Held in hand, blurry</p></div>
        <div className="ex bad"><img src="/guide/p13.jpg" alt="" /><p>✗ Collage — use for photo 2+</p></div>
      </div>
    </div>
  )
}

export default function ProductForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: meta } = useLoad<Meta>(() => api('/meta'))
  const [f, setF] = useState(EMPTY)
  const [status, setStatus] = useState<Product | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Shown by default for new products so sellers see the rules before uploading.
  const [guide, setGuide] = useState(!id)

  useEffect(() => {
    if (!id) return
    api<Product>(`/products/${id}`).then(p => {
      setStatus(p)
      setF({
        name: p.name, description: p.description, group: p.group, category: p.category,
        price: String(p.price), mrp: String(p.mrp), stock: String(p.stock),
        images: p.images, skinTypes: p.skinTypes, hairTypes: p.hairTypes, sizes: p.sizes,
        optionLabel: p.option?.label ?? '',
        optionValues: (p.option?.values ?? []).map(v => ({ ...v, images: v.images ?? [] })),
      })
    })
  }, [id])

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(prev => ({ ...prev, [k]: v }))
  const price = Number(f.price)
  const mrp = Number(f.mrp)
  const off = mrp > 0 && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0
  const isCosmetic = f.group === 'Cosmetics'
  const isApparel = f.group === 'Apparel'

  const setOpt = (i: number, patch: Partial<OptValue>) =>
    set('optionValues', f.optionValues.map((v, j) => (j === i ? { ...v, ...patch } : v)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const body = {
      name: f.name, description: f.description, group: f.group, category: f.category,
      price, mrp, stock: Number(f.stock), images: f.images,
      skinTypes: isCosmetic ? f.skinTypes : [], hairTypes: isCosmetic ? f.hairTypes : [],
      sizes: isApparel ? f.sizes : [],
      option: f.optionLabel && f.optionValues.length
        ? { label: f.optionLabel, values: f.optionValues.map(v => ({ ...v, images: v.images.length ? v.images : undefined })) }
        : null,
    }
    try {
      if (id) {
        const r = await api(`/seller/products/${id}`, { method: 'PUT', body })
        if (r.resubmitted) alert('Saved. Changes were sent to Meyra for approval.')
      } else {
        await api('/seller/products', { body })
      }
      nav('/seller/products')
    } catch (e: any) {
      setErr(e.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setBusy(false)
    }
  }

  if (!meta) return null
  return (
    <form onSubmit={submit}>
      <div className="page-head">
        <div>
          <Link to="/seller/products" className="small">← Products</Link>
          <h1 style={{ marginTop: 4 }}>{id ? 'Edit product' : 'Add product'}</h1>
          <p>Listing is free. Products appear in the app after Meyra approves them.</p>
        </div>
        <div className="row">
          <Link className="btn ghost" to="/seller/products">Cancel</Link>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Submit for approval'}</button>
        </div>
      </div>
      {status?.status === 'rejected' && <div className="error" style={{ marginBottom: 16 }}>Rejected: {status.rejectReason}. Fix and save to resubmit.</div>}
      {err && <div className="error" style={{ marginBottom: 16 }}>{err}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', alignItems: 'start' }}>
        <div className="grid">
          <div className="card form">
            <h2>Basics</h2>
            <label className="field">Product name<input value={f.name} onChange={e => set('name', e.target.value)} required /></label>
            <label className="field">Description<textarea value={f.description} onChange={e => set('description', e.target.value)} /></label>
            <div className="form-grid">
              <label className="field">Group
                <select value={f.group} onChange={e => setF({ ...f, group: e.target.value, category: meta.categories[e.target.value][0] })}>
                  {meta.groups.map(g => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className="field">Category
                <select value={f.category} onChange={e => set('category', e.target.value)}>
                  {meta.categories[f.group].map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="card form">
            <div className="row">
              <h2>Photos</h2><span className="spacer" />
              <button type="button" className="btn ghost sm" onClick={() => setGuide(!guide)}>{guide ? 'Hide photo guide' : 'Photo guide'}</button>
            </div>
            <span className="muted small">The first photo is the cover customers see in the app. Up to 8 photos.</span>
            {guide && <PhotoGuide />}
            <ImagePicker value={f.images} onChange={v => set('images', v)} />
          </div>

          {isCosmetic && (
            <div className="card form">
              <h2>Suitable for</h2>
              <span className="muted small">Customers filter by these in the app.</span>
              <label className="field">Skin type<Checks all={meta.skinTypes} value={f.skinTypes} onChange={v => set('skinTypes', v)} /></label>
              <label className="field">Hair type<Checks all={meta.hairTypes} value={f.hairTypes} onChange={v => set('hairTypes', v)} /></label>
            </div>
          )}

          {isApparel && (
            <div className="card form">
              <h2>Sizes</h2>
              <Checks all={meta.sizes} value={f.sizes} onChange={v => set('sizes', v)} />
            </div>
          )}

          <div className="card form">
            <div className="row">
              <h2>{isCosmetic ? 'Shades' : 'Colours'}</h2>
              <span className="spacer" />
              <select style={{ width: 'auto' }} value={f.optionLabel} onChange={e => set('optionLabel', e.target.value as any)}>
                <option value="">No variants</option>
                <option value="Shade">Shades (lipstick, foundation…)</option>
                <option value="Colour">Colours</option>
              </select>
            </div>
            {f.optionLabel && (
              <>
                {f.optionValues.map((v, i) => (
                  <div key={i} className="card" style={{ padding: 12 }}>
                    <div className="row">
                      <input type="color" value={v.hex} onChange={e => setOpt(i, { hex: e.target.value })} style={{ width: 44, padding: 2, height: 38 }} />
                      <input placeholder={`${f.optionLabel} name`} value={v.name} onChange={e => setOpt(i, { name: e.target.value })} style={{ flex: 1, width: 'auto' }} />
                      <button type="button" className="btn red sm" onClick={() => set('optionValues', f.optionValues.filter((_, j) => j !== i))}>Remove</button>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <span className="muted small">Photos for this {f.optionLabel.toLowerCase()} (optional)</span>
                      <ImagePicker value={v.images} onChange={imgs => setOpt(i, { images: imgs })} max={4} />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn ghost" onClick={() => set('optionValues', [...f.optionValues, { name: '', hex: '#c2556b', images: [] }])}>
                  + Add {f.optionLabel.toLowerCase()}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card form" style={{ position: 'sticky', top: 20 }}>
          <h2>Price &amp; stock</h2>
          <label className="field">MRP (₹)<input type="number" min="1" step="0.01" value={f.mrp} onChange={e => set('mrp', e.target.value)} required /></label>
          <label className="field">Selling price (₹)<input type="number" min="1" step="0.01" value={f.price} onChange={e => set('price', e.target.value)} required /></label>
          {off > 0 && <div className="ok">{off}% off shown to customers</div>}
          <label className="field">Stock<input type="number" min="0" value={f.stock} onChange={e => set('stock', e.target.value)} required /></label>
          {price > 0 && (
            <div className="muted small">
              At 10% commission you receive about <b style={{ color: 'var(--ink)' }}>{inr(Math.round(price * 0.9 * 100) / 100)}</b> per unit. Your exact rate is set by Meyra.
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
