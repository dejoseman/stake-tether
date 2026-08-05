import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Deposit() {
  const [searchParams] = useSearchParams()
  const initialAmount = searchParams.get('amount') || ''
  
  const [amount, setAmount] = useState(initialAmount)
  const [network, setNetwork] = useState('')
  const [networks, setNetworks] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
        if (res.data?.cryptoNetworks?.length > 0) {
          setNetworks(res.data.cryptoNetworks)
          setNetwork(res.data.cryptoNetworks[0].name)
        }
      } catch (err) {}
    }
    fetchSettings()
  }, [])

  const handleDeposit = async (e) => {
    e.preventDefault()
    
    const depositAddress = networks.find(n => n.name === network)?.address
    
    navigate('/deposit-instructions', { 
      state: { 
        amount, 
        network, 
        address: depositAddress
      } 
    })
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '24px' }}>Deposit Funds</h1>
      
      <div className="card">
        <p style={{ color: '#4a4a68', marginBottom: '24px', lineHeight: 1.6 }}>
          Select the network and amount you wish to deposit. You will receive deposit instructions on the next page.
        </p>

        <form onSubmit={handleDeposit}>
          <div className="form-group">
            <label>Asset</label>
            <div style={{ width: '100%', padding: '12px 16px', fontSize: '15px', borderRadius: '8px', border: '2px solid #e2e8f0', background: '#f8fafc', color: '#1a1a2e', fontWeight: 600 }}>
              Tether USDt
            </div>
          </div>

          <div className="form-group">
            <label>Network</label>
            <select 
              style={{ width: '100%', padding: '12px 16px', fontSize: '15px', borderRadius: '8px', border: '2px solid #e2e8f0', background: 'white' }}
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              {networks.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label>Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8888a0', fontWeight: 600 }}>$</span>
              <input
                type="number"
                placeholder="0.00"
                min="10"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Proceed to Deposit'}
          </button>
        </form>
      </div>
    </div>
  )
}
