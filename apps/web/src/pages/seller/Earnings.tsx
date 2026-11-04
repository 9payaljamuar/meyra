import { api, date, inr } from '../../api'
import { useState } from 'react'
import { Stat, useLoad } from '../../ui'
import { downloadCsv } from '../../csv'

export default function SellerEarnings() {
  const { data } = useLoad(() => api('/seller/earnings'))
  if (!data) return null
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Earnings &amp; payouts</h1>
          <p>Meyra deducts its commission automatically on every sale. Your share of delivered orders is paid to your bank account.</p>
        </div>
      </div>
      <div className="grid stats">
        <Stat label="Gross sales" value={inr(data.gross)} sub="All non-cancelled items" />
        <Stat label="Commission + GST" value={inr(data.commission + data.commission_gst)} sub={`${inr(data.commission)} + ${inr(data.commission_gst)} GST`} />
        <Stat label="TCS + TDS deducted" value={inr(data.tcs + data.tds)} sub={`TCS ${inr(data.tcs)} · TDS ${inr(data.tds)} — claim in your returns`} />
        <Stat label="Earned (delivered)" value={inr(data.earned)} sub={`${inr(data.pending)} more once in-transit orders deliver`} />
        <Stat label="Refunded to customers" value={inr(data.refunded)} sub="Returns — not counted in your earnings" />
        <Stat label="Paid out" value={inr(data.paid)} />
        <Stat label="Balance due" value={inr(data.balance)} />
      </div>
      <Statement />
      <h2 style={{ margin: '28px 0 12px' }}>Payout history</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Reference</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {data.payouts.map((p: any) => (
              <tr key={p.id}><td>{date(p.created_at)}</td><td>{p.reference ?? '—'}</td><td className="num"><b>{inr(p.amount)}</b></td></tr>
            ))}
          </tbody>
        </table>
        {!data.payouts.length && <div className="empty">No payouts yet.</div>}
      </div>
    </>
  )
}

function Statement() {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 8) + '01'
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true)
    try {
      const { rows } = await api(`/seller/statement?from=${from}&to=${to}`)
      downloadCsv(`meyra-statement-${from}-to-${to}.csv`, rows.map((r: any) => ({
        Date: date(r.created_at), Order: r.order_id, Invoice: r.invoice_no ?? '', Product: r.name,
        Variant: [r.option, r.size].filter(Boolean).join(' / '), Qty: r.qty, HSN: r.hsn ?? '', 'GST %': r.gst_rate,
        'Sale value': r.line_total, 'Taxable value': r.taxable_value, CGST: r.cgst, SGST: r.sgst, IGST: r.igst,
        Commission: r.commission_amt, 'GST on commission': r.commission_gst, TCS: r.tcs_amt, TDS: r.tds_amt,
        'Net to you': r.seller_amt, Status: r.status, Payment: r.payment_method,
      })))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card form" style={{ marginTop: 20 }}>
      <h2>Download statement</h2>
      <p className="small muted" style={{ margin: 0 }}>Every sale with GST, commission, TCS and TDS — for your accountant and GST returns.</p>
      <div className="row">
        <label className="field">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="field">To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <button className="btn ghost" style={{ alignSelf: 'flex-end' }} disabled={busy} onClick={download}>{busy ? 'Preparing…' : 'Download CSV'}</button>
      </div>
    </div>
  )
}
