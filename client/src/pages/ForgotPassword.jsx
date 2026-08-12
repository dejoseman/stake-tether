import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, MailCheck } from 'lucide-react'
import TetherLogo from '../components/TetherLogo'
import api, { errorMessage } from '../api/client'

/**
 * The login page has always linked to /forgot-password, but the route did not
 * exist and there was no reset endpoint — users who forgot their password were
 * permanently locked out of their funds.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      // The API deliberately returns the same response whether or not the
      // address is registered, so we show the same confirmation either way.
      setSent(true)
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
            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <MailCheck size={48} strokeWidth={1.5} style={{ color: '#009393', marginBottom: '16px' }} />
                <h1 className="auth-card__title">Check your email</h1>
                <p style={{ color: '#4a4a68', lineHeight: 1.7, marginBottom: '24px' }}>
                  If an account exists for <strong>{email}</strong>, we&apos;ve sent a reset
                  link. It expires in one hour and can only be used once.
                </p>
                <Link to="/login" className="btn btn--primary" style={{ width: '100%', padding: '14px' }}>
                  Return to login
                </Link>
              </div>
            ) : (
              <>
                <h1 className="auth-card__title">Reset your password</h1>
                <p style={{ color: '#4a4a68', marginBottom: '24px', lineHeight: 1.6 }}>
                  Enter the email address on your account and we&apos;ll send you a link to
                  choose a new password.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="email">Email address*</label>
                    <input
                      type="email"
                      id="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn--primary"
                    style={{ width: '100%', padding: '14px' }}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '12px', padding: '20px' }}>
        Copyright © 2024 - {new Date().getFullYear()} GeneratingPro. All rights reserved.
      </div>
    </div>
  )
}
