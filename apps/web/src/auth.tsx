import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, token } from './api'

export type Me = {
  id: number
  name: string
  email: string
  role: 'buyer' | 'seller' | 'admin'
  seller: { business_name: string; status: 'pending' | 'approved' | 'rejected'; reject_reason: string | null } | null
}

type Ctx = {
  me: Me | null
  loading: boolean
  login: (email: string, password: string) => Promise<Me>
  setSession: (t: string) => Promise<Me>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthCtx = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!token.get()) {
      setMe(null)
      return
    }
    try {
      setMe(await api<Me>('/auth/me'))
    } catch {
      token.clear()
      setMe(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const setSession = async (t: string) => {
    token.set(t)
    const m = await api<Me>('/auth/me')
    setMe(m)
    return m
  }

  const login = async (email: string, password: string) => {
    const { token: t } = await api<{ token: string }>('/auth/login', { body: { email, password } })
    return setSession(t)
  }

  const logout = () => {
    token.clear()
    setMe(null)
  }

  return <AuthCtx.Provider value={{ me, loading, login, setSession, logout, refresh }}>{children}</AuthCtx.Provider>
}
