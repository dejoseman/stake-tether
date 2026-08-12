import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import TetherLogo from '../components/TetherLogo'
import api, { errorMessage } from '../api/client'

const rules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains a letter', test: (p) => /[A-Za-z]/.test(p) },
  { label: 'Contains a number', test: (p) => /[0-9]/.test(p) },
]

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const allValid = rules.every((r) => r.test(password))
  const matches = password.length > 0 && password === confirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allValid) return toast.error('Please meet all the password requirements.')
    if (!matches) return toast.error('Passwords do not match.')

    setLoading(true)
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password })
      toast.success(data.msg || 'Password reset successfully.')
      navigate('/login')
    } catch (err) {
      toast.error(errorMessage(err))
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
          <Link to="/login" className="back-link">
            <ArrowLeft size={16} strokeWidth={2.5} />
            Back to login
          </Link>

          <div className="auth-card">
            <h1 className="auth-card__title">Choose a new password</h1>
            <p style={{ color: '#4a4a68', marginBottom: '24px', lineHeight: 1.6 }}>
              For your security, setting a new password signs you out on all devices.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="password">New password*</label>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: '13px' }}>
                {rules.map((r) => {
                  const ok = r.test(password)
                  return (
                    <li key={r.label} style={{ color: ok ? '#15803d' : '#94a3b8', marginBottom: '4px' }}>
                      {ok ? '✓' : '○'} {r.label}
                    </li>
                  )
                })}
              </ul>

              <div className="form-group">
                <label htmlFor="confirm">Confirm new password*</label>
                <input
                  type="password"
                  id="confirm"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {confirm.length > 0 && !matches && (
                  <span style={{ color: '#b91c1c', fontSize: '13px' }}>Passwords do not match</span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary"
                style={{ width: '100%', padding: '14px' }}
                disabled={loading || !allValid || !matches}
              >
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '12px', padding: '20px' }}>
        Copyright © 2024 - {new Date().getFullYear()} GeneratingPro. All rights reserved.
      </div>
    </div>
  )
}
