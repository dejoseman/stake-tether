import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import api, { getToken, clearToken } from '../api/client'

const AuthContext = createContext(null)

/**
 * Single source of truth for who is logged in.
 *
 * Previously each page fetched /auth/profile independently, and the Sidebar
 * derived admin status on its own — so the dashboard fired the same request
 * three or four times per navigation and had no shared notion of session
 * state at all.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'loading' matters: without it, guards render a redirect on first paint
  // before the profile request has had a chance to resolve.
  const [status, setStatus] = useState('loading')

  const loadProfile = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setStatus('unauthenticated')
      return null
    }

    try {
      const { data } = await api.get('/auth/profile')
      setUser(data)
      setStatus('authenticated')
      return data
    } catch {
      // The 401 interceptor already cleared the token and redirected.
      setUser(null)
      setStatus('unauthenticated')
      return null
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setStatus('unauthenticated')
    window.location.href = '/login'
  }, [])

  const value = useMemo(() => ({
    user,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isAdmin: user?.role === 'admin',
    refresh: loadProfile,
    setUser,
    logout,
  }), [user, status, loadProfile, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider')
  return ctx
}

export default AuthContext
