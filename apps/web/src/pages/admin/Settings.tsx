import { useEffect, useState } from 'react'
import { api, inr } from '../../api'
import { ChangePassword } from '../../ui'

export default function AdminSettings() {
  const [def, setDef] = useState('')
  const [cats, setCats] = useState<Record<string, string>>({})
  const [all, setAll] = useState<string[]>([])
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({})

  useEffect(() => {
    api('/admin/settings').then(s => {
      setDef(String(s.defaultCommissionPct))
      setAll(s.categories)
      setCats(Object.fromEntries(Object.entries(s.categoryCommission).map(([k, v]) => [k, String(v)])))
    })
  }, [])

  const save = async () => {
    setMsg({})
    try {
      const categoryCommission = Object.fromEntries(
        Object.entries(cats).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]),
      )
      await api('/admin/settings', { method: 'PUT', body: { defaultCommissionPct: Number(def), categoryCommission } })
      setMsg({ ok: 'Saved. New rates apply to orders placed from now on.' })
    } catch (e: any) {
      setMsg({ err: e.message })
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Commission</h1>
          <p>Deducted automatically from every sale. Priority: seller override → category rate → default.</p>
        </div>
        <button className="btn" onClick={save}>Save rates</button>
      </div>
      {msg.ok && <div className="ok" style={{ marginBottom: 16 }}>{msg.ok}</div>}
      {msg.err && <div className="error" style={{ marginBottom: 16 }}>{msg.err}</div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
        <div className="card form">
          <h2>Default rate</h2>
          <label className="field">Commission (%)<input type="number" min="0" max="100" step="0.5" value={def} onChange={e => setDef(e.target.value)} style={{ width: 140 }} /></label>
          <p className="muted small">Example: on a {inr(1000)} sale, Meyra keeps {inr(1000 * Number(def || 0) / 100)} and the seller receives {inr(1000 - 1000 * Number(def || 0) / 100)}.</p>
        </div>
        <div className="card">
          <h2>Category rates</h2>
          <p className="muted small">Leave empty to use the default.</p>
          <table>
            <tbody>
              {all.map(c => (
                <tr key={c}>
                  <td>{c}</td>
                  <td className="num" style={{ width: 140 }}>
                    <input type="number" min="0" max="100" step="0.5" placeholder={def} value={cats[c] ?? ''} onChange={e => setCats({ ...cats, [c]: e.target.value })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <h2 className="section-title">Your admin account</h2>
      <div style={{ maxWidth: 420 }}><ChangePassword /></div>
    </>
  )
}
