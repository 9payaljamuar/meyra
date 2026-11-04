import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { AuthLayout } from './Login'

export default function SellerRegister() {
  const { setSession } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', businessName: '', gstin: '', pan: '', address: '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [agree, setAgree] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (k === 'gstin' || k === 'pan') v = v.toUpperCase()
    setF(prev => ({
      ...prev,
      [k]: v,
      // PAN is embedded in the GSTIN; prefill it.
      ...(k === 'gstin' && v.length >= 12 && !prev.pan ? { pan: v.slice(2, 12) } : {}),
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const { token } = await api('/auth/register-seller', { body: { ...f, agree } })
      await setSession(token)
      nav('/seller/profile?welcome=1')
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Sell on Meyra" text="Anyone with a valid GST registration can sell. Listing is free; commission is deducted automatically on each sale and the rest is paid to your bank.">
      <h1>Create seller account</h1>
      <p className="muted">Step 1 of 2 — business details. You’ll upload KYC documents next.</p>
      <form className="form" onSubmit={submit} style={{ marginTop: 18 }}>
        {err && <div className="error">{err}</div>}
        <div className="form-grid">
          <label className="field">Your name<input value={f.name} onChange={set('name')} required /></label>
          <label className="field">Mobile<input value={f.phone} onChange={set('phone')} maxLength={10} required /></label>
        </div>
        <label className="field">Email<input type="email" value={f.email} onChange={set('email')} required /></label>
        <label className="field">Password<input type="password" value={f.password} onChange={set('password')} minLength={6} required /></label>
        <label className="field">Business / brand name<input value={f.businessName} onChange={set('businessName')} required /></label>
        <div className="form-grid">
          <label className="field">GSTIN<input value={f.gstin} onChange={set('gstin')} maxLength={15} placeholder="29ABCDE1234F1Z5" required /></label>
          <label className="field">PAN<input value={f.pan} onChange={set('pan')} maxLength={10} required /></label>
        </div>
        <label className="field">Pickup address<input value={f.address} onChange={set('address')} /></label>
        <label className="row small" style={{ alignItems: 'flex-start', gap: 8, fontWeight: 400 }}>
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span>I agree to the <Link to="/seller-agreement" target="_blank">Seller Agreement</Link>, including the commission, GST TCS/TDS deductions and return policy.</span>
        </label>
        <button className="btn" disabled={busy || !agree}>{busy ? 'Creating…' : 'Continue to KYC'}</button>
      </form>
      <p style={{ marginTop: 22 }}>Already registered? <Link to="/login"><b>Log in</b></Link></p>
    </AuthLayout>
  )
}
