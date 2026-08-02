import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import TetherLogo from '../components/TetherLogo'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post('/api/auth/login', formData)
      localStorage.setItem('token', res.data.token)
      toast.success('Logged in successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.msg || 'An error occurred during login.')
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
                type="email"
                id="email"
                placeholder="email@example.com"
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
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <Link to="/forgot-password" className="auth-forgot">
              Forgot your password?
            </Link>

            <button type="submit" className="btn btn--primary" style={{ width: '100%', padding: '14px' }}>
              Log in
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </div>
        </div>
        </div>
      </main>

      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '12px', padding: '20px' }}>
        Copyright © 2013 - {new Date().getFullYear()} Tether Operations, S.A. de C.V. All rights reserved.
      </div>
    </div>
  )
}
