import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'

export function AuthLayout({ children, title, text }: { children: React.ReactNode; title: string; text: string }) {
  return (
    <div className="auth">
      <div className="brand">
        <img src="/logo.jpg" alt="Meyra" />
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <div className="panel">
        <div>{children}</div>
      </div>
    </div>
  )
}

export default function Login() {
  const { login, logout } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(
    params.get('buyer') ? 'This portal is for sellers and admins. Customers shop in the Meyra app.'
      : params.get('expired') ? 'Your session expired. Please log in again.' : null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const me = await login(email, password)
      if (me.role === 'buyer') {
        logout()
        setErr('This portal is for sellers and admins. Customers shop in the Meyra app.')
      } else nav(me.role === 'admin' ? '/admin' : '/seller')
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Meyra Partner Hub" text="Sell cosmetics, apparel and accessories to customers across India. Free listing — you pay a small commission only when you sell.">
      <h1>Log in</h1>
      <p className="muted">Sellers and admins</p>
      <form className="form" onSubmit={submit} style={{ marginTop: 18 }}>
        {err && <div className="error">{err}</div>}
        <label className="field">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></label>
        <label className="field">
          <span className="row">Password<span className="spacer" /><Link to="/forgot" className="small">Forgot password?</Link></span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        <button className="btn" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p style={{ marginTop: 22 }}>
        New seller? <Link to="/seller/register"><b>Register with your GST number</b></Link>
      </p>
      <p className="small muted" style={{ marginTop: 28 }}>
        <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link> · <Link to="/refund-policy">Refunds</Link> · <Link to="/shipping-policy">Shipping</Link> · <Link to="/contact">Contact</Link>
      </p>
    </AuthLayout>
  )
}
