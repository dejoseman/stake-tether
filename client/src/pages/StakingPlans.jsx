import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Shield, Zap, Bot, Users, BarChart3, RefreshCw, CheckCircle2 } from 'lucide-react'

const UI_STYLES = [
  { color: '#009393', gradient: 'linear-gradient(135deg, #009393 0%, #00b4b4 100%)' },
  { color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' },
  { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
  { color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' }
]

const features = [
  { icon: <Shield size={18} />, label: '100% Capital Protection' },
  { icon: <Zap size={18} />, label: 'Automated Payout' },
  { icon: <Bot size={18} />, label: 'A.I Integrated Trading' },
  { icon: <Users size={18} />, label: '10% Referral Bonus' },
  { icon: <BarChart3 size={18} />, label: 'Daily Turnover' },
  { icon: <RefreshCw size={18} />, label: 'Renewable' },
]

export default function StakingPlans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get('/api/stakes/plans')
        const plansWithStyles = res.data.map((plan, index) => ({
          ...plan,
          range: `$${plan.min} - ${plan.max === 9999999 ? 'Unlimited' : '$' + plan.max.toLocaleString()}`,
          duration: `${plan.durationHours} Hours`,
          color: UI_STYLES[index % UI_STYLES.length].color,
          gradient: UI_STYLES[index % UI_STYLES.length].gradient
        }))
        setPlans(plansWithStyles)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])
  return (
    <>
      {/* Hero Section */}
      <section style={{
        backgroundImage: 'url(/images/staking-hero.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '120px 24px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 22, 40, 0.7)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}>
          <p style={{ color: '#009393', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '16px' }}>
            Staking Plans
          </p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: 'white', lineHeight: 1.15, marginBottom: '20px' }}>
            Invest. Stake. <span style={{ color: '#009393' }}>Earn.</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: '550px', margin: '0 auto' }}>
            Choose a staking plan that suits your investment goals. Earn guaranteed returns with our AI-powered trading system.
          </p>
        </div>
      </section>

      {/* CRYPTO badge */}
      <section style={{ background: '#f8fafc', padding: '48px 24px 0', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          background: '#009393',
          color: 'white',
          padding: '12px 48px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '16px',
          letterSpacing: '1px',
        }}>
          CRYPTO
        </div>
      </section>

      {/* Plans Grid */}
      <section style={{ background: '#f8fafc', padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '28px' }}>
          {plans.map((plan) => (
            <div key={plan.name} style={{
              background: 'white',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'default',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; }}
            >
              {/* Plan Header */}
              <div style={{ background: plan.gradient, padding: '28px 24px', textAlign: 'center' }}>
                <h3 style={{ color: 'white', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{plan.name}</h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', fontWeight: 600 }}>{plan.range}</p>
              </div>

              {/* Plan Body */}
              <div style={{ padding: '28px 24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '42px', fontWeight: 800, color: plan.color }}>{plan.returnPercent}</div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>Total Return</div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 16px', textAlign: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Duration: </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a2e' }}>{plan.duration}</span>
                </div>

                {features.map((feat) => (
                  <div key={feat.label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 0',
                    borderBottom: '1px solid #f1f5f9',
                    color: '#475569',
                    fontSize: '14px',
                  }}>
                    <CheckCircle2 size={16} color={plan.color} strokeWidth={2.5} />
                    {feat.label}
                  </div>
                ))}

                <Link to="/signup" style={{
                  display: 'block',
                  textAlign: 'center',
                  background: plan.gradient,
                  color: 'white',
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '15px',
                  marginTop: '24px',
                  textDecoration: 'none',
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  GET STARTED
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
