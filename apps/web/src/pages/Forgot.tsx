import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { AuthLayout } from './Login'

export default function Forgot() {
  const { setSession } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [emailReady, setEmailReady] = useState(true)
  useEffect(() => { api('/meta').then(m => setEmailReady(m.features?.emailReset !== false)).catch(() => {}) }, [])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const r = await api('/auth/password/forgot', { body: { email } })
      setDevCode(r.devCode ?? null)
      setSent(true)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const reset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const { token } = await api('/auth/password/reset', { body: { email, code, password } })
      const me = await setSession(token)
      nav(me.role === 'admin' ? '/admin' : me.role === 'seller' ? '/seller' : '/login?buyer=1')
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Reset your password" text="We’ll email you a 6-digit code to set a new password.">
      <h1>Forgot password</h1>
      {!emailReady ? (
        <div className="notice" style={{ marginTop: 18 }}>
          Password reset by email is being set up. Please email <a href="mailto:support@meyraglory.com">support@meyraglory.com</a> from your registered address and we’ll reset it for you.
        </div>
      ) : !sent ? (
        <form className="form" onSubmit={send} style={{ marginTop: 18 }}>
          {err && <div className="error">{err}</div>}
          <label className="field">Account email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></label>
          <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
        </form>
      ) : (
        <form className="form" onSubmit={reset} style={{ marginTop: 18 }}>
          <div className="ok">If an account exists for {email}, a code is on its way. It expires in 15 minutes.</div>
          {devCode && <div className="notice">Test mode (no email provider yet): your code is <b>{devCode}</b></div>}
          {err && <div className="error">{err}</div>}
          <label className="field">6-digit code<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" required autoFocus /></label>
          <label className="field">New password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required /></label>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Set new password & log in'}</button>
          <button type="button" className="btn ghost" onClick={() => { setSent(false); setCode('') }}>Use a different email</button>
        </form>
      )}
      <p style={{ marginTop: 22 }}><Link to="/login">← Back to log in</Link></p>
    </AuthLayout>
  )
}
