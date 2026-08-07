import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import TetherLogo from '../components/TetherLogo'

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt",
  "El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon",
  "Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel",
  "Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos",
  "Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi",
  "Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova",
  "Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands",
  "New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau",
  "Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania",
  "Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia",
  "Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan",
  "Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo",
  "Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine",
  "United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
]

export default function Signup() {
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    country: '',
    tetherWalletId: '',
    referralCode: searchParams.get('ref') || '' 
  })
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const countryRef = useRef(null)
  const navigate = useNavigate()

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setShowCountryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCountries = COUNTRIES.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match.')
    }

    if (!formData.country) {
      return toast.error('Please select a country.')
    }

    if (formData.tetherWalletId.length < 20) {
      return toast.error('Please enter a valid Tether Wallet ID (at least 20 characters).')
    }

    try {
      await axios.post('/api/auth/register', formData)
      toast.success('Account created successfully! Please log in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || 'An error occurred during registration.')
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
              <label htmlFor="country">Country*</label>
              <div className="country-search-wrapper" ref={countryRef}>
                <input
                  type="text"
                  id="country"
                  placeholder="Search and select your country"
                  value={formData.country || countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value)
                    setFormData({ ...formData, country: '' })
                    setShowCountryDropdown(true)
                  }}
                  onFocus={() => setShowCountryDropdown(true)}
                  required
                  autoComplete="off"
                />
                {showCountryDropdown && filteredCountries.length > 0 && (
                  <div className="country-dropdown">
                    {filteredCountries.map(c => (
                      <div 
                        key={c} 
                        className="country-option"
                        onClick={() => {
                          setFormData({ ...formData, country: c })
                          setCountrySearch('')
                          setShowCountryDropdown(false)
                        }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tetherWalletId">USDT Wallet Address*</label>
              <input
                type="text"
                id="tetherWalletId"
                placeholder="e.g. TXyz...abc or 0x123...def"
                value={formData.tetherWalletId}
                onChange={(e) => setFormData({ ...formData, tetherWalletId: e.target.value.trim() })}
                required
                minLength="20"
              />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                TRC20 addresses start with "T", ERC20 addresses start with "0x"
              </p>
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
