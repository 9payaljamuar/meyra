import { useEffect, useState } from 'react'
import { api, inr } from '../../api'
import { downloadCsv } from '../../csv'
import { useLoad } from '../../ui'

export default function AdminTax() {
  const [f, setF] = useState({ commissionGstPct: '', tcsPct: '', tdsPct: '', name: '', gstin: '', address: '' })
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({})
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const { data: report } = useLoad<{ rows: any[] }>(() => api(`/admin/tax-report?month=${month}`), [month])

  useEffect(() => {
    api('/admin/tax-settings').then(s => setF({
      commissionGstPct: String(s.commissionGstPct), tcsPct: String(s.tcsPct), tdsPct: String(s.tdsPct),
      name: s.platform.name ?? '', gstin: s.platform.gstin ?? '', address: s.platform.address ?? '',
    }))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg({})
    try {
      await api('/admin/tax-settings', {
        method: 'PUT',
        body: {
          commissionGstPct: Number(f.commissionGstPct), tcsPct: Number(f.tcsPct), tdsPct: Number(f.tdsPct),
          platform: { name: f.name, gstin: f.gstin, address: f.address },
        },
      })
      setMsg({ ok: 'Saved. New rates apply to orders placed from now on.' })
    } catch (e: any) {
      setMsg({ err: e.message })
    }
  }

  const rows = report?.rows ?? []
  const total = rows.reduce((a, r) => ({ gross: a.gross + r.gross, tcs: a.tcs + r.tcs, tds: a.tds + r.tds, comm: a.comm + r.commission + r.commission_gst }),
    { gross: 0, tcs: 0, tds: 0, comm: 0 })

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tax &amp; compliance</h1>
          <p>Meyra’s GST details and the deductions made from every seller payout. Have your CA confirm the rates.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <form className="card form" onSubmit={save}>
          <h2>Marketplace details</h2>
          {msg.ok && <div className="ok">{msg.ok}</div>}
          {msg.err && <div className="error">{msg.err}</div>}
          {!f.gstin && <div className="notice">Add Meyra’s own GSTIN before going live — it is printed on every seller invoice and needed to deposit TCS.</div>}
          <label className="field">Business name<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></label>
          <label className="field">Meyra GSTIN<input value={f.gstin} onChange={e => setF({ ...f, gstin: e.target.value.toUpperCase() })} maxLength={15} /></label>
          <label className="field">Registered address<input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></label>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <label className="field">GST on commission %<input type="number" step="0.01" value={f.commissionGstPct} onChange={e => setF({ ...f, commissionGstPct: e.target.value })} /></label>
            <label className="field">TCS %<input type="number" step="0.01" value={f.tcsPct} onChange={e => setF({ ...f, tcsPct: e.target.value })} /></label>
            <label className="field">TDS (194-O) %<input type="number" step="0.01" value={f.tdsPct} onChange={e => setF({ ...f, tdsPct: e.target.value })} /></label>
          </div>
          <button className="btn">Save</button>
        </form>

        <div className="card">
          <div className="row">
            <h2>Monthly TCS / TDS report</h2>
            <span className="spacer" />
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto' }} />
          </div>
          <p className="small muted">Use this for GSTR-8 (TCS) and the 194-O TDS return. Excludes cancelled and refunded items.</p>
          <div className="mini-stats" style={{ margin: '12px 0' }}>
            <div><b>{inr(total.gross)}</b><span>Seller sales</span></div>
            <div><b>{inr(total.tcs)}</b><span>TCS to deposit</span></div>
            <div><b>{inr(total.tds)}</b><span>TDS to deposit</span></div>
            <div><b>{inr(total.comm)}</b><span>Commission + GST</span></div>
          </div>
          <table>
            <thead><tr><th>Seller</th><th>GSTIN</th><th className="num">Sales</th><th className="num">TCS</th><th className="num">TDS</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.seller_id}><td>{r.business_name}</td><td className="small">{r.gstin}</td><td className="num">{inr(r.gross)}</td><td className="num">{inr(r.tcs)}</td><td className="num">{inr(r.tds)}</td></tr>
              ))}
            </tbody>
          </table>
          {report && !rows.length && <div className="empty">No sales this month.</div>}
          <button className="btn ghost" style={{ marginTop: 12 }} disabled={!rows.length} onClick={() => downloadCsv(`meyra-tcs-tds-${month}.csv`, rows.map(r => ({
            Seller: r.business_name, GSTIN: r.gstin, PAN: r.pan, Lines: r.lines, 'Gross sales': r.gross, 'Taxable value': r.taxable,
            'GST on sales': r.gst, TCS: r.tcs, TDS: r.tds, Commission: r.commission, 'GST on commission': r.commission_gst,
          })))}>Download CSV</button>
        </div>
      </div>
    </>
  )
}
