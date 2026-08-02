import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import TetherLogo from '../components/TetherLogo'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    referralCode: searchParams.get('ref') || '' 
  })
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match.')
    }

    try {
      const res = await axios.post('/api/auth/register', formData)
      localStorage.setItem('token', res.data.token)
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.msg || 'An error occurred during registration.')
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
          <h1 className="auth-card__title">Create an account</h1>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username*</label>
              <input
                type="text"
                id="username"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email address*</label>
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
                minLength="6"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="confirmPassword">Confirm Password*</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="referralCode">Referral Code (Optional)</label>
              <input
                type="text"
                id="referralCode"
                placeholder="Got a referral code?"
                value={formData.referralCode}
                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
              />
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: '100%', padding: '14px' }}>
              Create Account
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Log in</Link>
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
