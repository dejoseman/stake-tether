import React, { useState, useEffect } from 'react'
import api from '../api/client'
import { FileSearch } from 'lucide-react'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get('/transactions')
        setTransactions(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchTransactions()
  }, [])

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '24px' }}>Transaction History</h1>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f5f7fa', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px 24px', color: '#4a4a68', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>Reference ID</th>
              <th style={{ padding: '16px 24px', color: '#4a4a68', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '16px 24px', color: '#4a4a68', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '16px 24px', color: '#4a4a68', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px 24px', color: '#4a4a68', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#8888a0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <FileSearch size={48} strokeWidth={1.5} />
                    <p>No transactions found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map(t => (
                <tr key={t._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 24px', color: '#1a1a2e', fontFamily: 'monospace' }}>{t.referenceId}</td>
                  <td style={{ padding: '16px 24px', color: '#4a4a68' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '16px 24px', color: '#1a1a2e', textTransform: 'capitalize' }}>{t.type}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      background: t.status === 'completed' ? '#e8f8f5' : t.status === 'pending' ? '#fef9e7' : '#fdedec',
                      color: t.status === 'completed' ? '#2ecc71' : t.status === 'pending' ? '#f1c40f' : '#e74c3c',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#1a1a2e', fontWeight: 700, textAlign: 'right' }}>
                    {t.type === 'deposit' ? '+' : '-'}${t.amount.toFixed(2)}
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
