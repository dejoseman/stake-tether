import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const PLANS = [
  { name: 'Basic Plan 1', min: 100, max: 499, duration: '24 hours', durationHours: 24, returnPercent: 10, color: '#38bdf8', gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)', token: 'Basic' },
  { name: 'Silver Plan 2', min: 500, max: 4999, duration: '48 hours', durationHours: 48, returnPercent: 20, color: '#a78bfa', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)', token: 'Silver' },
  { name: 'Gold Plan 3', min: 5000, max: 9999, duration: '72 hours', durationHours: 72, returnPercent: 35, color: '#fbbf24', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)', token: 'Gold' },
  { name: 'Premium Plan 4', min: 10000, max: 9999999, duration: '120 hours', durationHours: 120, returnPercent: 50, color: '#f43f5e', gradient: 'linear-gradient(135deg, #be123c, #f43f5e)', token: 'Premium' }
]

export default function Stake() {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0])
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const expectedReturn = amount ? (Number(amount) + (Number(amount) * selectedPlan.returnPercent / 100)).toFixed(2) : '0.00'

  const handlePurchase = async (e) => {
    e.preventDefault()
    
    if (Number(amount) < selectedPlan.min || Number(amount) > selectedPlan.max) {
      return toast.error(`Amount must be between $${selectedPlan.min} and $${selectedPlan.max === 9999999 ? 'Unlimited' : selectedPlan.max}`)
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/stakes/purchase', {
        planName: selectedPlan.token,
        amount: Number(amount)
      }, { headers: { Authorization: `Bearer ${token}` } })
      
      toast.success(`Successfully staked $${amount} on the ${selectedPlan.name}!`)
      setAmount('')
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Failed to purchase stake'
      
      if (errorMsg === 'Insufficient balance' || errorMsg.toLowerCase().includes('insufficient balance')) {
        toast.error('Insufficient balance. Please deposit funds first.')
        navigate(`/deposit?amount=${amount}`)
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <ShieldAlert size={28} color="#009393" />
        <h1 style={{ fontSize: '28px', color: '#1a1a2e' }}>Purchase Stake</h1>
      </div>
      <p style={{ color: '#64748b', marginBottom: '32px' }}>Invest your USDt balance to earn guaranteed daily returns.</p>

      {/* Plan Selection Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {PLANS.map(plan => {
          const isSelected = selectedPlan.token === plan.token
          return (
            <div 
              key={plan.token}
              onClick={() => setSelectedPlan(plan)}
              style={{
                background: isSelected ? plan.gradient : 'white',
                color: isSelected ? 'white' : '#1a1a2e',
                border: isSelected ? 'none' : '2px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: isSelected ? 'translateY(-4px)' : 'none',
                boxShadow: isSelected ? '0 8px 16px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{plan.name}</h3>
              <div style={{ fontSize: '24px', fontWeight: 800, color: isSelected ? 'white' : plan.color }}>
                {plan.returnPercent}% <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'rgba(255,255,255,0.8)' : '#64748b' }}>Return</span>
              </div>
              <div style={{ fontSize: '13px', marginTop: '12px', opacity: 0.9 }}>
                <div>Min: ${plan.min}</div>
                <div>Max: ${plan.max === 9999999 ? 'Unlimited' : plan.max}</div>
                <div>Duration: {plan.duration}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Purchase Form */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Stake Details</h2>
        
        <form onSubmit={handlePurchase}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Amount to Stake (USDt)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8888a0', fontWeight: 600 }}>$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  min={selectedPlan.min}
                  max={selectedPlan.max}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{ paddingLeft: '32px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Expected Payout (USDt)</label>
              <div style={{ width: '100%', padding: '12px 16px', fontSize: '18px', borderRadius: '8px', background: '#f1f5f9', color: '#009393', fontWeight: 700, display: 'flex', alignItems: 'center', height: '46px' }}>
                ${expectedReturn}
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', color: '#475569' }}>
              <CheckCircle2 size={16} color="#15803d" /> Your balance will be deducted immediately.
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', color: '#475569' }}>
              <CheckCircle2 size={16} color="#15803d" /> Payout will automatically credit your balance in exactly {selectedPlan.duration}.
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn--primary" 
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : `Purchase ${selectedPlan.name}`}
          </button>
        </form>
      </div>

    </div>
  )
}
