import { useState } from 'react'
import { api, date, inr } from '../../api'
import { useNavigate } from 'react-router-dom'
import { Modal, useLoad } from '../../ui'

export default function AdminPayouts() {
  const nav = useNavigate()
  const { data, reload } = useLoad(() => api('/admin/payouts'))
  const [pay, setPay] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [ref, setRef] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const open = (s: any) => {
    setPay(s)
    setAmount(String(Math.round(s.balance * 100) / 100))
    setRef('')
    setErr(null)
  }

  const submit = async () => {
    setErr(null)
    try {
      await api('/admin/payouts', { body: { sellerId: pay.seller_id, amount: Number(amount), reference: ref || undefined } })
      setPay(null)
      reload()
    } catch (e: any) {
      setErr(e.message)
    }
  }

  if (!data) return null
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Seller payouts</h1>
          <p>Balance = seller share of delivered items − payouts already made. Record a payout after the bank transfer.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Seller</th><th>Bank</th><th className="num">Earned</th><th className="num">Paid</th><th className="num">Balance</th><th></th></tr></thead>
          <tbody>
            {data.balances.map((s: any) => (
              <tr key={s.seller_id} className="click" onClick={() => nav(`/admin/sellers/${s.seller_id}`)}>
                <td><b>{s.business_name}</b></td>
                <td className="small">{s.bank_account ? `${s.bank_account} · ${s.bank_ifsc}` : <span style={{ color: 'var(--red)' }}>No bank details</span>}</td>
                <td className="num">{inr(s.earned)}</td>
                <td className="num">{inr(s.paid)}</td>
                <td className="num"><b>{inr(s.balance)}</b></td>
                <td className="num"><button className="btn sm" disabled={s.balance <= 0} onClick={e => { e.stopPropagation(); open(s) }}>Record payout</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ margin: '28px 0 12px' }}>History</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Seller</th><th>Reference</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {data.history.map((p: any) => (
              <tr key={p.id}><td>{date(p.created_at)}</td><td>{p.business_name}</td><td>{p.reference ?? '—'}</td><td className="num"><b>{inr(p.amount)}</b></td></tr>
            ))}
          </tbody>
        </table>
        {!data.history.length && <div className="empty">No payouts recorded yet.</div>}
      </div>

      {pay && (
        <Modal onClose={() => setPay(null)}>
          <h2>Record payout — {pay.business_name}</h2>
          <p className="muted">Balance due {inr(pay.balance)} · {pay.bank_account} · {pay.bank_ifsc}</p>
          {err && <div className="error">{err}</div>}
          <div className="form" style={{ marginTop: 12 }}>
            <label className="field">Amount (₹)<input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
            <label className="field">Bank reference / UTR<input value={ref} onChange={e => setRef(e.target.value)} /></label>
            <div className="row"><span className="spacer" /><button className="btn ghost" onClick={() => setPay(null)}>Cancel</button><button className="btn" onClick={submit}>Save payout</button></div>
          </div>
        </Modal>
      )}
    </>
  )
}
