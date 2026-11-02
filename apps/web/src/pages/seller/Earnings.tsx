import { api, date, inr } from '../../api'
import { Stat, useLoad } from '../../ui'

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
        <Stat label="Commission deducted" value={inr(data.commission)} />
        <Stat label="Earned (delivered)" value={inr(data.earned)} sub={`${inr(data.pending)} more once in-transit orders deliver`} />
        <Stat label="Refunded to customers" value={inr(data.refunded)} sub="Returns — not counted in your earnings" />
        <Stat label="Paid out" value={inr(data.paid)} />
        <Stat label="Balance due" value={inr(data.balance)} />
      </div>
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
