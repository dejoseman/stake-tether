import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { getToken } from '../api/client'

const Centered = ({ children }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    padding: '24px',
    textAlign: 'center',
  }}>
    {children}
  </div>
)

/**
 * Route guard.
 *
 * The dashboard and admin routes were previously unguarded — /admin rendered
 * its full UI for anyone who typed the URL. The data behind it was safe
 * (the API returns 401/403), but the entire admin surface was on display, and
 * an expired token left users staring at a broken page with no redirect.
 *
 * `adminOnly` additionally requires role === 'admin'.
 */
export default function RequireAuth({ children, adminOnly = false }) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth()
  const location = useLocation()

  // No token at all — don't even wait for the profile request.
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (isLoading) {
    return (
      <Centered>
        <div style={{ color: 'var(--color-primary, #009393)', fontWeight: 600 }}>
          Loading...
        </div>
      </Centered>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (adminOnly && !isAdmin) {
    return (
      <Centered>
        <div>
          <h2 style={{ color: '#1a1a2e', marginBottom: '8px' }}>Access denied</h2>
          <p style={{ color: '#4a4a68' }}>
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </Centered>
    )
  }

  return children
}
