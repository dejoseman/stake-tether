import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { TrendingUp, CheckCircle } from 'lucide-react'
import CountdownTimer from '../components/CountdownTimer'

export default function MyStakes() {
  const [stakes, setStakes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStakes = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/stakes/my-stakes', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setStakes(res.data)
      } catch (err) {
        toast.error('Failed to load stakes')
      } finally {
        setLoading(false)
      }
    }
    fetchStakes()
  }, [])

  if (loading) return <div style={{ padding: '48px', textAlign: 'center' }}>Loading your stakes...</div>

  const activeStakes = stakes.filter(s => s.status === 'pending' || s.status === 'active')
  const completedStakes = stakes.filter(s => s.status === 'completed')

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <TrendingUp size={28} color="#009393" />
        <h1 style={{ fontSize: '28px', color: '#1a1a2e' }}>My Stakes</h1>
      </div>

      <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#1a1a2e' }}>Active Stakes ({activeStakes.length})</h2>
      {activeStakes.length === 0 ? (
        <div style={{ background: 'white', padding: '32px', borderRadius: '16px', textAlign: 'center', color: '#64748b', marginBottom: '48px' }}>
          You have no active stakes right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px', marginBottom: '48px' }}>
          {activeStakes.map(stake => {
            const expectedReturn = stake.amount + (stake.amount * stake.returnPercent / 100)
            return (
              <div key={stake._id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between', alignItems: 'center' }}>
                
                <div>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Plan</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>{stake.planName}</div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Amount Staked</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>${stake.amount.toFixed(2)}</div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Expected Payout</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#009393' }}>${expectedReturn.toFixed(2)}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Status</div>
                    {stake.status === 'pending' ? (
                      <span style={{ color: '#d97706', fontSize: '14px', background: '#fef3c7', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, display: 'inline-block' }}>Pending Approval</span>
                    ) : (
                      <CountdownTimer maturityDate={stake.completesAt} />
                    )}
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}

      <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#1a1a2e' }}>Staking History</h2>
      {completedStakes.length === 0 ? (
        <div style={{ background: 'white', padding: '32px', borderRadius: '16px', textAlign: 'center', color: '#64748b' }}>
          No completed stakes yet.
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Plan</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Principal</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Payout</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {completedStakes.map(stake => (
                <tr key={stake._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', color: '#64748b', fontSize: '14px' }}>{new Date(stake.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{stake.planName}</td>
                  <td style={{ padding: '16px' }}>${stake.amount.toFixed(2)}</td>
                  <td style={{ padding: '16px', fontWeight: 700, color: '#15803d' }}>
                    ${(stake.amount + (stake.accruedRewards || 0)).toFixed(2)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> Complete
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
