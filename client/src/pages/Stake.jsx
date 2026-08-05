import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const UI_STYLES = [
  { color: '#38bdf8', gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)' },
  { color: '#a78bfa', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  { color: '#fbbf24', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)' },
  { color: '#f43f5e', gradient: 'linear-gradient(135deg, #be123c, #f43f5e)' }
]

export default function Stake() {
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get('/api/stakes/plans')
        const plansWithStyles = res.data.map((plan, index) => ({
          ...plan,
          color: UI_STYLES[index % UI_STYLES.length].color,
          gradient: UI_STYLES[index % UI_STYLES.length].gradient
        }))
        setPlans(plansWithStyles)
        if (plansWithStyles.length > 0) {
          setSelectedPlan(plansWithStyles[0])
        }
      } catch (err) {
        toast.error('Failed to load staking plans')
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  const expectedReturn = amount && selectedPlan ? (Number(amount) + (Number(amount) * selectedPlan.returnPercent / 100)).toFixed(2) : '0.00'

  const handlePurchase = async (e) => {
    e.preventDefault()
    
    if (Number(amount) < selectedPlan.min || Number(amount) > selectedPlan.max) {
      return toast.error(`Amount must be between $${selectedPlan.min} and $${selectedPlan.max === 9999999 ? 'Unlimited' : selectedPlan.max}`)
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/stakes/purchase', {
        planName: selectedPlan.name,
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
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>Loading staking plans...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
          {plans.map(plan => (
            <div 
              key={plan.name}
              onClick={() => setSelectedPlan(plan)}
              className="card"
              style={{
                cursor: 'pointer',
                border: selectedPlan?.name === plan.name ? `2px solid ${plan.color}` : '1px solid #e2e8f0',
                transform: selectedPlan?.name === plan.name ? 'translateY(-4px)' : 'none',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
                padding: '24px',
                borderRadius: '16px',
                background: 'white'
              }}
            >
              <div style={{ background: plan.gradient, color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, display: 'inline-block', marginBottom: '16px' }}>
                {plan.name}
              </div>
              
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>
                {plan.returnPercent}% <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 600 }}>Return</span>
              </div>
              
              <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                Duration: <strong>{plan.durationHours} hours</strong>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Min Stake</span>
                  <span style={{ fontWeight: 600, color: '#1a1a2e' }}>${plan.min}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Max Stake</span>
                  <span style={{ fontWeight: 600, color: '#1a1a2e' }}>${plan.max === 9999999 ? 'Unlimited' : plan.max}</span>
                </div>
              </div>

              {selectedPlan?.name === plan.name && (
                <div style={{ position: 'absolute', top: '16px', right: '16px', color: plan.color }}>
                  <CheckCircle2 size={24} fill={plan.color} color="white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Purchase Form */}
      {selectedPlan && !loading && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderTop: `4px solid ${selectedPlan.color}` }}>
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
                <CheckCircle2 size={16} color="#15803d" /> Payout will be available to cash out in exactly {selectedPlan.durationHours} hours.
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn--primary" 
              style={{ width: '100%', padding: '14px', fontSize: '16px', background: selectedPlan.color }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : `Purchase ${selectedPlan.name}`}
            </button>
          </form>
        </div>
      )}

    </div>
  )
}
