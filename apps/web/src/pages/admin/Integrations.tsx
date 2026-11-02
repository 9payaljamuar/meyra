import { useState } from 'react'
import { api } from '../../api'
import { Tabs, useLoad } from '../../ui'

const WHAT: Record<string, string> = {
  payments: 'Online payments in the app (UPI, cards, netbanking, wallets) through Razorpay payment links, automatic refunds, and a webhook that confirms payments.',
  sms: 'Real OTP login by SMS plus order, shipping and refund SMS. Uses MSG91 (DLT-registered templates required in India).',
  email: 'Order, KYC and payout emails through any SMTP provider (Gmail Workspace, Amazon SES, Zoho, Brevo…).',
  gst: 'Looks up the GSTIN with a GST data provider so you can see the legal name and status while reviewing KYC. A checksum check always runs.',
  shipping: 'Lets sellers book pickups with Shiprocket, which assigns the courier and AWB automatically. Sellers can always enter their own courier and AWB.',
  storage: 'Stores product, review and KYC photos in S3 or Cloudflare R2 instead of the server’s disk.',
}

type Tab = 'status' | 'outbox'

export default function AdminIntegrations() {
  const [tab, setTab] = useState<Tab>('status')
  const { data } = useLoad<any[]>(() => api('/admin/integrations'))
  const { data: outbox } = useLoad<any[] | null>(() => (tab === 'outbox' ? api('/admin/notifications') : Promise.resolve(null)), [tab])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Integrations</h1>
          <p>Everything works in test mode without keys. Add the keys to the server’s <code className="env">.env</code> file and restart to go live.</p>
        </div>
      </div>
      <Tabs value={tab} onChange={setTab} options={[{ value: 'status', label: 'Status' }, { value: 'outbox', label: 'Message outbox' }]} />
      {tab === 'status' ? (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {data?.map(i => (
            <div className="card" key={i.key}>
              <div className="row"><h2>{i.name}</h2><span className="spacer" /><span className={`badge ${i.live ? 'b-live' : 'b-test'}`}>{i.live ? 'Live' : 'Test mode'}</span></div>
              <p className="small" style={{ margin: '10px 0' }}>{WHAT[i.key]}</p>
              <div className="muted small row" style={{ gap: 4 }}>Settings: {i.env.split(', ').map((e: string) => <code key={e} className="env">{e}</code>)}</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="muted">Every SMS and email the platform sent. In test mode messages are only recorded here (“logged”), so you can check what customers and sellers would receive.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Channel</th><th>To</th><th>Message</th><th>Status</th></tr></thead>
              <tbody>
                {outbox?.map(n => (
                  <tr key={n.id}>
                    <td className="small">{new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td><span className="badge b-shipped">{n.channel.toUpperCase()}</span></td>
                    <td className="small">{n.user_name ?? '—'}<br />{n.to_addr}</td>
                    <td style={{ maxWidth: 420 }}><b>{n.title}</b><div className="small">{n.body}</div></td>
                    <td><span className={`badge ${n.status === 'sent' ? 'b-live' : n.status === 'failed' ? 'b-rejected' : 'b-test'}`}>{n.status}</span>{n.error && <div className="small" style={{ color: 'var(--red)' }}>{n.error}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {outbox && !outbox.length && <div className="empty">No messages yet.</div>}
          </div>
        </>
      )}
    </>
  )
}
