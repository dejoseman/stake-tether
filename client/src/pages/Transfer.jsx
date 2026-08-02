import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Transfer() {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTransfer = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/transactions/transfer', 
        { recipient, amount: Number(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(`Successfully transferred ${amount} USDt to ${recipient}`)
      setRecipient('')
      setAmount('')
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-content">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '8px' }}>Transfer Funds</h1>
        <p style={{ color: '#4a4a68', marginBottom: '32px' }}>Send Tether instantly to any other user.</p>

        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleTransfer}>
            <div className="form-group">
              <label>Recipient Username</label>
              <input 
                type="text" 
                placeholder="Enter exact username"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Amount (USDt)</label>
              <input 
                type="number" 
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
              {loading ? 'Processing...' : 'Send Transfer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
