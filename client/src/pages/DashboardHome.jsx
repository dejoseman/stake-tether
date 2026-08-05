import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { UserCircle2, DollarSign, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

export default function DashboardHome() {
  const [profile, setProfile] = useState({ username: 'Loading...', balance: 0 })
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setProfile(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setTransactions(res.data)
      } catch (err) {
        console.error(err)
      }
    }

    fetchProfile()
    fetchTransactions()
  }, [])

  const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Welcome Hero */}
      <section className="welcome-hero" style={{ 
        background: '#ffffff', 
        borderRadius: '16px', 
        padding: '32px', 
        marginBottom: '32px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '32px'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '50%', 
          background: '#009393',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <UserCircle2 size={40} strokeWidth={2} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '4px' }}>Welcome back, {profile.username}!</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71' }}></span>
            <span style={{ color: '#4a4a68', fontSize: '14px', fontWeight: 500 }}>Online</span>
          </div>
        </div>
      </section>

      {/* Account Summary Cards */}
      <h2 style={{ fontSize: '20px', color: '#1a1a2e', marginBottom: '16px' }}>Account Summary</h2>
      <div className="grid grid--3" style={{ marginBottom: '32px' }}>
        
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#4a4a68', fontWeight: 600, marginBottom: '8px' }}>Available Balance</p>
            <p style={{ fontSize: '28px', color: '#009393', fontWeight: 800 }}>${profile.balance.toFixed(2)}</p>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 147, 147, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#009393' }}>
            <DollarSign size={24} strokeWidth={2.5} />
          </div>
        </div>

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#4a4a68', fontWeight: 600, marginBottom: '8px' }}>Total Deposits</p>
            <p style={{ fontSize: '24px', color: '#1a1a2e', fontWeight: 700 }}>${totalDeposits.toFixed(2)}</p>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a68' }}>
            <ArrowDownCircle size={24} strokeWidth={2.5} />
          </div>
        </div>

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#4a4a68', fontWeight: 600, marginBottom: '8px' }}>Total Withdrawals</p>
            <p style={{ fontSize: '24px', color: '#1a1a2e', fontWeight: 700 }}>${totalWithdrawals.toFixed(2)}</p>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a68' }}>
            <ArrowUpCircle size={24} strokeWidth={2.5} />
          </div>
        </div>

      </div>

      {/* Recent Transactions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', color: '#1a1a2e' }}>Recent Transactions</h2>
        <Link to="/transactions" style={{ color: '#009393', fontWeight: 600, fontSize: '14px' }}>View All</Link>
      </div>
      
      <div className="card responsive-table-wrap" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f5f7fa', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px 24px', color: '#4a4a68', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '16px 24px', color: '#4a4a68', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '16px 24px', color: '#4a4a68', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px 24px', color: '#4a4a68', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: '#8888a0' }}>
                  No recent transactions found.
                </td>
              </tr>
            ) : (
              transactions.slice(0, 5).map(t => (
                <tr key={t._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 24px', color: '#1a1a2e', fontSize: '14px' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#1a1a2e', fontSize: '14px', textTransform: 'capitalize' }}>
                    {t.type}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      background: t.status === 'completed' ? '#dcfce7' : t.status === 'pending' ? '#fef9c3' : '#fee2e2',
                      color: t.status === 'completed' ? '#15803d' : t.status === 'pending' ? '#854d0e' : '#b91c1c',
                      padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                    }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#1a1a2e', fontSize: '15px', fontWeight: 700, textAlign: 'right' }}>
                    ${t.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}
