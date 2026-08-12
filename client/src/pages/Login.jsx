import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import TetherLogo from '../components/TetherLogo'
import api, { setToken, errorMessage } from '../api/client'
import { useAuth } from '../components/AuthContext'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { refresh } = useAuth()

  // The 401 interceptor redirects here with ?expired=1 when a session dies
  // mid-use. Without this the user was bounced to login with no explanation.
  useEffect(() => {
    if (searchParams.get('expired')) {
      toast('Your session expired. Please log in again.', { icon: '🔒' })
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/login', formData)
      setToken(res.data.token)
      // Populate the shared auth context before navigating, so guards don't
      // flash a redirect while the profile request is still in flight.
      await refresh()
      toast.success('Logged in successfully!')

      // Return the user to wherever they were headed before being bounced.
      const next = searchParams.get('next')
      const from = location.state?.from
      navigate(next ? decodeURIComponent(next) : (from || '/dashboard'), { replace: true })
    } catch (err) {
      toast.error(errorMessage(err, 'An error occurred during login.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-page__header container">
        <Link to="/" className="auth-page__logo">
          <TetherLogo color="#ffffff" size={36} />
          tether
        </Link>
      </header>

      <main className="auth-page__body">
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <Link to="/" className="back-link">
            <ArrowLeft size={16} strokeWidth={2.5} />
            Back to Homepage
          </Link>
          <div className="auth-card">
            <h1 className="auth-card__title">Log in to your account</h1>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email or Username*</label>
                <input
                  type="text"
                  id="email"
                  autoComplete="username"
                  placeholder="Username or Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password*</label>
                <input
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <Link to="/forgot-password" className="auth-forgot">
                Forgot your password?
              </Link>

              <button
                type="submit"
                className="btn btn--primary"
                style={{ width: '100%', padding: '14px' }}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>

            <div className="auth-footer">
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </div>
          </div>
        </div>
      </main>

      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '12px', padding: '20px' }}>
        Copyright © 2024 - {new Date().getFullYear()} GeneratingPro. All rights reserved.
      </div>
    </div>
  )
}
